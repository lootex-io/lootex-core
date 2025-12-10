import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Account, Wallet, WalletHistory } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { ethers } from 'ethers';
import {
  APPROVAL_FOR_ALL_TOPIC0,
  APPROVAL_TOPIC0,
  CHAINID_GP_ADDRESS,
  ENTRYPOINT_ABI,
  ERC1155_ABI,
  ERC1155_TRANSFER_SINGLE_TOPIC0,
  FUSIONX_V3_SWAP_TOPIC0,
  GP_TOP_UP_TOPIC0,
  SEAPORT_ORDER_CANCEL_TOPIC0,
  SEAPORT_ORDER_FULFILLED_TOPIC0,
  TRANSFER_TOPIC0,
  WRAPPED_TOKEN_DEPOSIT_TOPIC0,
  WRAPPED_TOKEN_WITHDRAW_TOPIC0,
} from './constants';
import {
  RecodeWalletHistory,
  WalletHistoryEvent,
  WalletHistoryTag,
} from './wallet.interface';
import { AuthSupportedWalletProviderEnum } from '../auth/auth.interface';
import { CurrencyService as ThirdPartyCurrencyService } from '@/core/third-party-api/currency/currency.service';
import { CurrencyService } from '../currency/currency.service';
import { ChainId } from '@/common/utils/types';
import { SEAPORT_ABI } from '@/microservice/event-poller/constants';
import { CollectionService } from '../collection/collection.service';
import { ContractType } from '@/common/utils';
import { GP_ABI } from '@/microservice/event-poller-gp/constants';
import BigNumber from 'bignumber.js';
import { ConfigurationService } from '@/configuration';
import {
  FUSIONX_V3_SWAP_ABI,
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_SWAP_TOPIC0,
} from '../order/constants';
import { ChainMap } from '@/common/libs/libs.service';
import { ChainUtil } from '@/common/utils/chain.util';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import * as promise from 'bluebird';
import { SdkEnvService } from '@/core/sdk/service/sdk-env.service';
import { SdkEnv } from '@/core/sdk/constants/env-constants';

@Injectable()
export class WalletService {
  protected readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,

    @InjectModel(Account)
    private accountRepository: typeof Account,

    @InjectModel(WalletHistory)
    private walletHistoryRepository: typeof WalletHistory,

