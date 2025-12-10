import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AssetDao } from '../core/dao/asset-dao';
import { RpcService } from '../core/third-party-api/rpc/rpc.service';
import { RpcHandlerService } from '../core/third-party-api/rpc/rpc-handler.service';
import {
  EventPollerNftTransferService,
  EventProject,
} from '../microservice/event-poller-nft-transfer/event-poller-nft-transfer.service';
import { EventPollerDao } from '../core/dao/event-poller.dao';
import { RpcQueryChain } from '../common/libs/libs.service';
import { RpcEnd } from '../core/third-party-api/rpc/interfaces';
import { ContractType } from '../core/third-party-api/gateway/constants';
import { Logger } from '@nestjs/common';
import { ChainId } from '../common/utils/types';
import * as Promise from 'bluebird';
import {
  ERC_721_ABI,
  ERC_1155_ABI,
} from '../microservice/event-poller-nft-transfer/constants';
import { BigNumber } from 'bignumber.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('SmartBackfill');

  // Services
  const assetDao = app.get(AssetDao);
  const rpcService = app.get(RpcService);
  const rpcHandlerService = app.get(RpcHandlerService);
  const eventPollerService = app.get(EventPollerNftTransferService);
  const eventPollerDao = app.get(EventPollerDao);

  // Args
  const contractAddress = process.argv[2];
  const arg3 = process.argv[3];
  const arg4 = process.argv[4];

  const chainId = '1868' as ChainId; // Soneium
  const rpcChain = RpcQueryChain.SONEIUM;

  if (!contractAddress) {
    printUsage(logger);
    await app.close();
    process.exit(1);
  }

  logger.log(`Analyzing Contract ${contractAddress} on Chain ${chainId}...`);

  try {
    // 1. Detect Contract Type
    const contractInfos = await rpcService.getContractInfo(rpcChain, [
      contractAddress,
    ]);
    const contractType = contractInfos[0]?.contractType;

    if (!contractType || contractType === ContractType.UNKNOWN) {
      logger.error(
        `Could not detect contract type for ${contractAddress}. Please check address.`,
      );
      await app.close();
      process.exit(1);
    }

    logger.log(`Detected Contract Type: ${contractType}`);

    // 2. Route Logic
    if (contractType === ContractType.ERC1155) {
      // ERC1155 -> FORCE History Mode
      logger.log(`ERC1155 detected. Forcing History Log Mode.`);
      const fromBlock = arg3 ? parseInt(arg3) : 0; // Default to 0 (Full Scan) if not provided, or safe default?
      // Actually 0 might be too slow for mainnet. But better than broken.
      // Let's suggest user to provide it if missing, or default to "Latest - 100k"?
      // For backfill, usually we want FULL.
      if (!arg3) {
        logger.warn(
          `No StartBlock provided. Starting from Block 0 (This might take a while).`,
        );
      }
      await runHistoryBackfill(
        contractAddress,
        fromBlock || 0,
        +chainId,
        rpcHandlerService,
        eventPollerService,
        eventPollerDao,
        logger,
      );
    } else if (contractType === ContractType.ERC721) {
      // ERC721 -> Check Args
      if (arg3 && arg4) {
        // Range Provided -> Snapshot Mode (Fastest)
        const startId = parseInt(arg3);
        const endId = parseInt(arg4);
        logger.log(
          `ERC721 with Range [${startId}-${endId}] detected. Using Snapshot Mode (Fast).`,
        );
        await runSnapshotBackfill(
          contractAddress,
          startId,
          endId,
          chainId,
          rpcChain,
          rpcService,
          assetDao,
          logger,
        );
      } else {
        // No Range -> Try Enumerable
        logger.log(
          `ERC721 without Range. Checking ERC721Enumerable support...`,
        );
        const totalSupply = await checkEnumerable(contractAddress, rpcService);

        if (totalSupply !== null) {
          // Enumerable Supported -> Use Enumerable Mode
          logger.log(
            `ERC721Enumerable Supported! Total Supply: ${totalSupply}. Using Enumerable Mode.`,
          );
          await runEnumerableBackfill(
            contractAddress,
            totalSupply,
            chainId,
            rpcChain,
            rpcService,
            assetDao,
            logger,
          );
        } else {
          // Enumerable NOT Supported -> History Mode (Discovery)
          const fromBlock = arg3 ? parseInt(arg3) : 0;
          logger.log(
            `ERC721Enumerable NOT supported. Falling back to History Log Mode (Discovery).`,
          );
          if (!arg3) {
            logger.warn(`No StartBlock provided. Starting from Block 0.`);
          }

          await runHistoryBackfill(
            contractAddress,
            fromBlock || 0,
            chainId as unknown as number,
            rpcHandlerService,
            eventPollerService,
            eventPollerDao,
            logger,
          );
        }
      }
    }
  } catch (e) {
    logger.error(`Critical Error: ${e.message}`);
  }

  await app.close();
  process.exit(0);
}

function printUsage(logger: Logger) {
  logger.error('Usage:');
  logger.error('  Snapshot Mode (ERC721 only, Fast, for known range):');
  logger.error(
    '    npx ts-node src/scripts/backfill_smart.ts <Contract> <StartID> <EndID>',
  );
  logger.error('  Smart Mode (Detects Enumerable OR History Scan):');
  logger.error(
    '    npx ts-node src/scripts/backfill_smart.ts <Contract> [StartBlock]',
  );
}

// ==========================================
// Strategy 1: Snapshot (Multicall ownerOf)
// ==========================================
async function runSnapshotBackfill(
  contractAddress: string,
  startId: number,
  endId: number,
  chainId: ChainId,
  rpcChain: RpcQueryChain,
  rpcService: RpcService,
  assetDao: AssetDao,
  logger: Logger,
) {
  const ids = Array.from(
    { length: endId - startId + 1 },
    (_, i) => i + startId,
  );
  await processIdsInBatches(
    ids,
    contractAddress,
    chainId,
    rpcChain,
    rpcService,
    assetDao,
    logger,
    'Snapshot',
  );
}

// ==========================================
// Strategy 2: History (Log Scanning)
// ==========================================
async function runHistoryBackfill(
  contractAddress: string,
  fromBlock: number,
  chainId: number,
  rpcHandlerService: RpcHandlerService,
  eventPollerService: EventPollerNftTransferService,
  eventPollerDao: EventPollerDao,
  logger: Logger,
) {
  // Mock Project
  const project: EventProject = {
    name: 'NFT_Transfer_Soneium_Backfill', // Temp name
    chainId: chainId,
    abi: [ERC_721_ABI, ERC_1155_ABI],
    pollingBatch: 1000,
  };

  const provider = rpcHandlerService.createStaticJsonRpcProviderV6(
    chainId,
    RpcEnd.default,
  );
  const latestBlock = await eventPollerDao.getLatestBlockNumber(chainId);

  logger.log(
    `History: Latest Block is ${latestBlock}. Scanning from ${fromBlock}...`,
  );

  const BATCH_SIZE = 2000;
  let currentBlock = fromBlock;
  let totalEvents = 0;
  const topics = eventPollerService.eventFilter.topics;

  while (currentBlock <= latestBlock) {
    const toBlock = Math.min(currentBlock + BATCH_SIZE, latestBlock);
    // logger.log(`Scanning ${currentBlock}-${toBlock}`);

    try {
      const events = await provider.getLogs({
        address: contractAddress,
        fromBlock: currentBlock,
        toBlock: toBlock,
        topics: topics,
      });

      if (events.length > 0) {
        logger.log(
          `Found ${events.length} events in ${currentBlock}-${toBlock}`,
        );
        await Promise.map(
          events,
          async (event) => {
            if (!event.address) event.address = contractAddress;
            await eventPollerService.handleEvent(project, event);
          },
          { concurrency: 10 },
        );
        totalEvents += events.length;
      }
    } catch (e) {
      logger.error(`History Scan Error at ${currentBlock}: ${e.message}`);
      // throw e;
    }

    currentBlock = toBlock + 1;
  }

  logger.log(`History Backfill Complete. Processed ${totalEvents} events.`);
}