    private readonly configService: ConfigurationService,
    private collectionService: CollectionService,
    private gatewayService: GatewayService,
    private currencyService: CurrencyService,
    private thirdPartyCurrencyService: ThirdPartyCurrencyService,
    private rpcHandlerService: RpcHandlerService,
    private sdkEnvService: SdkEnvService,
  ) {}

  async getWalletsByUsername(username: string): Promise<Wallet[]> {
    try {
      const account = await this.accountRepository.findOne({
        where: {
          username,
        },
      });

      if (!account) {
        throw new Error('account not found');
      }

      const wallets = await this.walletRepository.findAll({
        where: {
          accountId: account.id,
        },
      });

      return wallets;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  async getWalletHistory(
    walletAddress: string,
    page: number,
    limit: number,
    option?: {
      chainId: ChainId;
      currencyAddress?: string;
    },
  ): Promise<any> {
    try {
      const orderWhereCondition = {};
      orderWhereCondition['walletAddress'] = walletAddress;
      orderWhereCondition['isMainEvent'] = true;
      option.chainId ? (orderWhereCondition['chainId'] = option.chainId) : null;
      option.currencyAddress
        ? (orderWhereCondition['currencyAddress'] =
            option.currencyAddress?.toLowerCase())
        : null;

      const walletHistories =
        await this.walletHistoryRepository.findAndCountAll({
          raw: true,
          where: orderWhereCondition,
          limit: limit,
          offset: (page - 1) * limit,
          order: [['blockTime', 'DESC']],
        });

      const returnWalletHistories = [];
      for (const walletHistory of walletHistories.rows) {
        let collectionInfo = {
          id: null,
          name: null,
          slug: null,
          logoImageUrl: null,
        };
        let currencyInfo = {
          name: null,
          symbol: null,
          isNative: null,
          isWrapped: null,
        };

        if (walletHistory.nftAddress) {
          const collection =
            await this.collectionService.getCollectionSimpleByAddressAndChainId(
              walletHistory.nftAddress,
              walletHistory.chainId.toString() as ChainId,
            );
          collectionInfo = {
            name: collection.name,
            slug: collection.slug,
            id: collection.id,
            logoImageUrl: collection.logoImageUrl,
          };
        }
        if (walletHistory.currencyAddress) {
          const currency =
            await this.currencyService.getCurrencyByAddressAndChainId(
              walletHistory.currencyAddress,
              walletHistory.chainId.toString() as ChainId,
            );
          if (currency) {
            currencyInfo = {
              name: currency.name,
              symbol: currency.symbol,
              isNative: currency.isNative,
              isWrapped: currency.isWrapped,
            };
          }
        }

        returnWalletHistories.push({
          ...walletHistory,
          collectionInfo,
          currencyInfo,
        });
      }

      return { rows: returnWalletHistories, count: walletHistories.count };
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  async recodeWalletHistoryByTxHash(
    chainId: ChainId,
    txHash: string,
    option?: {
      tag?: WalletHistoryTag;
      ip?: string;
      area?: string;
      wallet?: Wallet;
    },
  ): Promise<any> {
    try {
      let transaction = await this.gatewayService.getTransaction(
        +chainId,
        txHash,
      );
      const txIsPending = !transaction?.blockHash;

      // 检查交易的 pending 状态
      if (txIsPending) {
        const saAddress = this.getSaSender(transaction);
        await this.createPendingWalletHistory(
          saAddress ?? transaction.from?.toLowerCase(),
          chainId,
          txHash,
        );

        const tx = await this.gatewayService.waitForTransaction(
          +chainId,
          txHash,
          RpcEnd.default,
          this.gatewayService.getConfirmsToWaitBlock(+chainId, 4),
        );
        if (!tx) {
          this.logger.error(
            `transaction not found or failed: ${chainId}:${txHash}`,
          );
          throw new Error(
            `transaction not found or failed: ${chainId}:${txHash}`,
          );
        }

        transaction = await this.gatewayService.getTransaction(
          +chainId,
          txHash,
        );
      }

      if (!transaction) {
        this.logger.error(
          `transaction not found or failed: ${chainId}:${txHash}`,
        );
        throw new Error(
          `transaction not found or failed: ${chainId}:${txHash}`,
        );
      }

      // this.logger.debug('==========transaction==========');
      // this.logger.debug(transaction);
      // this.logger.debug('==========transaction==========');
      let transactionReceipt = await this.gatewayService.getTransactionReceipt(
        +chainId,
        txHash,
      );

      // this.logger.debug('==========transactionReceipt==========');
      // this.logger.debug(transactionReceipt);
      // this.logger.debug('==========transactionReceipt==========');

      if (!transactionReceipt) {
        this.logger.error(`transactionReceipt not found: ${chainId}:${txHash}`);
        throw new Error(`transactionReceipt not found: ${chainId}:${txHash}`);
      }

      // 被三明治攻擊夾走真正的交易，需要遍歷所有的交易
      if (
        transactionReceipt.status !== 1 && // 交易失敗
        transactionReceipt.logs[0].topics[0] ==
          '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63' && // 交易 data 開頭為 0x1fad948c 代表是發起 bundler 的交易
        transactionReceipt.logs.length == 1 // 交易只有一筆 log
      ) {
        try {
          const txData = transaction.data;
          const block = transaction.blockNumber;
          const blockInfo = await this.gatewayService.getBlock(+chainId, block);
          const txs = blockInfo.transactions;
          // concurrency 5
          const blockTransactions: ethers.providers.TransactionResponse[] =
            await promise.map(
              txs,
              (tx: string) => this.gatewayService.getTransaction(+chainId, tx),
              {
                concurrency: 5,
              },
            );
          const filteredTxs = blockTransactions.filter(
            (tx) =>
              // 交易 data 開頭為 0x1fad948c 代表是發起 bundler 的交易
              tx.data.startsWith('0x1fad948c') &&
              // 交易 data 後半段相同，因為前面是 bundler 的地址
              tx.data.substring(139) === txData.substring(139),
          );
          const filteredTxReceipts: ethers.providers.TransactionReceipt[] =
            await promise.map(
              filteredTxs,
              (tx: ethers.providers.TransactionResponse) =>
                this.gatewayService.getTransactionReceipt(+chainId, tx.hash),
              {
                concurrency: 5,
              },
            );
          // 紀錄成功的交易
          transactionReceipt = filteredTxReceipts.find(
            (txReceipt) => txReceipt.status == 1,
          );
          transaction = filteredTxs.find(
            (tx) => transactionReceipt.transactionHash == tx.hash,
          );
        } catch (err) {
          this.logger.error(err);
          throw new HttpException(err.message, 400);
        }
      }

      const recordWalletHistories: RecodeWalletHistory[] = [];
      // 當 tx 被 confirm 後，才會進行以下的處理
      const blockInfo = await this.gatewayService.getBlock(
        +chainId,
        transaction.blockNumber,
      );
      const block = transaction.blockNumber;
      const blockTime = new Date(blockInfo.timestamp * 1000).toISOString();
      const nativeUsdSymbol =
        this.thirdPartyCurrencyService.getNativeCurrencySymbolByChainId(
          chainId,
        );
      const nativeUsdPrice =
        (
          await this.thirdPartyCurrencyService.getSymbolPrice(
            nativeUsdSymbol + 'USD',
          )
        )?.price ?? '0';
      const fee = ethers.utils.formatEther(
        transaction.gasPrice.mul(transaction.gasLimit).toString(),
      );
      let isMainEvent = false;
      const ip = option?.ip ?? '';
      const area = option?.area ?? '';

      const saAddress = this.getSaSender(transaction);
      const isSa = !!saAddress;
      const isPaymaster = this.hasPaymaster(transactionReceipt);
      // TODO: 先跑一次抓到所有的 log，再依照 log 來判斷是否有需要紀錄的 log
      // console.log(this.checkTxIncludeLogs(chainId, transactionReceipt));
      let hasSeaportOrderFulfilled = false;
      let hasNativeTokenTransfer = false;
      let hasErc20Transfer = false;
      let hasErc721Transfer = false;
      let hasErc1155Transfer = false;
      let hasErc404Transfer = false;
      const hasApprovalForAll = false;
      let hasApproval = false;
      let hasERC20Approval = false;
      let hasERC721Approval = false;
      let hasMint = false;
      let hasSwap = false;
      let hasBatchTransfer = false;
      const walletAddress = saAddress ?? transaction.from?.toLowerCase();

      if (transactionReceipt.status !== 1) {
        recordWalletHistories.push({
          walletAddress: transaction.from?.toLowerCase(),
          chainId: +chainId,
          contractAddress: transaction.to,
          event: WalletHistoryEvent.FAILED,
          isMainEvent: true,
          blockTime: new Date().toISOString(),
          block: transaction.blockNumber,
          txHash: transaction.hash,
          logIndex: -1,
          fee: ethers.utils.formatEther(
            transaction.gasPrice.mul(transaction.gasLimit).toString(),
          ),
          isSa,
          ip: option?.ip ?? '',
          area: option?.area ?? '',
        });
        await this.recodeWalletHistory(recordWalletHistories);
        return {
          success: true,
          message: 'created transaction failed log',
        };
      }

      // ========================================
      //           native token transfer
      // ========================================

      const handleNativeTokenTransfer = await this.handleNativeTokenTransfer(
        transaction,
        transactionReceipt,
      );

      if (
        handleNativeTokenTransfer.success &&
        handleNativeTokenTransfer.data.hasNativeTokenTransfer
      ) {
        hasNativeTokenTransfer = true;
        recordWalletHistories.push({
          walletAddress: saAddress ?? transaction.from?.toLowerCase(),
          chainId: +chainId,
          contractAddress: ethers.constants.AddressZero,
          event: WalletHistoryEvent.NATIVE_TOKEN_TRANSFER,
          isMainEvent: handleNativeTokenTransfer.data.isOnlyNativeTokenTransfer,
          symbol: nativeUsdSymbol,
          outAmount: handleNativeTokenTransfer.data.value,
          outAmountUsd: (
            +handleNativeTokenTransfer.data.value * +nativeUsdPrice
          ).toString(),
          toAddress: handleNativeTokenTransfer.data.toAddress,
          currencyAddress: ethers.constants.AddressZero,
          blockTime,
          block,
          txHash: transaction.hash,
          logIndex: handleNativeTokenTransfer.data.isOnlyNativeTokenTransfer
            ? -1
            : null,
          fee,
          isSa,
          isPaymaster,
          nativeUsdPrice,
          ip,
          area,
        });

        if (isMainEvent) {
          return await this.recodeWalletHistory(recordWalletHistories);
        }
      }

      // ========================================
      //           top-up GP
      // ========================================
      const handleGpTopUp = await this.handleGpTopUp(
        chainId,
        transactionReceipt,
      );
      if (handleGpTopUp.data?.length > 0) {
        for (const gpTopUp of handleGpTopUp.data) {
          recordWalletHistories.push({
            walletAddress: gpTopUp.owner,
            chainId: +chainId,
            contractAddress: gpTopUp.contractAddress,
            event: WalletHistoryEvent.GP_TOP_UP,
            isMainEvent: true,
            symbol: 'LOOT',
            inAmount: gpTopUp.lootAmount,
            outAmount: gpTopUp.gpAmount,
            currencyAddress: gpTopUp.lootTokenAddress,
            toAddress: gpTopUp.to,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: -1,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }
      }

      // ========================================
      //           token swap
      // ========================================
      const handleSwapLogs = await this.handleSwap(
        chainId,
        transaction,
        transactionReceipt,
      );
      if (handleSwapLogs.data?.length > 0) {
        for (const log of handleSwapLogs.data) {
          const outCurrency =
            await this.currencyService.getCurrencyByAddressAndChainId(
              log.outAddress,
              chainId.toString() as ChainId,
            );
          const outUsdPrice =
            (await this.currencyService.getPriceByCurrency(outCurrency))
              ?.price ?? '0';

          const inCurrency =
            await this.currencyService.getCurrencyByAddressAndChainId(
              log.inAddress,
              chainId.toString() as ChainId,
            );
          const inUsdPrice =
            (await this.currencyService.getPriceByCurrency(inCurrency))
              ?.price ?? '0';

          recordWalletHistories.push({
            // 有些情形 walletAddress 會是 route 的地址，所以 main event 要指定成 walletAddress
            walletAddress: log.isMainSwap ? walletAddress : log.walletAddress,
            chainId: +chainId,
            contractAddress: log.contractAddress,
            event: WalletHistoryEvent.SWAP,
            isMainEvent: log.isMainSwap,
            symbol: `${inCurrency.symbol}/${outCurrency.symbol}`, // in = pool拿到的 = user out
            inAmount: log.inAmount,
            inAmountUsd: (+log.inAmount * +inUsdPrice).toString(),
            outAmount: log.outAmount,
            outAmountUsd: (+log.outAmount * +outUsdPrice).toString(),
            tag: log.tag,
            currencyAddress:
              log.tag == WalletHistoryTag.WRAPPED
                ? log.inAddress
                : handleNativeTokenTransfer.data.hasNativeTokenTransfer
                  ? ethers.constants.AddressZero
                  : log.inAddress,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: log.logIndex,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }

        hasSwap = true;
      }

      // ========================================
      //           approval
      // ========================================

      const approvalForAllLogs = this.handleApprovalForAll(transactionReceipt);
      if (approvalForAllLogs?.data?.length > 0) {
        for (const approvalForAllLog of approvalForAllLogs.data) {
          recordWalletHistories.push({
            walletAddress: approvalForAllLog.ownerAddress,
            chainId: +chainId,
            contractAddress: approvalForAllLog.contractAddress,
            event: WalletHistoryEvent.APPROVAL_FOR_ALL,
            isMainEvent,
            bool: approvalForAllLog.approved,
            toAddress: approvalForAllLog.operatorAddress,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: approvalForAllLog.logIndex,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }

        // return await this.recodeWalletHistory(recordWalletHistories);
      }

      const approvalLogs = this.handleApproval(transactionReceipt);
      if (approvalLogs?.data?.length > 0) {
        for (const approvalLog of approvalLogs.data) {
          if (
            approvalLog.contractType == ContractType.ERC721 &&
            approvalLog.tokenId
          ) {
            recordWalletHistories.push({
              walletAddress: approvalLog.ownerAddress,
              chainId: +chainId,
              contractAddress: approvalLog.contractAddress,
              event: WalletHistoryEvent.APPROVAL,
              isMainEvent,
              outAmount: approvalLog.amount,
              toAddress: approvalLog.spenderAddress,
              tokenId: approvalLog.tokenId,
              nftAddress: approvalLog.contractAddress,
              blockTime,
              block,
              txHash: transaction.hash,
              logIndex: approvalLog.logIndex,
              fee,
              isSa,
              isPaymaster,
              nativeUsdPrice,
              ip,
              area,
            });
            hasApproval = true;
            hasERC721Approval = true;
          } else if (
            approvalLog.contractType == ContractType.ERC20 &&
            approvalLog.amount
          ) {
            recordWalletHistories.push({
              walletAddress: approvalLog.ownerAddress,
              chainId: +chainId,
              contractAddress: approvalLog.contractAddress,
              event: WalletHistoryEvent.APPROVAL,
              isMainEvent,
              outAmount: approvalLog.amount,
              toAddress: approvalLog.spenderAddress,
              currencyAddress: approvalLog.contractAddress,
              blockTime,
              block,
              txHash: transaction.hash,
              logIndex: approvalLog.logIndex,
              fee,
              isSa,
              isPaymaster,
              nativeUsdPrice,
              ip,
              area,
            });
            hasApproval = true;
            hasERC20Approval = true;
          }
        }
      }

      // ========================================
      //           seaport
      // ========================================

      const seaportCancelParsedLogs =
        this.handleSeaportCancel(transactionReceipt);
      if (seaportCancelParsedLogs?.data?.length > 0) {
        for (const seaportCancelParsedLog of seaportCancelParsedLogs.data) {
          recordWalletHistories.push({
            walletAddress: saAddress ?? seaportCancelParsedLog.offerer,
            chainId: +chainId,
            contractAddress: seaportCancelParsedLog.contractAddress,
            event: WalletHistoryEvent.SEAPORT_CANCEL,
            isMainEvent,
            orderHash: seaportCancelParsedLog.orderHash,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: seaportCancelParsedLog.logIndex,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }
      }

      const seaportFulfilledParsedLogs = this.handleSeaportFulfilled(
        transaction,
        transactionReceipt,
        chainId,
      );
      if (seaportFulfilledParsedLogs?.data?.length > 0) {
        hasSeaportOrderFulfilled = true;
        for (const seaportFulfilledParsedLog of seaportFulfilledParsedLogs.data) {
          recordWalletHistories.push({
            walletAddress: saAddress ?? seaportFulfilledParsedLog.offerer,
            chainId: +chainId,
            contractAddress: seaportFulfilledParsedLog.contractAddress,
            event: WalletHistoryEvent.SEAPORT_ORDERFULFILLED,
            isMainEvent:
              seaportFulfilledParsedLogs.data.length > 1 ? false : true,
            tag: option.tag ?? seaportFulfilledParsedLog.tag,
            tokenId: seaportFulfilledParsedLog.tokenId,
            outAmount: seaportFulfilledParsedLog.outAmount,
            outAmountUsd:
              seaportFulfilledParsedLog.tag !== WalletHistoryTag.ACCEPT_OFFER
                ? new BigNumber(
                    +seaportFulfilledParsedLog.outAmount * +nativeUsdPrice,
                  ).toString(10)
                : '0',
            inAmount: seaportFulfilledParsedLog.inAmount,
            inAmountUsd:
              seaportFulfilledParsedLog.tag === WalletHistoryTag.ACCEPT_OFFER
                ? new BigNumber(
                    +seaportFulfilledParsedLog.inAmount * +nativeUsdPrice,
                  ).toString(10)
                : '0',
            toAddress: seaportFulfilledParsedLog.consider1ToAddress,
            nftAddress: seaportFulfilledParsedLog.nftAddress,
            currencyAddress: seaportFulfilledParsedLog.currencyAddress,
            orderHash: seaportFulfilledParsedLog.orderHash,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: seaportFulfilledParsedLog.logIndex,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }

        if (seaportFulfilledParsedLogs.data.length > 1) {
          // 批次交易只會有賣單成交
          const outAmount = seaportFulfilledParsedLogs.data
            .reduce((acc, cur) => {
              return acc.plus(cur.outAmount);
            }, new BigNumber(0))
            .toString();
          const outAmountUsd = (+outAmount * +nativeUsdPrice).toString();
          const inAmount = seaportFulfilledParsedLogs.data
            .reduce((acc, cur) => {
              return acc.plus(cur.inAmount);
            }, new BigNumber(0))
            .toString();

          recordWalletHistories.push({
            walletAddress:
              saAddress ?? seaportFulfilledParsedLogs.data[0].offerer,
            chainId: +chainId,
            contractAddress: seaportFulfilledParsedLogs.data[0].contractAddress,
            event: WalletHistoryEvent.SEAPORT_ORDERFULFILLED,
            isMainEvent: true,
            tag: option.tag ?? WalletHistoryTag.CART,
            tokenId: seaportFulfilledParsedLogs.data[0].tokenId,
            outAmount,
            outAmountUsd,
            inAmount,
            inAmountUsd: '0',
            toAddress: seaportFulfilledParsedLogs.data[0].consider1ToAddress,
            nftAddress: seaportFulfilledParsedLogs.data[0].nftAddress,
            currencyAddress: seaportFulfilledParsedLogs.data[0].currencyAddress,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: -1,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }

        isMainEvent = false;
      }

      // ========================================
      //           token transfer
      // ========================================

      const erc20TransferParsedLogs =
        this.handleErc20TokenTransfer(transactionReceipt);
      if (erc20TransferParsedLogs?.data?.length > 0) {
        for (const erc20TransferParsedLog of erc20TransferParsedLogs.data) {
          const currencyInfo =
            await this.currencyService.getCurrencyByAddressAndChainId(
              erc20TransferParsedLogs.data[0].contractAddress,
              chainId.toString() as ChainId,
            );
          let outAmountUsd = '0';
          if (currencyInfo) {
            if (currencyInfo.isNative || currencyInfo.isWrapped) {
              outAmountUsd = new BigNumber(
                +erc20TransferParsedLog.amount * +nativeUsdPrice,
              ).toString(10);
            } else {
              const currencyUsdPrice =
                (
                  await this.thirdPartyCurrencyService.getSymbolPrice(
                    currencyInfo.symbol + 'USD',
                  )
                )?.price ?? '0';
              outAmountUsd = new BigNumber(
                +erc20TransferParsedLog.amount * +currencyUsdPrice,
              ).toString(10);
            }
          }

          recordWalletHistories.push({
            walletAddress: erc20TransferParsedLog.fromAddress,
            chainId: +chainId,
            contractAddress: erc20TransferParsedLog.contractAddress,
            event: WalletHistoryEvent.ERC20_TOKEN_TRANSFER,
            isMainEvent,
            outAmount: erc20TransferParsedLog.amount,
            outAmountUsd,
            toAddress: erc20TransferParsedLog.toAddress,
            currencyAddress: erc20TransferParsedLog.contractAddress,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: erc20TransferParsedLog.logIndex,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }
        hasErc20Transfer = true;
      }

      const erc721TransferParsedLogs =
        this.handleErc721TokenTransfer(transactionReceipt);
      if (erc721TransferParsedLogs?.data?.length > 0) {
        hasErc721Transfer = true;
        let fromZeroAddressCount = 0;
        for (const erc721TransferParsedLog of erc721TransferParsedLogs.data) {
          if (
            erc721TransferParsedLog.fromAddress == ethers.constants.AddressZero
          ) {
            fromZeroAddressCount++;
          }

          recordWalletHistories.push({
            walletAddress: erc721TransferParsedLog.fromAddress,
            chainId: +chainId,
            contractAddress: erc721TransferParsedLog.contractAddress,
            event: WalletHistoryEvent.ERC721_TOKEN_TRANSFER,
            isMainEvent,
            tokenId: erc721TransferParsedLog.tokenId,
            toAddress: erc721TransferParsedLog.toAddress,
            nftAddress: erc721TransferParsedLog.contractAddress,
            outAmount: '1',
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: erc721TransferParsedLog.logIndex,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }

        if (
          hasErc721Transfer &&
          fromZeroAddressCount > 0 &&
          (option.tag == WalletHistoryTag.MINT ||
            option.tag == WalletHistoryTag.SMART_MINT)
        ) {
          hasMint = true;
          recordWalletHistories.forEach((recordWalletHistory) => {
            recordWalletHistory.isMainEvent = false;
          });

          let tag = option.tag ?? WalletHistoryTag.MINT;
          if (isPaymaster) {
            tag = WalletHistoryTag.SMART_MINT;
          }

          // 判斷如果有 native token transfer，則將 outAmount 設為 native token transfer 的值
          // symbol 設為 native token transfer 的 symbol
          let outAmount = '0';
          let currencyAddress = '';
          if (hasNativeTokenTransfer) {
            outAmount = handleNativeTokenTransfer.data.value;
            currencyAddress = ethers.constants.AddressZero;
          }

          if (hasErc20Transfer) {
            outAmount = recordWalletHistories
              .filter(
                (recordWalletHistory) =>
                  recordWalletHistory.event ==
                    WalletHistoryEvent.ERC20_TOKEN_TRANSFER &&
                  recordWalletHistory.walletAddress == walletAddress,
              )
              .reduce((acc, cur) => {
                return acc.plus(cur.outAmount);
              }, new BigNumber(0))
              .toFixed();
            currencyAddress = recordWalletHistories.filter(
              (recordWalletHistory) =>
                recordWalletHistory.event ==
                  WalletHistoryEvent.ERC20_TOKEN_TRANSFER &&
                recordWalletHistory.walletAddress == walletAddress,
            )[0].currencyAddress;
          }

          recordWalletHistories.push({
            walletAddress:
              saAddress ?? erc721TransferParsedLogs.data[0].toAddress,
            chainId: +chainId,
            contractAddress: erc721TransferParsedLogs.data[0].contractAddress,
            event: WalletHistoryEvent.ERC721_TOKEN_TRANSFER,
            isMainEvent: true,
            inAmount: recordWalletHistories
              .filter(
                (recordWalletHistory) =>
                  recordWalletHistory.event ==
                  WalletHistoryEvent.ERC721_TOKEN_TRANSFER,
              )
              .length.toString(),
            outAmount: outAmount.toString(),
            nftAddress: erc721TransferParsedLogs.data[0].contractAddress,
            currencyAddress,
            tag,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: -1,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }
      }

      const erc1155TransferParsedLogs =
        this.handleErc1155TokenTransferSingle(transactionReceipt);
      if (erc1155TransferParsedLogs?.data?.length > 0) {
        hasErc1155Transfer = true;
        let fromZeroAddressCount = 0;
        for (const erc1155TransferParsedLog of erc1155TransferParsedLogs.data) {
          if (
            erc1155TransferParsedLog.fromAddress == ethers.constants.AddressZero
          ) {
            fromZeroAddressCount++;
          }

          recordWalletHistories.push({
            walletAddress: erc1155TransferParsedLog.fromAddress,
            chainId: +chainId,
            contractAddress: erc1155TransferParsedLog.contractAddress,
            event: WalletHistoryEvent.ERC1155_TOKEN_TRANSFER_SINGLE,
            isMainEvent,
            inAmount: erc1155TransferParsedLog.amount,
            tokenId: erc1155TransferParsedLog.tokenId,
            outAmount: erc1155TransferParsedLog.amount,
            toAddress: erc1155TransferParsedLog.toAddress,
            nftAddress: erc1155TransferParsedLog.contractAddress,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: erc1155TransferParsedLog.logIndex,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }

        if (
          hasErc1155Transfer &&
          fromZeroAddressCount > 0 &&
          (option.tag == WalletHistoryTag.MINT ||
            option.tag == WalletHistoryTag.SMART_MINT)
        ) {
          hasMint = true;
          recordWalletHistories.forEach((recordWalletHistory) => {
            recordWalletHistory.isMainEvent = false;
          });

          // 判斷如果有 native token transfer，則將 outAmount 設為 native token transfer 的值
          // symbol 設為 native token transfer 的 symbol
          let outAmount = '0';
          let currencyAddress = '';
          if (hasNativeTokenTransfer) {
            outAmount = handleNativeTokenTransfer.data.value;
            currencyAddress = ethers.constants.AddressZero;
          }

          if (hasErc20Transfer) {
            outAmount = recordWalletHistories
              .filter(
                (recordWalletHistory) =>
                  recordWalletHistory.event ==
                    WalletHistoryEvent.ERC20_TOKEN_TRANSFER &&
                  recordWalletHistory.walletAddress == walletAddress,
              )
              .reduce((acc, cur) => {
                return acc.plus(cur.outAmount);
              }, new BigNumber(0))
              .toFixed();
            currencyAddress = recordWalletHistories.filter(
              (recordWalletHistory) =>
                recordWalletHistory.event ==
                  WalletHistoryEvent.ERC20_TOKEN_TRANSFER &&
                recordWalletHistory.walletAddress == walletAddress,
            )[0].currencyAddress;
          }

          recordWalletHistories.push({
            walletAddress: erc1155TransferParsedLogs.data[0].toAddress,
            chainId: +chainId,
            contractAddress: erc1155TransferParsedLogs.data[0].contractAddress,
            event: WalletHistoryEvent.ERC1155_TOKEN_TRANSFER_SINGLE,
            isMainEvent,
            tokenId: erc1155TransferParsedLogs.data[0].tokenId,
            nftAddress: erc1155TransferParsedLogs.data[0].contractAddress,
            inAmount: recordWalletHistories
              .filter(
                (recordWalletHistory) =>
                  recordWalletHistory.event ==
                  WalletHistoryEvent.ERC1155_TOKEN_TRANSFER_SINGLE,
              )
              .reduce((acc, cur) => {
                return acc.plus(cur.inAmount);
              }, new BigNumber(0))
              .toFixed(),
            outAmount: outAmount.toString(),
            currencyAddress,
            tag: option.tag ?? WalletHistoryTag.MINT,
            blockTime,
            block,
            txHash: transaction.hash,
            logIndex: -1,
            fee,
            isSa,
            isPaymaster,
            nativeUsdPrice,
            ip,
            area,
          });
        }

        hasErc1155Transfer = true;
      }

      // ERC404 transfer
      if (
        hasErc20Transfer &&
        hasErc721Transfer &&
        recordWalletHistories.filter(
          (recordWalletHistory) =>
            recordWalletHistory.event ==
            WalletHistoryEvent.ERC20_TOKEN_TRANSFER,
        ).length == 1 &&
        recordWalletHistories[0].contractAddress ==
          recordWalletHistories[1].contractAddress
      ) {
        hasErc404Transfer = true;

        recordWalletHistories.push({
          walletAddress: recordWalletHistories[0].walletAddress,
          chainId: +chainId,
          contractAddress: recordWalletHistories[0].contractAddress,
          event: WalletHistoryEvent.ERC404_TOKEN_TRANSFER,
          toAddress: recordWalletHistories[0].toAddress,
          nftAddress: recordWalletHistories[0].contractAddress,
          currencyAddress: recordWalletHistories[0].currencyAddress,
          outAmount: recordWalletHistories
            .filter(
              (recordWalletHistory) =>
                recordWalletHistory.event ==
                WalletHistoryEvent.ERC20_TOKEN_TRANSFER,
            )
            .reduce((acc, cur) => {
              return acc.plus(cur.outAmount);
            }, new BigNumber(0))
            .toFixed(),
          outAmountUsd: recordWalletHistories
            .filter(
              (recordWalletHistory) =>
                recordWalletHistory.event ==
                WalletHistoryEvent.ERC20_TOKEN_TRANSFER,
            )
            .reduce((acc, cur) => {
              return acc.plus(cur.outAmountUsd);
            }, new BigNumber(0))
            .toFixed(),
          tokenId: hasErc721Transfer
            ? recordWalletHistories
                .filter(
                  (recordWalletHistory) =>
                    recordWalletHistory.event ==
                    WalletHistoryEvent.ERC721_TOKEN_TRANSFER,
                )[0]
                .tokenId?.toString()
            : null,
          isMainEvent: true,
          logIndex: -1,
          blockTime,
          block,
          txHash: transaction.hash,
          fee,
          isSa,
          isPaymaster,
          nativeUsdPrice,
          ip,
          area,
        });
      }

      // batch transfer
      if (
        !hasSwap &&
        !hasNativeTokenTransfer &&
        // !hasErc20Transfer && 因為 batch 404 會有 erc20 的 transfer
        !hasSeaportOrderFulfilled &&
        !hasMint &&
        !hasErc404Transfer &&
        (hasErc721Transfer || hasErc1155Transfer) &&
        (recordWalletHistories.filter(
          (recordWalletHistory) =>
            recordWalletHistory.event ==
            WalletHistoryEvent.ERC721_TOKEN_TRANSFER,
        ).length > 1 ||
          recordWalletHistories.filter(
            (recordWalletHistory) =>
              recordWalletHistory.event ==
              WalletHistoryEvent.ERC1155_TOKEN_TRANSFER_SINGLE,
          ).length > 1)
      ) {
        // console.log('is batch transfer');
        recordWalletHistories.forEach((recordWalletHistory) => {
          recordWalletHistory.isMainEvent = false;
        });

        recordWalletHistories.push({
          walletAddress: recordWalletHistories[0].walletAddress,
          chainId: +chainId,
          contractAddress: recordWalletHistories[0].contractAddress,
          event: WalletHistoryEvent.NFT_BATCH_TRANSFER,
          toAddress: recordWalletHistories[0].toAddress,
          nftAddress: recordWalletHistories[0].contractAddress,
          outAmount: recordWalletHistories
            .filter(
              (recordWalletHistory) =>
                recordWalletHistory.event ==
                  WalletHistoryEvent.ERC721_TOKEN_TRANSFER ||
                recordWalletHistory.event ==
                  WalletHistoryEvent.ERC1155_TOKEN_TRANSFER_SINGLE,
            )
            .reduce((acc, cur) => {
              return acc.plus(cur.outAmount);
            }, new BigNumber(0))
            .toFixed(),
          isMainEvent: true,
          logIndex: -1,
          blockTime,
          block,
          txHash: transaction.hash,
          fee,
          isSa,
          isPaymaster,
          nativeUsdPrice,
          ip,
          area,
        });
        hasBatchTransfer = true;
      }

      // 只有一筆，那筆就是 main event
      if (recordWalletHistories.length == 1) {
        recordWalletHistories[0].isMainEvent = true;
      }
      // 到最後都沒有需要被紀錄的log，則紀錄一筆 unknown
      if (recordWalletHistories.length == 0) {
        recordWalletHistories.push({
          walletAddress: saAddress ?? transaction.from?.toLowerCase(),
          chainId: +chainId,
          contractAddress: transaction.to?.toLowerCase(),
          event: WalletHistoryEvent.UNKNOWN,
          isMainEvent: true,
          blockTime,
          block,
          txHash: transaction.hash,
          logIndex: -1,
          fee,
          isSa,
          ip,
          area,
        });
      }

      console.debug('==========recordedWalletHistory==========');
      console.debug(recordWalletHistories);
      console.debug('==========recordedWalletHistory==========');
      const recordedWalletHistory = await this.recodeWalletHistory(
        recordWalletHistories,
      );

      if (txIsPending) {
        await this.deletePendingWalletHistory(
          saAddress ?? transaction.from?.toLowerCase(),
          chainId,
          txHash,
        );
      }
      return recordedWalletHistory;
    } catch (err) {
      this.logger.error(
        `[syncWalletHistory]  ${chainId}:${txHash} ${err.message}`,
      );
      throw new HttpException(
        `[syncWalletHistory]  ${chainId}:${txHash} ${err.message}`,
        400,
      );
    }
  }

  // ========================================
  //           event handler
  // ========================================

  getSaSender(transaction: ethers.providers.TransactionResponse): string {
    try {
      const entrypoint_contractInterface = new ethers.utils.Interface(
        ENTRYPOINT_ABI,
      );
      const entrypointParsedData =
        entrypoint_contractInterface.parseTransaction({
          data: transaction.data.trim(),
        });
      const sender = entrypointParsedData.args[0][0][0]?.toLowerCase();

      return sender;
    } catch (err) {
      return null;
    }
  }

  hasEntryPoint(
    transactionReceipt: ethers.providers.TransactionReceipt,
  ): boolean {
    try {
      let hasEntryPoint = false;
      for (const log of transactionReceipt.logs) {
        if (log.address == '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789') {
          hasEntryPoint = true;
          break;
        }
      }
      return hasEntryPoint;
    } catch (err) {
      return false;
    }
  }

  hasPaymaster(
    transactionReceipt: ethers.providers.TransactionReceipt,
  ): boolean {
    try {
      let hasPaymaster = false;
      for (const log of transactionReceipt.logs) {
        if (log.address == '0x00000f79B7FaF42EEBAdbA19aCc07cD08Af44789') {
          hasPaymaster = true;
          break;
        }
      }
      return hasPaymaster;
    } catch (err) {
      return false;
    }
  }

  async handleNativeTokenTransfer(
    transaction: ethers.providers.TransactionResponse,
    transactionReceipt: ethers.providers.TransactionReceipt,
  ): Promise<any> {
    try {
      const entrypoint_contractInterface = new ethers.utils.Interface(
        ENTRYPOINT_ABI,
      );
      const entrypointParsedData =
        entrypoint_contractInterface.parseTransaction({
          data: transaction?.data?.trim(),
        });
      const rawData = entrypointParsedData.args[0][0][3];
      let isOnlyNativeTokenTransfer = true;

      if (rawData.length != 266) {
        isOnlyNativeTokenTransfer = false;
      }

      // 0x0000189a
      // 0000000000000000000000008390d2d29fd01b815cc8199fba285ce70f3d57d9
      // 0000000000000000000000000000000000000000000000000de0b6b3a7640000
      // 0000000000000000000000000000000000000000000000000000000000000060
      // 0000000000000000000000000000000000000000000000000000000000000000
      const toAddress = '0x' + rawData.slice(2 + 8 + 24, 2 + 8 + 64);
      const value = rawData.slice(2 + 8 + 64, 2 + 8 + 64 + 64);
      const normalData = rawData.slice(2 + 8 + 64 + 64, 2 + 8 + 64 + 64 + 64);
      const functionData = rawData.slice(2 + 8 + 64 + 64 + 64);
      const readableValue = ethers.utils.formatUnits(
        ethers.BigNumber.from('0x' + value).toString(),
        18,
      );
      const hasNativeTokenTransfer = ethers.BigNumber.from(
        ethers.BigNumber.from('0x' + value).toString(),
      ).gt(0);

      if (
        normalData !=
        '0000000000000000000000000000000000000000000000000000000000000060'
      ) {
        isOnlyNativeTokenTransfer = false;
      }
      if (
        functionData !=
        '0000000000000000000000000000000000000000000000000000000000000000'
      ) {
        isOnlyNativeTokenTransfer = false;
      }

      return {
        success: true,
        message: 'success',
        data: {
          hasNativeTokenTransfer,
          isOnlyNativeTokenTransfer,
          toAddress,
          value: readableValue,
        },
      };
    } catch (err) {
      if (!transaction.value.eq(0)) {
        return {
          success: true,
          message: 'success',
          data: {
            hasNativeTokenTransfer: true,
            isOnlyNativeTokenTransfer: transactionReceipt.logs.length == 0,
            toAddress: transaction.to?.toLowerCase(),
            value: new BigNumber(transaction.value.toString())
              .shiftedBy(-18)
              .toString(10),
          },
        };
      }

      return {
        success: true,
        message: 'success',
        data: {
          hasNativeTokenTransfer: false,
          isOnlyNativeTokenTransfer: false,
          toAddress: null,
          value: null,
        },
      };
    }
  }

  handleApprovalForAll(
    transactionReceipt: ethers.providers.TransactionReceipt,
  ) {
    try {
      const logs = transactionReceipt.logs;
      const approvalForAllLogs: {
        contractAddress: string;
        ownerAddress: string;
        operatorAddress: string;
        approved: boolean;
        logIndex: number;
      }[] = [];
      logs.forEach((log) => {
        if (log.topics[0] == APPROVAL_FOR_ALL_TOPIC0) {
          approvalForAllLogs.push({
            contractAddress: log.address?.toLowerCase(),
            ownerAddress: '0x' + log.topics[1].slice(26),
            operatorAddress: '0x' + log.topics[2].slice(26),
            approved:
              log.data ==
              '0x0000000000000000000000000000000000000000000000000000000000000001'
                ? true
                : false,
            logIndex: log.logIndex,
          });
        }
      });

      return {
        success: false,
        message: 'success',
        data: approvalForAllLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  handleApproval(transactionReceipt: ethers.providers.TransactionReceipt): any {
    try {
      const logs = transactionReceipt.logs;
      const approvalLogs: {
        contractAddress: string;
        contractType: ContractType;
        ownerAddress: string;
        spenderAddress: string;
        amount?: string;
        tokenId?: string;
        logIndex: number;
      }[] = [];
      logs.forEach((log) => {
        if (log.topics[0] == APPROVAL_TOPIC0) {
          if (log.data == '0x') {
            approvalLogs.push({
              contractAddress: log.address?.toLowerCase(),
              contractType: ContractType.ERC721,
              ownerAddress: '0x' + log.topics[1].slice(26),
              spenderAddress: '0x' + log.topics[2].slice(26),
              tokenId: ethers.BigNumber.from(log.data).toString(),
              logIndex: log.logIndex,
            });
          } else {
            approvalLogs.push({
              contractAddress: log.address?.toLowerCase(),
              contractType: ContractType.ERC20,
              ownerAddress: '0x' + log.topics[1].slice(26),
              spenderAddress: '0x' + log.topics[2].slice(26),
              amount: ethers.BigNumber.from(log.data).toString(),
              logIndex: log.logIndex,
            });
          }
        }
      });

      return {
        success: false,
        message: 'success',
        data: approvalLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  handleErc20TokenTransfer(
    transactionReceipt: ethers.providers.TransactionReceipt,
  ) {
    try {
      const logs = transactionReceipt.logs;
      const erc20TransferLogs: {
        contractAddress: string;
        fromAddress: string;
        toAddress: string;
        amount: string;
        logIndex: number;
      }[] = [];
      logs.forEach((log) => {
        if (log.topics[0] == TRANSFER_TOPIC0 && log.data != '0x') {
          erc20TransferLogs.push({
            contractAddress: log.address?.toLowerCase(),
            fromAddress: '0x' + log.topics[1].slice(26),
            toAddress: '0x' + log.topics[2].slice(26),
            amount: BigNumber(ethers.utils.formatUnits(log.data, 18)).toFixed(),
            logIndex: log.logIndex,
          });
        }
      });

      return {
        success: false,
        message: 'success',
        data: erc20TransferLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  handleErc721TokenTransfer(
    transactionReceipt: ethers.providers.TransactionReceipt,
  ) {
    try {
      const logs = transactionReceipt.logs;
      const erc721TransferLogs: {
        contractAddress: string;
        fromAddress: string;
        toAddress: string;
        tokenId: string;
        logIndex: number;
      }[] = [];
      logs.forEach((log) => {
        if (log.topics[0] == TRANSFER_TOPIC0 && log.data == '0x') {
          erc721TransferLogs.push({
            contractAddress: log.address?.toLowerCase(),
            fromAddress: '0x' + log.topics[1].slice(26),
            toAddress: '0x' + log.topics[2].slice(26),
            tokenId: ethers.BigNumber.from(log.topics[3]).toString(),
            logIndex: log.logIndex,
          });
        }
      });

      return {
        success: false,
        message: 'success',
        data: erc721TransferLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  handleErc1155TokenTransferSingle(
    transactionReceipt: ethers.providers.TransactionReceipt,
  ) {
    try {
      const logs = transactionReceipt.logs;
      const erc1155TransferLogs: {
        contractAddress: string;
        fromAddress: string;
        toAddress: string;
        tokenId: string;
        amount: string;
        logIndex: number;
      }[] = [];
      logs.forEach((log) => {
        if (log.topics[0] == ERC1155_TRANSFER_SINGLE_TOPIC0) {
          const erc1155Interface = new ethers.utils.Interface(ERC1155_ABI);
          const erc1155ParsedData = erc1155Interface.parseLog(log);

          erc1155TransferLogs.push({
            contractAddress: log.address?.toLowerCase(),
            fromAddress: erc1155ParsedData.args.from?.toLowerCase(),
            toAddress: erc1155ParsedData.args.to?.toLowerCase(),
            tokenId: erc1155ParsedData.args.id.toString(),
            amount: erc1155ParsedData.args.value.toString(),
            logIndex: log.logIndex,
          });
        }
      });

      return {
        success: false,
        message: 'success',
        data: erc1155TransferLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  handleSeaportFulfilled(
    transaction: ethers.providers.TransactionResponse,
    transactionReceipt: ethers.providers.TransactionReceipt,
    chainId: ChainId,
  ) {
    try {
      // symbol = 交易的 token
      // contractAddress = 交易的 contract
      const logs = transactionReceipt.logs;
      const seaportFulfilledLogs: {
        contractAddress: string;
        orderHash: string;
        offerer: string;
        fulfiller: string;
        tokenId: string;
        outAmount: string;
        inAmount: string;
        nftAddress: string;
        currencyAddress: string;
        consider1ToAddress: string;
        logIndex: number;
        tag: WalletHistoryTag;
      }[] = [];
      logs.forEach((log) => {
        if (log.topics[0] == SEAPORT_ORDER_FULFILLED_TOPIC0) {
          const saAddress = this.getSaSender(transaction);
          const seaportInterface = new ethers.utils.Interface(SEAPORT_ABI);
          const seaportParsedData = seaportInterface.parseLog(log);
          const offerer = seaportParsedData.args.offerer?.toLowerCase();
          const fulfiller = saAddress ?? transactionReceipt.from?.toLowerCase();
          const orderHash = seaportParsedData.args.orderHash;
          const consider1ToAddress =
            seaportParsedData.args.consideration[0].recipient?.toLowerCase();
          const tag =
            seaportParsedData.args.offer[0].itemType == '1'
              ? WalletHistoryTag.ACCEPT_OFFER
              : WalletHistoryTag.PURCHASE;

          const nfts: {
            contractAddress: string;
            tokenId: string;
            amount: string;
          }[] = [];
          const currencies: {
            contractAddress: string;
            amount: string;
          }[] = [];
          seaportParsedData.args.offer.forEach((content) => {
            if (content.itemType == 0 || content.itemType == 1) {
              currencies.push({
                contractAddress: content.token?.toLowerCase(),
                amount: ethers.utils.formatUnits(
                  ethers.BigNumber.from(content.amount).toString(),
                  18,
                ),
              });
            } else {
              nfts.push({
                contractAddress: content.token?.toLowerCase(),
                tokenId: ethers.BigNumber.from(content.identifier).toString(),
                amount: ethers.BigNumber.from(content.amount).toString(),
              });
            }
          });
          seaportParsedData.args.consideration.forEach((content) => {
            if (content.itemType == 0 || content.itemType == 1) {
              currencies.push({
                contractAddress: content.token?.toLowerCase(),
                amount: ethers.utils.formatUnits(
                  ethers.BigNumber.from(content.amount).toString(),
                  18,
                ),
              });
            } else {
              nfts.push({
                contractAddress: content.token?.toLowerCase(),
                tokenId: ethers.BigNumber.from(content.identifier).toString(),
                amount: ethers.BigNumber.from(content.amount).toString(),
              });
            }
          });
          const nftAddress = nfts[0].contractAddress;
          const tokenId = nfts[0].tokenId;
          const currencyAddress = currencies[0].contractAddress;
          const outAmount =
            tag == WalletHistoryTag.PURCHASE
              ? currencies
                  .reduce((acc, cur) => {
                    return acc.plus(cur.amount);
                  }, new BigNumber(0))
                  .toFixed()
              : nfts[0].amount;
          const inAmount =
            tag == WalletHistoryTag.ACCEPT_OFFER
              ? currencies
                  .reduce((acc, cur) => {
                    return acc.plus(cur.amount);
                  }, new BigNumber(0))
                  .toFixed()
              : nfts[0].amount;

          seaportFulfilledLogs.push({
            contractAddress: log.address?.toLowerCase(),
            orderHash,
            offerer,
            fulfiller,
            tokenId,
            outAmount,
            inAmount,
            nftAddress,
            currencyAddress,
            consider1ToAddress,
            logIndex: log.logIndex,
            tag,
          });
        }
      });

      return {
        success: false,
        message: 'success',
        data: seaportFulfilledLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  handleSeaportCancel(transactionReceipt: ethers.providers.TransactionReceipt) {
    try {
      const logs = transactionReceipt.logs;
      const seaportCancelLogs: {
        contractAddress: string;
        orderHash: string;
        offerer: string;
        logIndex: number;
      }[] = [];
      logs.forEach((log) => {
        if (log.topics[0] == SEAPORT_ORDER_CANCEL_TOPIC0) {
          const seaportInterface = new ethers.utils.Interface(SEAPORT_ABI);
          const seaportParsedData = seaportInterface.parseLog(log);

          seaportCancelLogs.push({
            contractAddress: log.address?.toLowerCase(),
            orderHash: seaportParsedData.args.orderHash,
            offerer: seaportParsedData.args.offerer?.toLowerCase(),
            logIndex: log.logIndex,
          });
        }
      });

      return {
        success: true,
        message: 'success',
        data: seaportCancelLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  async handleGpTopUp(
    chainId: ChainId,
    transactionReceipt: ethers.providers.TransactionReceipt,
  ) {
    try {
      const logs = transactionReceipt.logs;
      const gpTopUpLogs: {
        contractAddress: string;
        lootTokenAddress: string;
        owner: string;
        to: string;
        lootAmount: string;
        gpAmount: string;
        logIndex: number;
      }[] = [];
      const gpTokenDecimal = await this.sdkEnvService.getNumber(
        SdkEnv.GP_TOKEN_DECIMAL,
      );
      const rateLootGp = await this.sdkEnvService.getNumber(
        SdkEnv.GP_EXCHANGE_LOOT_GP,
      );
      logs.forEach((log) => {
        if (
          log.address?.toLowerCase() ==
            CHAINID_GP_ADDRESS[chainId]?.toLowerCase() &&
          log.topics[0] == GP_TOP_UP_TOPIC0
        ) {
          let lootTokenAddress = ethers.constants.AddressZero;
          for (const innerLog of logs) {
            // 找出 ERC20 的 transfer
            if (!(innerLog.topics[0] == TRANSFER_TOPIC0)) {
              continue;
            }
            const fromAddress = '0x' + innerLog.topics[1].slice(26);
            const toAddress = '0x' + innerLog.topics[2].slice(26);

            if (toAddress == log.address?.toLowerCase()) {
              lootTokenAddress = innerLog.address?.toLowerCase();
              break;
            }
          }

          const gpInterface = new ethers.utils.Interface(GP_ABI);
          const gpParsedData = gpInterface.parseLog(log);

          const lootAmount = new BigNumber(
            gpParsedData.args._lootAmount.toString(),
          )
            .shiftedBy(-gpTokenDecimal)
            .toString(10);

          const gpTokenAmount = Math.floor(
            new BigNumber(gpParsedData.args._lootAmount.toString())
              .shiftedBy(-gpTokenDecimal) // /
              .times(rateLootGp) // x
              .toNumber(),
          ).toString();

          gpTopUpLogs.push({
            contractAddress: log.address?.toLowerCase(),
            lootTokenAddress,
            owner: gpParsedData.args._owner?.toLowerCase(),
            to: gpParsedData.args._to?.toLowerCase(),
            lootAmount,
            gpAmount: gpTokenAmount,
            logIndex: log.logIndex,
          });
        }
      });
      return {
        success: true,
        message: 'success',
        data: gpTopUpLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  async handleSwap(
    chainId: ChainId,
    transaction: ethers.providers.TransactionResponse,
    transactionReceipt: ethers.providers.TransactionReceipt,
  ) {
    try {
      const logs = transactionReceipt.logs;
      const swapLogs: {
        contractAddress: string;
        walletAddress: string;
        inAmount: string; // 以合約來說收到的是 inAmount
        outAmount: string;
        inAddress: string;
        outAddress: string;
        tag: WalletHistoryTag;
        isMainSwap: boolean;
        logIndex: number;
      }[] = [];
      for (const log of logs) {
        if (
          log.topics[0] != WRAPPED_TOKEN_DEPOSIT_TOPIC0 &&
          log.topics[0] != WRAPPED_TOKEN_WITHDRAW_TOPIC0 &&
          log.topics[0] != TRANSFER_TOPIC0 &&
          log.topics[0] != FUSIONX_V3_SWAP_TOPIC0 &&
          log.topics[0] != UNISWAP_V3_SWAP_TOPIC0
        ) {
          continue;
        }
        // WrappedTokenSwap
        const isDeposit = log.topics[0] == WRAPPED_TOKEN_DEPOSIT_TOPIC0;
        const isWithdrawal = log.topics[0] == WRAPPED_TOKEN_WITHDRAW_TOPIC0;
        if (isDeposit || isWithdrawal) {
          const walletAddress = '0x' + log.topics[1].slice(26);
          const amount = new BigNumber(log.data.toString())
            .shiftedBy(-18)
            .toString(10);

          swapLogs.push({
            contractAddress: log.address?.toLowerCase(),
            walletAddress: walletAddress,
            inAmount: amount,
            outAmount: amount,
            inAddress: isWithdrawal
              ? log.address?.toLowerCase()
              : ethers.constants.AddressZero,
            outAddress: isWithdrawal // 被取錢的話，outAddress 是 native token
              ? ethers.constants.AddressZero
              : log.address?.toLowerCase(),
            logIndex: log.logIndex,
            tag: WalletHistoryTag.WRAPPED,
            isMainSwap: true,
          });
        }
        // Arbitrum Wrapped Swap
        if (
          log.address.toLowerCase() ==
            '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' &&
          chainId == ChainMap.arbitrum.id &&
          log.topics[0] == TRANSFER_TOPIC0 &&
          ('0x' + log.topics[1].slice(26) == ethers.constants.AddressZero ||
            '0x' + log.topics[2].slice(26) == ethers.constants.AddressZero)
        ) {
          const amount = new BigNumber(log.data.toString())
            .shiftedBy(-18)
            .toString(10);

          // WETH transfer 0x000 to 0xowner = deposit
          const isDeposit =
            '0x' + log.topics[1].slice(26) == ethers.constants.AddressZero
              ? true
              : false;
          const walletAddress = isDeposit
            ? '0x' + log.topics[2].slice(26)
            : '0x' + log.topics[1].slice(26);
          swapLogs.push({
            contractAddress: log.address?.toLowerCase(),
            walletAddress,
            inAmount: amount,
            outAmount: amount,
            inAddress: isDeposit
              ? ethers.constants.AddressZero
              : log.address?.toLowerCase(),
            outAddress: isDeposit
              ? log.address?.toLowerCase()
              : ethers.constants.AddressZero,
            logIndex: -1,
            tag: WalletHistoryTag.WRAPPED,
            isMainSwap: true,
          });
        }

        if (log.topics[0] == FUSIONX_V3_SWAP_TOPIC0) {
          const poolAddress = log.address?.toLowerCase();
          const swapInterface = new ethers.utils.Interface(FUSIONX_V3_SWAP_ABI);
          const swapEvent = swapInterface.parseLog(log);

          let inTokenAddress = ethers.constants.AddressZero;
          let outTokenAddress = ethers.constants.AddressZero;
          for (const innerLog of logs) {
            // 找出 ERC20 的 transfer
            if (
              !(innerLog.topics[0] == TRANSFER_TOPIC0 && innerLog.data != '0x')
            ) {
              continue;
            }
            const fromAddress = '0x' + innerLog.topics[1].slice(26);
            const toAddress = '0x' + innerLog.topics[2].slice(26);

            // transfer token tx.from(saAddress) -> pool = inToken
            // transfer token pool -> tx.to(saAddress) = outToken
            if (fromAddress == poolAddress) {
              outTokenAddress = innerLog.address?.toLowerCase();
            }
            if (toAddress == poolAddress) {
              inTokenAddress = innerLog.address?.toLowerCase();
            }
          }

          const inAmount = swapEvent.args.amount0.gt(0)
            ? ethers.BigNumber.from(swapEvent.args.amount0).abs()
            : ethers.BigNumber.from(swapEvent.args.amount1).abs();

          const outAmount = swapEvent.args.amount0.gt(0)
            ? ethers.BigNumber.from(swapEvent.args.amount1).abs()
            : ethers.BigNumber.from(swapEvent.args.amount0).abs();

          swapLogs.push({
            contractAddress: log.address?.toLowerCase(),
            walletAddress: swapEvent.args.recipient?.toLowerCase(),
            inAmount: new BigNumber(inAmount.toString())
              .shiftedBy(-18)
              .toString(10),
            outAmount: new BigNumber(outAmount.toString())
              .shiftedBy(-18)
              .toString(10),
            inAddress: inTokenAddress,
            outAddress: outTokenAddress,
            logIndex: log.logIndex,
            tag: WalletHistoryTag.POOL,
            isMainSwap: true,
          });
        }

        if (log.topics[0] == UNISWAP_V3_SWAP_TOPIC0) {
          const poolAddress = log.address?.toLowerCase();
          const swapInterface = new ethers.utils.Interface(UNISWAP_V3_POOL_ABI);
          const swapEvent = swapInterface.parseLog(log);

          let inTokenAddress = ethers.constants.AddressZero;
          let outTokenAddress = ethers.constants.AddressZero;
          for (const innerLog of logs) {
            // 找出 ERC20 的 transfer
            if (
              !(innerLog.topics[0] == TRANSFER_TOPIC0 && innerLog.data != '0x')
            ) {
              continue;
            }
            const fromAddress = '0x' + innerLog.topics[1].slice(26);
            const toAddress = '0x' + innerLog.topics[2].slice(26);

            // transfer token tx.from(saAddress) -> pool = inToken
            // transfer token pool -> tx.to(saAddress) = outToken
            if (fromAddress == poolAddress) {
              outTokenAddress = innerLog.address?.toLowerCase();
            }
            if (toAddress == poolAddress) {
              inTokenAddress = innerLog.address?.toLowerCase();
            }
          }

          const inAmount = swapEvent.args.amount0.gt(0)
            ? ethers.BigNumber.from(swapEvent.args.amount0).abs()
            : ethers.BigNumber.from(swapEvent.args.amount1).abs();

          const outAmount = swapEvent.args.amount0.gt(0)
            ? ethers.BigNumber.from(swapEvent.args.amount1).abs()
            : ethers.BigNumber.from(swapEvent.args.amount0).abs();

          swapLogs.push({
            contractAddress: log.address?.toLowerCase(),
            walletAddress: swapEvent.args.recipient?.toLowerCase(),
            inAmount: new BigNumber(inAmount.toString())
              .shiftedBy(-18)
              .toString(10),
            outAmount: new BigNumber(outAmount.toString())
              .shiftedBy(-18)
              .toString(10),
            inAddress: inTokenAddress,
            outAddress: outTokenAddress,
            logIndex: log.logIndex,
            tag: WalletHistoryTag.POOL,
            isMainSwap: true,
          });
        }
      }

      // 1. MNT <-> FRENS 時，會 MNT -> WMNT -> FRENS (MNT <-> WMNT 是 wrapped 合約)
      // 1. LOOT <-> FRENS 時，會 LOOT -> WMNT -> FRENS
      if (swapLogs.length > 1) {
        // 把 tag = WRAPPED 的設為 false
        swapLogs.forEach((swapLog) => {
          swapLog.isMainSwap = false;
        });

        const saAddress = this.getSaSender(transaction);

        // 這裡要用池子的角度
        // swapIn = user out
        // swapOut = user in
        const swapIn = swapLogs[0];
        const swapOut = swapLogs[swapLogs.length - 1];

        swapLogs.push({
          contractAddress: swapIn.contractAddress,
          walletAddress: swapOut.walletAddress,
          inAmount: swapIn.inAmount,
          inAddress: swapIn.inAddress,
          outAmount: swapOut.outAmount,
          outAddress: swapOut.outAddress,
          logIndex: -1,
          tag: WalletHistoryTag.POOL,
          isMainSwap: true,
        });

        // let inAmount = '0';
        // let outAmount = '0';
        // let inAddress = ethers.constants.AddressZero;
        // let outAddress = ethers.constants.AddressZero;

        // const nativeTokenSwapIn = await this.handleNativeTokenTransfer(
        //   transaction,
        //   transactionReceipt,
        // );
        // const nativeValue = nativeTokenSwapIn?.data?.value;
        // if (nativeValue != null && nativeValue != '0') {
        //   inAmount = nativeValue;
        //   inAddress = ethers.constants.AddressZero;
        // }

        // const erc20transferLogs =
        //   this.handleErc20TokenTransfer(transactionReceipt);
        // const erc20TransferInLog = erc20transferLogs.data.filter(
        //   (erc20TransferLog) =>
        //     erc20TransferLog.fromAddress == transaction.from.toLowerCase() ||
        //     erc20TransferLog.fromAddress == saAddress,
        // );
        // const erc20TransferOutLog = erc20transferLogs.data.filter(
        //   (erc20TransferLog) =>
        //     erc20TransferLog.toAddress == transaction.from.toLowerCase() ||
        //     erc20TransferLog.toAddress == saAddress,
        // );
        // if (!nativeValue || nativeValue == '0') {
        //   inAmount = erc20TransferInLog[0].amount;
        //   inAddress = erc20TransferInLog[0].contractAddress;
        // }

        // if (erc20TransferOutLog.length > 0) {
        //   outAmount = erc20TransferOutLog[0].amount;
        //   outAddress = erc20TransferOutLog[0].contractAddress;
        // }
      }

      return {
        success: true,
        message: 'success',
        data: swapLogs,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  // ========================================
  //           wallet history
  // ========================================

  async recodeWalletHistory(
    recodeWalletHistories: RecodeWalletHistory[],
  ): Promise<any> {
    try {
      const walletHistories = recodeWalletHistories.map((recodeWalletHistory) =>
        this.toWalletHistory(recodeWalletHistory),
      );
      const updated =
        await this.walletHistoryRepository.bulkCreate(walletHistories);
      return {
        success: true,
        message: updated,
      };
    } catch (err) {
      return {
        success: false,
        message: `${err.message}, Maybe it has been recorded`,
      };
    }
  }

  toWalletHistory(
    recodeWalletHistory: RecodeWalletHistory,
  ): Partial<WalletHistory> {
    return {
      walletAddress: recodeWalletHistory.walletAddress,
      chainId: recodeWalletHistory.chainId,
      contractAddress: recodeWalletHistory.contractAddress,
      event: recodeWalletHistory.event,
      isMainEvent: recodeWalletHistory.isMainEvent,
      symbol: recodeWalletHistory.symbol,
      outAmount: recodeWalletHistory.outAmount,
      outAmountUsd: recodeWalletHistory.outAmountUsd,
      inAmount: recodeWalletHistory.inAmount,
      inAmountUsd: recodeWalletHistory.inAmountUsd,
      nftAddress: recodeWalletHistory.nftAddress,
      currencyAddress: recodeWalletHistory.currencyAddress,
      toAddress: recodeWalletHistory.toAddress,
      tokenId: recodeWalletHistory.tokenId,
      bool: recodeWalletHistory.bool,
      blockTime: recodeWalletHistory.blockTime,
      block: recodeWalletHistory.block,
      tag: recodeWalletHistory.tag,
      orderHash: recodeWalletHistory.orderHash,
      txHash: recodeWalletHistory.txHash,
      logIndex: recodeWalletHistory.logIndex,
      fee: recodeWalletHistory.fee,
      isSa: recodeWalletHistory.isSa,
      isPaymaster: recodeWalletHistory.isPaymaster,
      nativeUsdPrice: recodeWalletHistory.nativeUsdPrice,
      ip: recodeWalletHistory.ip,
      area: recodeWalletHistory.area,
    };
  }

  async createPendingWalletHistory(
    walletAddress: string,
    chainId: ChainId,
    txHash: string,
  ): Promise<any> {
    try {
      const walletHistory = await this.walletHistoryRepository.create({
        where: {
          event: WalletHistoryEvent.PENDING,
          walletAddress,
          txHash,
          chainId,
          isMainEvent: true,
        },
      });

      if (!walletHistory) {
        return {
          success: false,
          message: `pending created failed`,
        };
      }

      return {
        success: true,
        message: `${walletAddress} ${txHash} ${chainId} pending created`,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  async deletePendingWalletHistory(
    walletAddress: string,
    chainId: ChainId,
    txHash: string,
  ): Promise<any> {
    try {
      const deletedCount = await this.walletHistoryRepository.destroy({
        where: {
          event: WalletHistoryEvent.PENDING,
          walletAddress,
          txHash,
          chainId,
          isMainEvent: true,
        },
      });

      if (deletedCount == 0) {
        return {
          success: false,
          message: `pending not found`,
        };
      }

      return {
        success: true,
        message: `pending history deleted, address: ${walletAddress}, tx: ${txHash}, chainId: ${chainId}`,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  checkTxIncludeLogs(
    chainId: ChainId,
    transactionReceipt: ethers.providers.TransactionReceipt,
  ) {
    try {
      // Basic
      let hasSeaportOrderFulfilled = false;
      let hasSeaportOrderCancel = false;
      let hasErc20Transfer = false;
      let hasErc721Transfer = false;
      let hasErc1155Transfer = false;
      let hasApprovalForAll = false;
      let hasApproval = false;
      let hasSwap = false;
      // Complex
      const hasErc404Transfer = false;
      const hasBatchTransfer = false;
      const hasMint = false;

      for (const log of transactionReceipt.logs) {
        // seaport
        // fulfilled
        if (log.topics[0] == SEAPORT_ORDER_FULFILLED_TOPIC0) {
          hasSeaportOrderFulfilled = true;
          break;
        }
        // cancel
        if (log.topics[0] == SEAPORT_ORDER_CANCEL_TOPIC0) {
          hasSeaportOrderCancel = true;
          break;
        }

        // transfer
        // ERC20
        if (log.topics[0] == TRANSFER_TOPIC0 && log.data != '0x') {
          hasErc20Transfer = true;
          break;
        }
        // ERC721
        if (log.topics[0] == TRANSFER_TOPIC0 && log.data == '0x') {
          hasErc721Transfer = true;
          break;
        }
        // ERC1155
        if (log.topics[0] == ERC1155_TRANSFER_SINGLE_TOPIC0) {
          hasErc1155Transfer = true;
          break;
        }

        // approval
        if (log.topics[0] == APPROVAL_FOR_ALL_TOPIC0) {
          hasApprovalForAll = true;
          break;
        }
        if (log.topics[0] == APPROVAL_TOPIC0) {
          hasApproval = true;
          break;
        }

        // swap
        if (log.topics[0] == WRAPPED_TOKEN_DEPOSIT_TOPIC0) {
          hasSwap = true;
          break;
        }
        if (log.topics[0] == WRAPPED_TOKEN_WITHDRAW_TOPIC0) {
          hasSwap = true;
          break;
        }
        if (
          log.address.toLowerCase() ==
            '0x82af49447d8a07e3bd95bd0d56f35241523fbab1' &&
          chainId == ChainMap.arbitrum.id &&
          log.topics[0] == TRANSFER_TOPIC0
        ) {
          hasSwap = true;
          break;
        }
        if (log.topics[0] == FUSIONX_V3_SWAP_TOPIC0) {
          hasSwap = true;
          break;
        }
      }

      return {
        success: true,
        message: 'success',
        data: {
          hasSeaportOrderFulfilled,
          hasSeaportOrderCancel,
          hasErc20Transfer,
          hasErc721Transfer,
          hasErc1155Transfer,
          hasErc404Transfer,
          hasApprovalForAll,
          hasApproval,
          hasSwap,
        },
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  /**
   * 如果是 Privy 的 embed wallet, 要去拿 SA 的地址
   * 如果是其他的則回傳原本的地址
   * @param address
   */
  async getUserSaWalletAddressByAddress(
    walletAddress: string,
  ): Promise<string> {
    try {
      let address = walletAddress?.toLowerCase();

      // 如果是 SA，要去拿 SA address
      const userAddress = await this.walletRepository.findOne({
        attributes: ['accountId', 'address', 'provider'],
        where: {
          address,
        },
      });

      if (
        userAddress.provider == AuthSupportedWalletProviderEnum.PRIVY_LIBRARY
      ) {
        const saWallet = await this.walletRepository.findOne({
          attributes: ['address'],
          where: {
            accountId: userAddress.accountId,
            provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
          },
        });
        address = saWallet.address;
      }

      return address;
    } catch (err) {
      this.logger.log(
        `[getUserSaWalletAddressByAddress]: ${walletAddress} ${err}`,
      );
      return walletAddress?.toLowerCase();
    }
  }

  async getUserSaWalletAddressByWallet(wallet: Wallet): Promise<string> {
    try {
      let address = wallet.address?.toLowerCase();
      if (wallet.provider == AuthSupportedWalletProviderEnum.PRIVY_LIBRARY) {
        const saWallet = await this.walletRepository.findOne({
          attributes: ['address'],
          where: {
            accountId: wallet.accountId,
            provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
          },
        });
        address = saWallet.address;
      }

      return address;
    } catch (err) {
      this.logger.log(
        `[getUserSaWalletAddressByAddress]: ${wallet.address} ${err}`,
      );
      return wallet.address?.toLowerCase();
    }
  }

  @RpcCall()
  async getWalletChainBalance(
    chainId: number,
    address: string,
  ): Promise<string> {
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProvider(chainId);

    return ethers.utils.formatEther(await provider.getBalance(address));
  }

  async getAddressHoldingUSDBalance(walletAddress: string) {
    let totalBalance = new BigNumber(0);

    const promises = ChainUtil.POC_CHAINS.map(async (chainId) => {
      const balance = await this.getWalletChainBalance(chainId, walletAddress);
      let warpedToken = '0';

      switch (chainId) {
        case 1:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '1',
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            walletAddress,
          );
          break;
        case 56:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '56',
            '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
            walletAddress,
          );
          break;
        case 137:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '137',
            '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
            walletAddress,
          );
          break;
        case 5000:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '5000',
            '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8',
            walletAddress,
          );
          break;
        case 8453:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '8453',
            '0x4200000000000000000000000000000000000006',
            walletAddress,
          );
          break;
        case 42161:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '42161',
            '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
            walletAddress,
          );
          break;
        case 43114:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '43114',
            '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
            walletAddress,
          );
          break;
      }

      const readableWarpedToken = new BigNumber(warpedToken).dividedBy(1e18);
      const { tokenPrice } =
        await this.currencyService.getCachePriceByChainId(chainId);
      const balanceUsd = new BigNumber(balance)
        .plus(readableWarpedToken)
        .times((tokenPrice as any).price);
      this.logger.debug(
        `chainId ${chainId} balance ${balance.toString()} warpedToken ${readableWarpedToken} nativeTokenPrice ${(tokenPrice as any).price} balanceUsd ${balanceUsd}`,
      );
      totalBalance = totalBalance.plus(balanceUsd);

      return {
        chainId,
        balanceUsd,
        warpedToken: readableWarpedToken,
        nativeToken: balance,
      };
    });

    const balancesUsd = await Promise.all(promises);

    this.logger.debug(`totalBalance ${totalBalance.toString()}`);

    return { totalBalance: totalBalance.toString(), balancesUsd };
  }
}