// ==========================================
// Strategy 3: Enumerable (tokenByIndex)
// ==========================================
async function checkEnumerable(
  contractAddress: string,
  rpcService: RpcService,
): Promise<number | null> {
  // Check totalSupply()
  try {
    const chain = RpcQueryChain.SONEIUM;
    const callData = [
      {
        method: 'totalSupply' as any,
        param: [],
      },
    ];
    const res = await rpcService.get(chain, [
      {
        contractAddress: contractAddress,
        callData: callData,
        context: {},
      },
    ]);

    if (res[0]?.value[0]?.success) {
      return parseInt(res[0].value[0].returnValues[0].hex, 16);
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function runEnumerableBackfill(
  contractAddress: string,
  totalSupply: number,
  chainId: ChainId,
  rpcChain: RpcQueryChain,
  rpcService: RpcService,
  assetDao: AssetDao,
  logger: Logger,
) {
  logger.log(`Enumerable: Fetching ${totalSupply} Token IDs...`);

  // 1. Fetch ALL Token IDs using tokenByIndex
  // We can batch this too!
  const indices = Array.from({ length: totalSupply }, (_, i) => i);
  const BATCH_SIZE = 100;
  const chunkedIndices = chunkArray(indices, BATCH_SIZE);

  const validTokenIds: number[] = [];

  await Promise.map(
    chunkedIndices,
    async (batchIndices) => {
      try {
        const callData = batchIndices.map((idx) => ({
          method: 'tokenByIndex' as any,
          param: [idx],
        }));

        const res = await rpcService.get(rpcChain, [
          {
            contractAddress: contractAddress,
            callData: callData,
            context: {},
          },
        ]);

        const batchResults = res[0]?.value;
        if (batchResults) {
          batchResults.forEach((item) => {
            if (item.success) {
              validTokenIds.push(parseInt(item.returnValues[0].hex, 16));
            }
          });
        }
      } catch (e) {
        logger.error(`Error fetching indices ${batchIndices[0]}...`);
      }
    },
    { concurrency: 5 },
  );

  logger.log(
    `Enumerable: Found ${validTokenIds.length} Token IDs. Fetching Owners...`,
  );

  // 2. Fetch Owners for valid Token IDs
  await processIdsInBatches(
    validTokenIds,
    contractAddress,
    chainId,
    rpcChain,
    rpcService,
    assetDao,
    logger,
    'Enumerable',
  );
}

// Shared helper
async function processIdsInBatches(
  ids: number[],
  contractAddress: string,
  chainId: ChainId,
  rpcChain: RpcQueryChain,
  rpcService: RpcService,
  assetDao: AssetDao,
  logger: Logger,
  tag: string,
) {
  const BATCH_SIZE = 50;
  const chunkedIds = chunkArray(ids, BATCH_SIZE);
  let successCount = 0;
  let failCount = 0;

  await Promise.map(
    chunkedIds,
    async (batchIds) => {
      try {
        const callData = batchIds.map((id) =>
          rpcService.ownerOf(id.toString()),
        );
        const res = await rpcService.get(rpcChain, [
          {
            contractAddress: contractAddress,
            callData: callData,
            context: {},
          },
        ]);

        const batchResults = res[0]?.value;
        if (!batchResults) {
          failCount += batchIds.length;
          return;
        }

        await Promise.map(
          batchResults,
          async (item, index) => {
            const tokenId = batchIds[index].toString();
            if (item.success) {
              const ownerAddress = item.returnValues[0];
              await assetDao.transferAssetOwnershipOnchain({
                chainId: chainId,
                contractAddress: contractAddress,
                tokenId: tokenId,
                fromAddress: '0x0000000000000000000000000000000000000000',
                toAddress: ownerAddress,
              });
              successCount++;
            } else {
              failCount++;
            }
          },
          { concurrency: 10 },
        );

        logger.log(`${tag}: Processed batch ${successCount}/${ids.length}`);
      } catch (e) {
        failCount += batchIds.length;
        logger.error(`${tag}: Batch failed ${e.message}`);
      }
    },
    { concurrency: 2 },
  );

  logger.log(`${tag} Complete. Success: ${successCount}, Failed: ${failCount}`);
}

function chunkArray(myArray, chunk_size) {
  var results = [];
  while (myArray.length) {
    results.push(myArray.splice(0, chunk_size));
  }
  return results;
}

bootstrap();
