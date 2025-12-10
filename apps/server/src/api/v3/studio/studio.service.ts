import {
  Blockchain,
  Collection,
  Currency,
  StudioContract,
  StudioContractDrop,
  Wallet,
  Contract,
} from '@/model/entities';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  BiruMintLogPaginationDto,
  ContractBlindboxDTO,
  ContractDraftDTO,
  ContractDropDTO,
  GetLaunchpadListDTO,
  SetLaunchpadInfoByAdminDTO,
  UpdateContractDraftDTO,
} from './studio.dto';
import {
  ContractStatus,
  LaunchpadContracts,
  RevealChallengeInput,
} from './studio.interface';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { ChainId } from '@/common/utils/types';
import { StudioContractUploadItem } from '@/model/entities/studio/studio-contract-upload-item.entity';
import { StudioUploadService } from './upload/service/studio-upload.service';
import { CollectionDao } from '@/core/dao/collection-dao';
import { LibsDao } from '@/core/dao/libs-dao';
import { SimpleException } from '@/common/utils/simple.util';
import { ethers } from 'ethers';
import { CollectionService } from '../collection/collection.service';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { Readable } from 'stream';
import * as csv from '@fast-csv/parse';
import { generateMerkleTree } from '@/common/utils/merkle-tree';
import { RpcService } from '@/core/third-party-api/rpc/rpc.service';
import { ChainIdMap, ChainMap, LibsService } from '@/common/libs/libs.service';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import {
  ADDRESS_PREDICTOR_ABI,
  FACTORY_CONTRACT_ABI,
  REGISTRY_CONTRACT_ABI,
} from './constants';
import { AuthSupportedWalletProviderEnum } from '../auth/auth.interface';
import {
  ProxyContractRequest,
  RpcEnd,
  callData,
} from '@/core/third-party-api/rpc/interfaces';
// bluebird
import * as promise from 'bluebird';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { BiruCollection } from '@/model/entities/biru/biru-collection.entity';
import { ContractType } from '@/common/utils';
import * as fs from 'fs';
import * as path from 'path';
import { createPublicClient, http } from 'viem';
import MerkleTree from 'merkletreejs';
import { randomBytes, ZeroAddress } from 'ethers-v6';
import { StudioContractItemMetadata } from '@/model/entities/studio/studio-contract-item-metadata.entity';
import { BiruPointHistory } from '@/model/entities/biru/biru-point-history.entity';
import { pagination } from '@/common/utils/pagination';
import { CacheService } from '@/common/cache';
import { mainnet } from 'viem/chains';
import { AssetDao } from '@/core/dao/asset-dao';
import { uuidV4 } from 'ethers-v6';
import { SupportedMethod } from '@/core/third-party-api/rpc/constants';

@Injectable()
export class StudioService implements OnModuleInit {
  private addressToProofsMap: Map<string, string[]> = new Map();

  async onModuleInit() {
    try {
      // Assuming the app runs from project root and assets are copied to dist/assets
      // Or if running from dist, relative path from this file
      // dist/api/v3/studio/studio.service.js -> ../../../../assets/evermoon-whitelist.json
      const filePath = path.resolve(
        __dirname,
        '../../../../assets/evermoon-whitelist.json',
      );

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        this.addressToProofsMap = new Map(data);
      } else {
        console.warn('Evermoon whitelist file not found at ' + filePath);
      }
    } catch (e) {
      console.error('Failed to load evermoon whitelist', e);
    }
  }

  static ALLOW_LIST_HEADER_PREFIX =
    'Wallet Address,Mint Limit,Price in native or ERC20 token';
  constructor(
    @InjectModel(StudioContract)
    private studioContractRepository: typeof StudioContract,

    @InjectModel(StudioContractDrop)
    private studioContractDropRepository: typeof StudioContractDrop,

    @InjectModel(StudioContractUploadItem)
    private studioContractUploadItemRepository: typeof StudioContractUploadItem,

    @InjectModel(StudioContractItemMetadata)
    private studioContractItemMetadataRepository: typeof StudioContractItemMetadata,

    @InjectModel(BiruPointHistory)
    private biruPointHistoryRepository: typeof BiruPointHistory,

    @InjectModel(Collection)
    private collectionRepository: typeof Collection,

    @InjectModel(Currency)
    private currencyRepository: typeof Currency,

    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,

    @InjectModel(BiruCollection)
    private biruCollectionRepository: typeof BiruCollection,

    @InjectModel(Contract)
    private contractRepository: typeof Contract,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private assetDao: AssetDao,

    private gatewayService: GatewayService,

    private studioUploadService: StudioUploadService,

    private collectionDao: CollectionDao,

    private libsDao: LibsDao,

    private libsService: LibsService,

    private collectionService: CollectionService,

    private rpcService: RpcService,

    private rpcHandlerService: RpcHandlerService,

    private readonly cacheService: CacheService,
  ) { }

  test() {
    return 'test';
  }

  @Cacheable()
  async getAccountContracts(accountId: string, limit: number, page: number) {
    let contracts = await this.studioContractRepository.findAndCountAll({
      distinct: true,
      where: {
        ownerAccountId: accountId,
      },
      include: [
        {
          model: StudioContractDrop,
          as: 'drops',
          include: [
            {
              model: Currency,
              attributes: ['address', 'symbol', 'decimals'],
            },
          ],
        },
      ],
      limit,
      offset: limit * (page - 1),
      order: [['createdAt', 'DESC']],
    });

    if (contracts.count === 0) {
      return contracts;
    }

    let needRefresh = false;
    await promise.map(contracts.rows, async (contract: StudioContract) => {
      const updatedEndSale = await this.updateContractStatus(contract);
      if (updatedEndSale.needRefresh) {
        needRefresh = true;
      }
    });

    // 如果有更新，重新查詢
    if (needRefresh) {
      contracts = await this.studioContractRepository.findAndCountAll({
        where: {
          ownerAccountId: accountId,
        },
        include: [
          {
            model: StudioContractDrop,
            as: 'drops',
          },
        ],
        limit,
        offset: limit * (page - 1),
      });
    }

    return contracts;
  }

  async syncContractStatus(studioContractId: string) {
    const contract = await this.studioContractRepository.findOne({
      where: {
        id: studioContractId,
      },
      include: [
        {
          model: StudioContractDrop,
          as: 'drops',
        },
      ],
    });

    return await this.updateContractStatus(contract);
  }

  /**
   *
   * @param contract studioContract include drops
   * @returns
   */
  async updateContractStatus(contract: StudioContract) {
    if (!contract || !contract.status || !contract.drops) {
      return {
        success: false,
        debug: 'Invalid contract data',
        needRefresh: false,
      };
    }

    const contractStatusBefore = contract.status;
    let needRefresh = false;

    switch (contract.status) {
      case ContractStatus.SaleEnd:
        return {
          success: true,
          debug: 'Already SaleEnd, No action',
          needRefresh,
        };

      case ContractStatus.Publishing:
      case ContractStatus.Unpublished:
        needRefresh = await this.handlePublishingOrUnpublishedStatus(contract);
        break;

      case ContractStatus.Published:
        needRefresh = await this.handlePublishedStatus(contract);
        break;

      case ContractStatus.Sale:
        needRefresh = await this.handleSaleStatus(contract);
        break;

      default:
        return { success: false, debug: 'Unhandled status', needRefresh };
    }

    return {
      success: true,
      debug: `${contractStatusBefore} -> ${contract.status}`,
      needRefresh,
    };
  }

  // 處理 Publishing 或 Unpublished 狀態
  private async handlePublishingOrUnpublishedStatus(
    contract: StudioContract,
  ): Promise<boolean> {
    const deployed = !!contract.address;

    // TODO: 先拔掉驗證 NFT URI 的部分，因為很容易遇到 IPFS 還沒上傳上去導致無法取得 NFT URI 的問題
    // const nftData = await this.fetchNftData(contract);
    // const isUploadUri = !!nftData?.tokenUri;

    let dropCondition;
    if (contract.schemaName == ContractType.ERC1155) {
      dropCondition = await this.fetchDropCondition(
        contract,
        '0',
        contract.drops[0]?.tokenId,
      );
    } else {
      dropCondition = await this.fetchDropCondition(contract, '0');
    }
    const isDropCondition = dropCondition
      ? dropCondition?.startTimestamp?.toString() !== '0'
      : null;
    if (deployed && isDropCondition) {
      // isUploadUri && ) {
      const startTimestamp = ethers.BigNumber.from(
        dropCondition.startTimestamp,
      );
      const currentTime = ethers.BigNumber.from(Math.floor(Date.now() / 1000));

      contract.status = startTimestamp.lt(currentTime)
        ? ContractStatus.Sale
        : ContractStatus.Published;
      await contract.save();
      return true;
    }

    return false;
  }

  // 處理 Published 狀態
  private async handlePublishedStatus(
    contract: StudioContract,
  ): Promise<boolean> {
    if (new Date() > contract.drops[0].startTime) {
      contract.status = ContractStatus.Sale;
      await contract.save();
      return true;
    }
    return false;
  }

  // 處理 Sale 狀態
  private async handleSaleStatus(contract: StudioContract): Promise<boolean> {
    const onChainTotalSupply = await this.gatewayService.getOnchainTotalSupply(
      contract.chainId.toString() as ChainId,
      contract.address,
    );

    const studioTotalSupply = +contract.drops[contract.drops.length - 1].amount;

    if (+onChainTotalSupply === +studioTotalSupply) {
      contract.status = ContractStatus.SaleEnd;
      await contract.save();
      return true;
    }

    const dropCondition = await this.fetchDropCondition(
      contract,
      (contract.drops.length - 1).toString(),
    );

    if (
      dropCondition?.startTimestamp?.toString() !== '0' &&
      dropCondition?.quantityLimitPerWallet?.toString() === '0' &&
      dropCondition?.merkleRoot ===
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      contract.status = ContractStatus.SaleEnd;
      await contract.save();
      return true;
    }

    return false;
  }

  // 通用函數：獲取 NFT 數據
  private async fetchNftData(contract: StudioContract): Promise<any> {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 8000),
      );

      const nftDataPromise =
        this.gatewayService.getNftByTokenIdByContractOnChain(
          contract.chainId.toString() as ChainId,
          contract.address,
          '0',
        );

      return await Promise.race([nftDataPromise, timeout]);
    } catch {
      return null;
    }
  }

  // 通用函數：獲取 Drop 條件
  private async fetchDropCondition(
    contract: StudioContract,
    dropId: string,
    tokenId?: string,
  ): Promise<any> {
    try {
      return await this.gatewayService.getStudioContractGetClaimConditionById(
        contract.chainId.toString() as ChainId,
        contract.address,
        dropId,
        tokenId,
      );
    } catch {
      return null;
    }
  }

  async updateStudioContractEndSale(contract: StudioContract) {
    if (!contract) {
      return { success: false, debug: 'No contract' };
    }
    if (!contract?.status) {
      return { success: false, debug: 'No status' };
    }
    if (!contract.drops) {
      return { success: false, debug: 'No drops' };
    }

    // 如果是銷售中要檢查是不是已經結束銷售
    if (
      contract.status === ContractStatus.Sale ||
      contract.status === ContractStatus.Published
    ) {
      // 檢查 onChainTotalSupply === studioTotalSupply，代表銷售結束
      const address = contract.address;
      const onChainTotalSupply =
        await this.gatewayService.getOnchainTotalSupply(
          contract.chainId.toString() as ChainId,
          address,
        );
      const studioTotalSupply =
        +contract.drops[contract.drops.length - 1].amount;

      if (+onChainTotalSupply === +studioTotalSupply) {
        contract.status = ContractStatus.SaleEnd;
        contract.save();
        return { success: true, status: contract.status };
      }

      // 檢查 dropCondition 被設定成有開始時間但沒有 quantityLimitPerWallet，代表已經提前結束銷售
      try {
        const dropCondition =
          await this.gatewayService.getStudioContractGetClaimConditionById(
            contract.chainId.toString() as ChainId,
            address,
            (contract.drops.length - 1).toString(),
          );

        if (
          dropCondition?.startTimestamp?.toString() != '0' &&
          dropCondition?.quantityLimitPerWallet?.toString() == '0' &&
          dropCondition?.merkleRoot ==
          '0x0000000000000000000000000000000000000000000000000000000000000000'
        ) {
          contract.status = ContractStatus.SaleEnd;
          contract.save();
          return { success: true, status: contract.status };
        }
      } catch (e) {
        return { success: false, status: contract.status, debug: e.message };
      }
    }

    return { success: false, debug: 'No action' };
  }

  @Cacheable({
    key: 'studio:contract:chainIdAndAddress',
    seconds: 20,
  })
  async getContractByChainIdAndAddress(chainId: string, address: string) {
    return await this.studioContractRepository.findOne({
      attributes: [
        'id',
        'name',
        'chainId',
        'address',
        'ownerAccountId',
        'status',
        'canRevealAt',
        'isBlindbox',
        'isCentralizedMetadata',
      ],
      where: {
        chainId: chainId,
        address: address,
      },
      include: [
        {
          model: StudioContractDrop,
          as: 'drops',
        },
      ],
    });
  }

  async createContractDraft(accountId: string, contract: ContractDraftDTO) {
    const contractDraft = await this.studioContractRepository.create({
      ownerAccountId: accountId,
      name: contract.name,
      symbol: contract.symbol,
      chainId: contract.chainId,
      schemaName: contract.schemaName,
      logoImageUrl: contract.logoImageUrl,
      status: ContractStatus.Unpublished,
      dropUrls: contract.logoImageUrl ? [contract.logoImageUrl] : null,
      mode: contract.mode,
    });
    return contractDraft;
  }

  // TODO: to be deprecated
  generateBlindboxKey(): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';

    for (let i = 0; i < 64; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      const randomChar = characters[randomIndex];
      code += randomChar;
    }

    return code;
  }

  async getContractDraft(contractId: string) {
    return await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
      include: [
        {
          model: StudioContractDrop,
          as: 'drops',
          include: [
            {
              model: Currency,
              attributes: ['address', 'symbol', 'decimals'],
            },
          ],
        },
      ],
    });
  }

  async updateContractDraft(contractId: string, dto: UpdateContractDraftDTO) {
    if (dto.isCreatorFee && dto.creatorFeeAddress === '') {
      throw new HttpException(
        'Creator fee address is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const res = await this.studioContractRepository.update(
      { ...dto, creatorFee: dto.isCreatorFee ? 0.5 : 0 },
      {
        where: { id: contractId },
      },
    );
    return { updateCount: res[0] };
  }

  async updateContractBlindboxInfo(
    contractId: string,
    blindBox: ContractBlindboxDTO,
  ) {
    const contractDraft = await this.studioContractRepository.update(
      {
        isBlindbox: blindBox.isBlindbox,
        blindboxUrl: blindBox.blindboxUrl,
        blindboxName: blindBox.blindboxName,
        blindboxDescription: blindBox.blindboxDescription,
        blindboxTraits: blindBox.blindboxTraits,
      },
      {
        where: {
          id: contractId,
        },
      },
    );
    const contract = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
    });
    return contract;
  }

  async createContractDropStage(contractId: string, drop: ContractDropDTO) {
    const contractDraft = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
    });

    if (
      !drop.allowlist.startsWith(StudioService.ALLOW_LIST_HEADER_PREFIX) &&
      drop.allowlist !== ''
    ) {
      throw new HttpException(
        'Invalid allowlist format',
        HttpStatus.BAD_REQUEST,
      );
    }

    let merkleTree;
    let merkleRoot;
    let merkleProof;
    if (drop.allowlist.startsWith(StudioService.ALLOW_LIST_HEADER_PREFIX)) {
      // 解析 csv
      const allowlist = await this.parseAllowlistCsvFromString(drop.allowlist);

      if (allowlist.length > 0) {
        const allowlistEntries = allowlist.map((entry) => ({
          address: entry.address,
          maxClaimable: entry.maxClaimable,
          price: entry.price,
          currencyAddress: drop.currencyAddress ?? ZeroAddress,
        }));
        const { root, tree, proofs } = generateMerkleTree(allowlistEntries);

        merkleTree = tree;
        merkleRoot = root;
        merkleProof = proofs;
      }
    }

    let currencyId = '';
    if (drop.currencyAddress) {
      const currency = await this.currencyRepository.findOne({
        attributes: ['id', 'address', 'symbol'],
        where: {
          address: drop.currencyAddress.toLowerCase(),
        },
        include: [
          {
            attributes: ['chainId'],
            model: Blockchain,
            where: {
              chainId: contractDraft.chainId,
            },
          },
        ],
      });

      if (!currency) {
        throw new HttpException('Invalid currency', HttpStatus.BAD_REQUEST);
      }

      currencyId = currency.id;
    } else {
      const currency = await this.currencyRepository.findOne({
        attributes: ['id', 'address', 'symbol'],
        where: {
          isNative: true,
        },
        include: [
          {
            attributes: ['chainId'],
            model: Blockchain,
            where: {
              chainId: contractDraft.chainId,
            },
          },
        ],
      });

      if (!currency) {
        throw new HttpException('Invalid currency', HttpStatus.BAD_REQUEST);
      }

      currencyId = currency?.id;
    }

    const contractDrop = await this.studioContractDropRepository.create({
      studioContractId: contractId,
      allowlist: drop.allowlist,
      amount: drop.amount,
      price: drop.price,
      startTime: drop.startTime,
      limitPerWallet: drop.limitPerWallet,
      currencyId,
      merkleRoot,
      merkleProof,
      metadata: drop.metadata,
      tokenId: drop.tokenId,
    });

    return contractDraft;
  }

  async updateContractDropStage(
    contractId: string,
    drop: ContractDropDTO,
    dropId: string,
  ) {
    const contractDraft = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
    });

    const contractDrop = await this.studioContractDropRepository.findOne({
      where: {
        studioContractId: contractId,
        id: dropId,
      },
    });

    if (!contractDrop) {
      throw new HttpException('Drop not found', HttpStatus.NOT_FOUND);
    }

    if (
      !drop.allowlist.startsWith(StudioService.ALLOW_LIST_HEADER_PREFIX) &&
      drop.allowlist !== ''
    ) {
      throw new HttpException(
        'Invalid allowlist format',
        HttpStatus.BAD_REQUEST,
      );
    }

    let merkleTree: MerkleTree;
    let merkleRoot: string;
    let merkleProof;
    if (drop.allowlist.startsWith(StudioService.ALLOW_LIST_HEADER_PREFIX)) {
      // 解析 csv
      const allowlist = await this.parseAllowlistCsvFromString(drop.allowlist);

      if (allowlist.length > 0) {
        const allowlistEntries = allowlist.map((entry) => ({
          address: entry.address,
          maxClaimable: entry.maxClaimable,
          price: entry.price,
          currencyAddress: drop.currencyAddress ?? ZeroAddress,
        }));
        const { root, tree, proofs } = generateMerkleTree(allowlistEntries);

        merkleTree = tree;
        merkleRoot = root;
        merkleProof = proofs;
      }
    }

    let currencyId = '';
    if (drop.currencyAddress) {
      const currency = await this.currencyRepository.findOne({
        attributes: ['id', 'address', 'symbol'],
        where: {
          address: drop.currencyAddress.toLowerCase(),
        },
        include: [
          {
            attributes: ['chainId'],
            model: Blockchain,
            where: {
              chainId: contractDraft.chainId,
            },
          },
        ],
      });

      if (!currency) {
        throw new HttpException('Invalid currency', HttpStatus.BAD_REQUEST);
      }

      currencyId = currency.id;
    } else {
      const currency = await this.currencyRepository.findOne({
        attributes: ['id', 'address', 'symbol'],
        where: {
          isNative: true,
        },
        include: [
          {
            attributes: ['chainId'],
            model: Blockchain,
            where: {
              chainId: contractDraft.chainId,
            },
          },
        ],
      });

      if (!currency) {
        throw new HttpException('Invalid currency', HttpStatus.BAD_REQUEST);
      }

      currencyId = currency?.id;
    }

    contractDrop.allowlist = drop.allowlist;
    contractDrop.amount = drop.amount;
    contractDrop.price = drop.price;
    contractDrop.startTime = drop.startTime;
    contractDrop.limitPerWallet = drop.limitPerWallet;
    contractDrop.merkleRoot = merkleRoot;
    contractDrop.merkleProof = merkleProof;
    contractDrop.currencyId = currencyId;
    contractDrop.metadata = drop.metadata;
    contractDrop.tokenId = drop.tokenId;
    await contractDrop.save();

    return contractDraft;
  }

  async deleteContractDropStage(contractId: string, dropId: string) {
    const contract = await this.studioContractRepository.findOne({
      attributes: ['id', 'name', 'status'],
      where: {
        id: contractId,
      },
    });

    if (!contract) {
      throw new HttpException('Contract not found', HttpStatus.NOT_FOUND);
    }

    // if (contract.status !== ContractStatus.Unpublished) {
    //   throw new HttpException(
    //     'Contract is published, cannot be deleted',
    //     HttpStatus.FORBIDDEN,
    //   );
    // }

    const drop = await this.studioContractDropRepository.findOne({
      where: {
        id: dropId,
      },
    });

    const dropCount = await this.studioContractDropRepository.count({
      where: {
        studioContractId: contractId,
      },
    });

    if (dropCount === 1) {
      throw new HttpException(
        'Cannot delete public stage',
        HttpStatus.FORBIDDEN,
      );
    }

    const deletedDrop = await this.studioContractDropRepository.destroy({
      where: {
        id: dropId,
      },
    });

    return {
      id: contractId,
      name: contract.name,
      deletedDrop,
    };
  }

  async getContractDropStage(contractId: string) {
    return await this.studioContractDropRepository.findAll({
      where: {
        studioContractId: contractId,
      },
      include: [
        {
          model: Currency,
          attributes: ['address', 'symbol', 'decimals'],
        },
      ],
      order: [['startTime', 'ASC']],
    });
  }

  @Cacheable({
    key: 'studio:allowlist',
    seconds: 120,
  })
  async getContractAllowlist(
    contractId: string,
    dropId: string,
    tokenId?: string,
  ) {
    const contractDrop = await this.studioContractDropRepository.findOne({
      attributes: ['allowlist'],
      where: {
        studioContractId: contractId, // contractId
        id: dropId,
        ...(tokenId ? { tokenId } : {}),
      },
    });

    if (!contractDrop) {
      throw new HttpException('Drop not found', HttpStatus.NOT_FOUND);
    }

    if (!contractDrop.allowlist) {
      return [];
    }

    const allowlist = await this.parseAllowlistCsvFromString(
      contractDrop.allowlist,
    );

    return allowlist;
  }

  async getUserProofs(contractId: string, dropId: string, address: string) {
    const proofs = (
      (await this.sequelizeInstance.query(
        `
SELECT merkle_proof -> lower(:address) as proofs
FROM studio_contract_drop
WHERE studio_contract_id = :contractId AND id = :dropId
    `,
        {
          replacements: {
            address,
            contractId,
            dropId,
          },
          type: QueryTypes.SELECT,
        },
      )) as any
    )[0]?.proofs;
    return proofs;
  }

  async getUserWhitelist(
    contractId: string,
    dropId: string,
    address: string,
    tokenId?: string,
  ) {
    // TODO: 活動結束後刪除
    // Id 改成活動的 Id
    if (contractId === 'ad2624e0-baaa-45df-b5a0-386c8eef381a') {
      return this.getEvermoonWhitelist(dropId, address);
    }

    const proofs = await this.getUserProofs(contractId, dropId, address);

    if (!proofs) {
      return {
        isWhitelisted: false,
      };
    }

    const contractDropAllowList = await this.getContractAllowlist(
      contractId,
      dropId,
      tokenId,
    );

    if (contractDropAllowList.length === 0) {
      return {
        isWhitelisted: false,
      };
    }

    const user = address.toLowerCase();

    let index = -1;
    contractDropAllowList.forEach((item, i) => {
      if (item.address.toLowerCase() === user) {
        index = i;
      }
    });
    if (index === -1) {
      return {
        isWhitelisted: false,
      };
    }

    return {
      isWhitelisted: true,
      address: contractDropAllowList[index]?.address,
      limitAmount: contractDropAllowList[index]?.maxClaimable,
      value: contractDropAllowList[index]?.price,
      merkleProof: proofs,
      tokenId,
    };
  }

  /**
   * Evermoon Campaign
   */
  getEvermoonWhitelist(dropId: string, walletAddress: string) {
    const result: {
      isWhitelisted: boolean;
      address: string;
      limitAmount: string;
      value: string;
      merkleProof: string[];
      tokenId: string;
    } = {
      isWhitelisted: false,
      address: '',
      limitAmount: '0',
      value: '0',
      merkleProof: [],
      tokenId: '',
    };

    if (dropId !== '0d2624e0-baaa-45df-b5a0-386c8eef381a') {
      return result;
    }

    const proofs = this.addressToProofsMap.get(walletAddress.toLowerCase());
    if (!proofs) {
      return result;
    }

    result.isWhitelisted = true;
    result.address = walletAddress.toLowerCase();
    result.limitAmount = '1';
    result.value = '0';
    result.merkleProof = proofs;
    result.tokenId = '0';

    return result;
  }

  // async getContractIdByAssetId(assetId: string) {
  //   const asset = await this.studioContractAssetRepository.findOne({
  //     where: {
  //       id: assetId,
  //     },
  //   });

  //   if (!asset) {
  //     throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
  //   }

  //   return asset.studioContractId;
  // }

  async verifyContractOwner(accountId: string, contractId: string) {
    const contract = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
    });

    if (!contract) {
      throw new HttpException('Contract not found', HttpStatus.NOT_FOUND);
    }

    if (contract.ownerAccountId !== accountId) {
      throw new HttpException(
        'You are not the owner of this contract',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  async linkDeployedContract(contractId: string, txHash: string) {
    const studioContract = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
    });

    const deployTx = await this.gatewayService.waitForTransaction(
      studioContract.chainId,
      txHash,
      RpcEnd.default,
      this.gatewayService.getConfirmsToWaitBlock(studioContract.chainId, 4),
    );
    const logs = deployTx.logs;

    const ProxyDeployed =
      '0x9e0862c4ebff2150fbbfd3f8547483f55bdec0c34fd977d3fccaa55d6c4ce784';

    let success = false;
    let contractAddress = '';
    const chainId = studioContract.chainId;

    const isCreatorFee = studioContract.isCreatorFee;
    const creatorFee = studioContract.creatorFee;
    const creatorFeeAddress = studioContract.creatorFeeAddress;

    // 代表被三明治攻擊夾掉發出的交易
    if (
      studioContract.chainId == 137 &&
      deployTx.status == 0 &&
      deployTx.logs[0].topics[0] ==
      '0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63'
    ) {
      const chainId = studioContract.chainId;
      const provider =
        this.rpcHandlerService.createStaticJsonRpcProvider(chainId);

      const saWallet = await this.walletRepository.findOne({
        where: {
          accountId: studioContract.ownerAccountId,
          provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
        },
      });

      const factoryAddress = '0xe62fC391356bD805b10F19d06b4Ed79DD43b644D';
      const factoryContract = new ethers.Contract(
        factoryAddress,
        FACTORY_CONTRACT_ABI,
        provider,
      );
      const registryAddress = await factoryContract.registry();

      const registryContract = new ethers.Contract(
        registryAddress,
        REGISTRY_CONTRACT_ABI,
        provider,
      );
      const count = await registryContract.count(saWallet.address);

      const addressPredictorAddress =
        '0x2eBc48C6BfEe80FB2AA0512d6cb07c5d7A9ceae4';
      const addressPredictorContract = new ethers.Contract(
        addressPredictorAddress,
        ADDRESS_PREDICTOR_ABI,
        provider,
      );

      const dropAddress = '0x0DcC91e1980d5F48e4C5fb85b87dEC4369e67F6e';
      contractAddress = await addressPredictorContract.predictProxyAddress(
        +count.toString() - 1,
        dropAddress,
        factoryAddress,
        saWallet.address,
      );

      // console.log({
      //   factoryAddress,
      //   registryAddress,
      //   count: +count.toString() - 1,
      //   addressPredictorAddress,
      //   dropAddress,
      //   walletAddress: saWallet.address,
      //   contractAddress,
      // });

      await this.studioContractRepository.update(
        {
          address: contractAddress.toLowerCase(),
        },
        {
          where: {
            id: contractId,
          },
        },
      );
      success = true;

      const chainShortName = await this.libsDao.findChainShortNameByChainId(
        studioContract.chainId,
      );

      const collection = await this.collectionDao.findOrCreateCollection({
        chainShortName,
        contractAddress,
      });

      if (!collection) {
        throw SimpleException.fail({ debug: 'Failed to create collection' });
      }

      // 把 chainId+address+'LTTM' 轉成 bytes 再轉成 hex 再用成雜湊
      const key = studioContract.chainId + contractAddress + 'LTTM';
      const hex = '0x' + Buffer.from(key).toString('hex');
      const blindboxKey = ethers.utils.sha256(hex);

      studioContract.blindboxKey = blindboxKey;
      studioContract.save();

      collection.logoImageUrl = studioContract.logoImageUrl;
      collection.isCreatorFee = isCreatorFee;
      collection.creatorFee = creatorFee;
      collection.creatorFeeAddress = creatorFeeAddress;
      collection.save();

      success = true;

      return {
        success,
        contractAddress,
      };
    }

    for (const log of logs) {
      if (log.topics[0] === ProxyDeployed) {
        const address = '0x' + log.data.slice(26);
        await this.studioContractRepository.update(
          {
            address: address.toLowerCase(),
          },
          {
            where: {
              id: contractId,
            },
          },
        );
        success = true;
        contractAddress = address;

        const chainShortName = await this.libsDao.findChainShortNameByChainId(
          studioContract.chainId,
        );

        const collection = await this.collectionDao.findOrCreateCollection({
          chainShortName,
          contractAddress: address,
        });

        if (!collection) {
          throw SimpleException.fail({ debug: 'Failed to create collection' });
        }

        // 把 chainId+address+'LTTM' 轉成 bytes 再轉成 hex 再用成雜湊
        const key = studioContract.chainId + contractAddress + 'LTTM';
        const hex = '0x' + Buffer.from(key).toString('hex');
        const blindboxKey = ethers.utils.sha256(hex);

        studioContract.blindboxKey = blindboxKey;
        studioContract.save();

        collection.logoImageUrl = studioContract.logoImageUrl;
        collection.isCreatorFee = isCreatorFee;
        collection.creatorFee = creatorFee;
        collection.creatorFeeAddress = creatorFeeAddress;
        collection.save();

        break;
      }
    }

    //TODO: Biru campaign 2025/02, remove this before campaign end
    await this.biruCollectionRepository.create({
      chainId: studioContract.chainId,
      address: contractAddress,
      extraPoint: 0,
      eventSync: false,
    });

    return {
      success,
      contractAddress,
    };
  }

  async deleteContractDraft(contractId: string) {
    const contract = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
    });

    if (!contract) {
      throw new HttpException('Contract not found', HttpStatus.NOT_FOUND);
    }

    if (contract.status !== ContractStatus.Unpublished) {
      throw new HttpException(
        'Contract is published, cannot be deleted',
        HttpStatus.FORBIDDEN,
      );
    }

    const deletedDrop = await this.studioContractDropRepository.destroy({
      where: {
        studioContractId: contractId,
      },
    });

    const deletedAssets =
      (
        await this.studioUploadService.deleteUploadContractItem(contractId, {
          all: true,
        })
      ).deletedCount || 0;

    const deletedContract = await this.studioContractRepository.destroy({
      where: {
        id: contractId,
      },
    });

    return {
      id: contractId,
      name: contract.name,
      deletedDrop,
      deletedAssets,
      deletedContract,
    };
  }

  async updateDropVisibility(contractId: string, visible: boolean) {
    const contract = await this.studioContractRepository.findOne({
      attributes: ['id', 'address', 'chainId', 'isVisible'],
      where: {
        id: contractId,
      },
    });

    if (!contract) {
      throw new HttpException('Contract not found', HttpStatus.NOT_FOUND);
    }

    const collection = await this.collectionRepository.findOne({
      attributes: ['id', 'contractAddress', 'chainId', 'isDrop'],
      where: {
        contractAddress: contract.address,
        chainId: contract.chainId,
      },
    });

    contract.isVisible = visible;
    contract.save();

    collection.isDrop = visible;
    collection.save();

    return contract;
  }

  async getContractPostPublish(contractId: string, force?: boolean) {
    // contract
    const contract = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
      include: [
        {
          model: StudioContractDrop,
          as: 'drops',
          include: [
            {
              model: Currency,
              attributes: ['address', 'symbol', 'decimals'],
            },
          ],
        },
      ],
    });

    // collection
    const collection = await this.collectionRepository.findOne({
      where: {
        contractAddress: contract.address,
        chainId: contract.chainId,
      },
    });

    if (force) {
      const updatedEndSale = await this.updateStudioContractEndSale(contract);
      if (updatedEndSale.success && contract.status !== updatedEndSale.status) {
        contract.status = updatedEndSale.status;
      }
    }

    try {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 2000); // 設定2秒超時
      });

      const nftDataPromise =
        this.gatewayService.getNftByTokenIdByContractOnChain(
          contract.chainId.toString() as ChainId,
          contract.address,
          '0',
        );

      // 使用 Promise.race 來實現超時控制
      const nftData: any = await Promise.race([nftDataPromise, timeout]);

      const isRevealed =
        nftData.tokenUri?.substring(0, 53) !==
        contract.blindboxIpfsUri?.substring(0, 53);

      if (isRevealed) {
        contract.isRevealed = true;
        await contract.save(); // 記得加上 await
      }
    } catch (e) {
      null;
    }

    // 檢查 dropCondition 被設定成有開始時間但沒有 maxClaimableSupply，代表已經提前結束銷售
    try {
      const dropCondition =
        await this.gatewayService.getStudioContractGetClaimConditionById(
          contract.chainId.toString() as ChainId,
          contract.address,
          '0',
        );

      if (
        dropCondition?.startTimestamp?.toString() != '0' &&
        dropCondition?.maxClaimableSupply?.toString() == '0'
      ) {
        contract.status = ContractStatus.SaleEnd;
        contract.save();
      }
    } catch (e) {
      null;
    }

    return {
      contract,
      collection,
    };
  }

  async getSalesOverview(contractId: string) {
    const contract = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
    });

    const collection = await this.collectionRepository.findOne({
      where: {
        contractAddress: contract.address,
        chainId: contract.chainId,
      },
    });

    if (!collection) {
      throw SimpleException.fail({ debug: 'Collection not found' });
    }

    const [owner, minted] = await Promise.all([
      this.collectionService.getCacheTotalOwnersByCollectionId(
        collection.id,
        true,
      ),
      this.collectionService.getCacheTotalItemsByCollectionId(
        collection.id,
        true,
      ),
    ]);

    return {
      totalSales: 0,
      owner: +owner,
      minted: +minted,
    };
  }

  async parseAllowlistCsvFromString(
    csvString,
  ): Promise<{ address: string; maxClaimable: string; price: string }[]> {
    return new Promise((resolve, reject) => {
      const results = [];

      // 將字串轉換為可讀流
      const stream = new Readable({
        read() {
          this.push(csvString);
          this.push(null); // 流的結束
        },
      });

      // 使用 fast-csv 解析
      stream
        .pipe(
          csv.parse({
            headers: ['address', 'maxClaimable', 'price'],
            renameHeaders: true,
          }),
        )
        .on('data', (row) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  async getLaunchpadContracts({
    addresses,
    chainId,
    limit,
    page,
  }: {
    addresses: string[];
    chainId?: ChainId;
    limit: number;
    page: number;
  }) {
    if (!addresses || addresses.length === 0) {
      return {
        count: 0,
        rows: [],
      };
    }

    addresses = addresses.map((address) => address.toLowerCase());

    const [launchpadStudioContracts, count] = await Promise.all([
      (await this.sequelizeInstance.query(
        `
        WITH studio_contract_published_and_sale AS (
          SELECT id, name, chain_id, status, drop_urls, address, created_at, is_launchpad_hidden, launchpad_rank, schema_name
          FROM studio_contract
          WHERE (status != 'Publishing' AND status != 'Unpublished')
            AND address IN (:addresses)
            ${chainId ? 'AND chain_id = :chainId' : ''}
        ),
        studio_public_drop AS (
            SELECT DISTINCT ON (studio_contract_id) id, studio_contract_id, price, amount, currency_id, token_id
            FROM studio_contract_drop
            ORDER BY studio_contract_id, start_time DESC, amount DESC
        ),
        studio_first_drop AS (
            SELECT DISTINCT ON (studio_contract_id) id, studio_contract_id, start_time
            FROM studio_contract_drop
            ORDER BY studio_contract_id, start_time ASC
        )

        select
          studio_contract_published_and_sale.id,
          studio_contract_published_and_sale.name,
          studio_contract_published_and_sale.chain_id as "chainId",
          studio_contract_published_and_sale.status,
          studio_contract_published_and_sale.drop_urls as "dropUrls",
          studio_contract_published_and_sale.address,
          studio_contract_published_and_sale.schema_name as "schemaName",
          studio_first_drop.start_time as "startTime",
          studio_public_drop.price,
          studio_public_drop.amount as "maxSupply",
          studio_public_drop.token_id as "tokenId",
          encode(currency.address, 'escape') as "currencyAddress",
          currency.symbol as "currencySymbol",
          contract.total_supply as "totalSupply",
          collections.id as "collectionId",
          collections.contract_address as "collectionContractAddress",
          collections.banner_image_url as "collectionBannerImageUrl",
          collections.logo_image_url as "collectionLogoImageUrl",
          collections.name as "collectionName",
          collections.slug as "collectionSlug",
          collections.description as "collectionDescription",
          collections.is_verified as "collectionIsVerified",
          collections.chain_short_name as "collectionChainShortName",
          collections.is_minting as "collectionIsMinting",
          collections.is_drop as "collectionIsDrop"
        from studio_contract_published_and_sale
        left join studio_public_drop on studio_public_drop.studio_contract_id = studio_contract_published_and_sale.id
        left join studio_first_drop on studio_first_drop.studio_contract_id = studio_contract_published_and_sale.id
        left join contract on studio_contract_published_and_sale.address = encode(contract.address, 'escape')
          and studio_contract_published_and_sale.chain_id = contract.chain_id
        inner join collections on studio_contract_published_and_sale.address = collections.contract_address
          and studio_contract_published_and_sale.chain_id = collections.chain_id
          and collections.is_drop = true
        inner join currency on studio_public_drop.currency_id = currency.id
        ORDER BY 
          CASE 
              WHEN currency.symbol = 'ASTR' THEN 0  -- ASTR 排在最前
              ELSE 1 
          END,launchpad_rank, studio_first_drop.start_time DESC, studio_contract_published_and_sale.created_at
        limit :limit
        offset :offset
      `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            addresses,
            chainId,
            limit,
            offset: limit * (page - 1),
          },
        },
      )) as LaunchpadContracts[],

      (
        (await this.sequelizeInstance.query(
          `
        SELECT count(*)
        FROM studio_contract
        INNER JOIN collections ON studio_contract.address = collections.contract_address
          AND studio_contract.chain_id = collections.chain_id
          AND collections.is_drop = true
        WHERE
          (status != 'Publishing' AND status != 'Unpublished')
          AND address IN (:addresses)
          AND is_launchpad_hidden = false
            ${chainId ? 'AND studio_contract.chain_id = :chainId' : ''}
      `,
          {
            type: QueryTypes.SELECT,
            replacements: { chainId, addresses },
          },
        )) as any[]
      )[0].count as number,
    ]);

    const result = [];
    for (const contract of launchpadStudioContracts) {
      // 把 collections 的內容包到 collection:{} 裡面
      const collection = {
        id: contract.collectionId,
        contractAddress: contract.collectionContractAddress,
        bannerImageUrl: contract.collectionBannerImageUrl,
        logoImageUrl: contract.collectionLogoImageUrl,
        name: contract.collectionName,
        slug: contract.collectionSlug,
        description: contract.collectionDescription,
        isVerified: contract.collectionIsVerified,
        chainShortName: contract.collectionChainShortName,
        isMinting: contract.collectionIsMinting,
        isDrop: contract.collectionIsDrop,
      };
      result.push({
        id: contract.id,
        name: contract.name,
        chainId: contract.chainId,
        status: contract.status,
        dropUrls: contract.dropUrls,
        address: contract.address,
        schemaName: contract.schemaName,
        startTime: contract.startTime,
        price: contract.price,
        priceSymbol: contract.currencySymbol,
        currencyAddress: contract.currencyAddress,
        maxSupply: contract.maxSupply,
        totalSupply: contract.totalSupply,
        tokenId: contract.tokenId,
        collection,
      });
    }

    return {
      count: +count,
      rows: result,
    };
  }

  async getLaunchpadCurrentContracts(getLaunchpadListDTO: GetLaunchpadListDTO) {
    const [launchpadStudioContracts, count] = await Promise.all([
      (await this.sequelizeInstance.query(
        `
        WITH studio_contract_published_and_sale AS (
          SELECT id, name, chain_id, status, drop_urls, address, created_at, is_launchpad_hidden, launchpad_rank, schema_name
          FROM studio_contract
          WHERE (status = 'Published' OR status = 'Sale')
            AND is_launchpad_hidden = false
            ${getLaunchpadListDTO.chainId ? 'AND chain_id = :chainId' : ''}
        ),
        studio_public_drop AS (
            SELECT DISTINCT ON (studio_contract_id) id, studio_contract_id, price, amount, currency_id, token_id
            FROM studio_contract_drop
            ORDER BY studio_contract_id, start_time DESC, amount DESC
        ),
        studio_first_drop AS (
            SELECT DISTINCT ON (studio_contract_id) id, studio_contract_id, start_time
            FROM studio_contract_drop
            ORDER BY studio_contract_id, start_time ASC
        )

        select
          studio_contract_published_and_sale.id,
          studio_contract_published_and_sale.name,
          studio_contract_published_and_sale.chain_id as "chainId",
          studio_contract_published_and_sale.status,
          studio_contract_published_and_sale.drop_urls as "dropUrls",
          studio_contract_published_and_sale.address,
          studio_contract_published_and_sale.schema_name as "schemaName",
          studio_first_drop.start_time as "startTime",
          studio_public_drop.price,
          studio_public_drop.amount as "maxSupply",
          studio_public_drop.token_id as "tokenId",
          encode(currency.address, 'escape') as "currencyAddress",
          currency.symbol as "currencySymbol",
          contract.total_supply as "totalSupply",
          collections.id as "collectionId",
          collections.contract_address as "collectionContractAddress",
          collections.banner_image_url as "collectionBannerImageUrl",
          collections.logo_image_url as "collectionLogoImageUrl",
          collections.name as "collectionName",
          collections.slug as "collectionSlug",
          collections.description as "collectionDescription",
          collections.is_verified as "collectionIsVerified",
          collections.chain_short_name as "collectionChainShortName",
          collections.is_minting as "collectionIsMinting",
          collections.is_drop as "collectionIsDrop"
        from studio_contract_published_and_sale
        left join studio_public_drop on studio_public_drop.studio_contract_id = studio_contract_published_and_sale.id
        left join studio_first_drop on studio_first_drop.studio_contract_id = studio_contract_published_and_sale.id
        left join contract on studio_contract_published_and_sale.address = encode(contract.address, 'escape')
          and studio_contract_published_and_sale.chain_id = contract.chain_id
        inner join collections on studio_contract_published_and_sale.address = collections.contract_address
          and studio_contract_published_and_sale.chain_id = collections.chain_id
          and collections.is_drop = true
          ${typeof getLaunchpadListDTO.isVerified === 'boolean' ? `AND collections.is_verified = ${getLaunchpadListDTO.isVerified}` : ''}
        inner join currency on studio_public_drop.currency_id = currency.id
        ORDER BY
          launchpad_rank NULLS LAST,
          CASE 
              WHEN currency.symbol = 'ASTR' THEN 0  -- ASTR 排在最前
              ELSE 1 
          END, studio_first_drop.start_time DESC, studio_contract_published_and_sale.created_at
        limit :limit
        offset :offset
      `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            chainId: getLaunchpadListDTO.chainId,
            limit: getLaunchpadListDTO.limit,
            offset: getLaunchpadListDTO.limit * (getLaunchpadListDTO.page - 1),
          },
        },
      )) as LaunchpadContracts[],

      (
        (await this.sequelizeInstance.query(
          `
        SELECT count(*)
        FROM studio_contract
        INNER JOIN collections ON studio_contract.address = collections.contract_address
          AND studio_contract.chain_id = collections.chain_id
          AND collections.is_drop = true
          ${typeof getLaunchpadListDTO.isVerified === 'boolean' ? `AND collections.is_verified = ${getLaunchpadListDTO.isVerified}` : ''}
        WHERE (status = 'Published' OR status = 'Sale')
          AND is_launchpad_hidden = false
            ${getLaunchpadListDTO.chainId ? 'AND studio_contract.chain_id = :chainId' : ''}
      `,
          {
            type: QueryTypes.SELECT,
            replacements: { chainId: getLaunchpadListDTO.chainId },
          },
        )) as any[]
      )[0].count as number,
    ]);

    const result = [];
    for (const contract of launchpadStudioContracts) {
      // 把 collections 的內容包到 collection:{} 裡面
      const collection = {
        id: contract.collectionId,
        contractAddress: contract.collectionContractAddress,
        bannerImageUrl: contract.collectionBannerImageUrl,
        logoImageUrl: contract.collectionLogoImageUrl,
        name: contract.collectionName,
        slug: contract.collectionSlug,
        description: contract.collectionDescription,
        isVerified: contract.collectionIsVerified,
        chainShortName: contract.collectionChainShortName,
        isMinting: contract.collectionIsMinting,
        isDrop: contract.collectionIsDrop,
      };
      result.push({
        id: contract.id,
        name: contract.name,
        chainId: contract.chainId,
        status: contract.status,
        dropUrls: contract.dropUrls,
        address: contract.address,
        schemaName: contract.schemaName,
        startTime: contract.startTime,
        price: contract.price,
        priceSymbol: contract.currencySymbol,
        currencyAddress: contract.currencyAddress,
        maxSupply: contract.maxSupply,
        totalSupply: contract.totalSupply,
        tokenId: contract.tokenId,
        collection,
      });
    }

    return {
      count: +count,
      rows: result,
    };
  }

  async getLaunchpadPastContracts(getLaunchpadListDTO: GetLaunchpadListDTO) {
    // TODO: studio_public_drop 跟 studio_first_drop 這兩個可以合併
    const [launchpadStudioContracts, count] = await Promise.all([
      (await this.sequelizeInstance.query(
        `
        WITH studio_contract_sale_end AS (
          SELECT id, name, chain_id, status, drop_urls, address, created_at, is_launchpad_hidden, launchpad_rank, schema_name
          FROM studio_contract
          WHERE (status = 'SaleEnd')
            AND is_launchpad_hidden = false
            ${getLaunchpadListDTO.chainId ? 'AND chain_id = :chainId' : ''}
        ), studio_public_drop AS (
            SELECT DISTINCT ON (studio_contract_id) id, studio_contract_id, price, amount, currency_id, token_id
            FROM studio_contract_drop
            ORDER BY studio_contract_id, start_time DESC, amount DESC
        ), studio_first_drop AS (
            SELECT DISTINCT ON (studio_contract_id) id, studio_contract_id, start_time
            FROM studio_contract_drop
            ORDER BY studio_contract_id, start_time ASC
        )

        select
          studio_contract_sale_end.id,
          studio_contract_sale_end.name,
          studio_contract_sale_end.chain_id as "chainId",
          studio_contract_sale_end.status,
          studio_contract_sale_end.drop_urls as "dropUrls",
          studio_contract_sale_end.address,
          studio_contract_sale_end.schema_name as "schemaName",
          studio_first_drop.start_time as "startTime",
          studio_public_drop.price,
          studio_public_drop.amount as "maxSupply",
          studio_public_drop.token_id as "tokenId",
          encode(currency.address, 'escape') as "currencyAddress",
          currency.symbol as "currencySymbol",
          contract.total_supply as "totalSupply",
          collections.id as "collectionId",
          collections.contract_address as "collectionContractAddress",
          collections.banner_image_url as "collectionBannerImageUrl",
          collections.logo_image_url as "collectionLogoImageUrl",
          collections.name as "collectionName",
          collections.slug as "collectionSlug",
          collections.description as "collectionDescription",
          collections.is_verified as "collectionIsVerified",
          collections.chain_short_name as "collectionChainShortName",
          collections.is_minting as "collectionIsMinting",
          collections.is_drop as "collectionIsDrop"
        from studio_contract_sale_end
        left join studio_public_drop on studio_public_drop.studio_contract_id = studio_contract_sale_end.id
        left join studio_first_drop on studio_first_drop.studio_contract_id = studio_contract_sale_end.id
        left join contract on studio_contract_sale_end.address = encode(contract.address, 'escape')
          and studio_contract_sale_end.chain_id = contract.chain_id
        inner join collections on studio_contract_sale_end.address = collections.contract_address
          and studio_contract_sale_end.chain_id = collections.chain_id
          and collections.is_drop = true
          ${typeof getLaunchpadListDTO.isVerified === 'boolean' ? `AND collections.is_verified = ${getLaunchpadListDTO.isVerified}` : ''}
        inner join currency on studio_public_drop.currency_id = currency.id
        ORDER BY studio_first_drop.start_time DESC, studio_contract_sale_end.created_at
        limit :limit
        offset :offset
      `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            chainId: getLaunchpadListDTO.chainId,
            limit: getLaunchpadListDTO.limit,
            offset: getLaunchpadListDTO.limit * (getLaunchpadListDTO.page - 1),
          },
        },
      )) as LaunchpadContracts[],

      (
        (await this.sequelizeInstance.query(
          `
        SELECT count(*)
        FROM studio_contract
        INNER JOIN collections ON studio_contract.address = collections.contract_address
          AND studio_contract.chain_id = collections.chain_id
          AND collections.is_drop = true
          ${typeof getLaunchpadListDTO.isVerified === 'boolean' ? `AND collections.is_verified = ${getLaunchpadListDTO.isVerified}` : ''}
        WHERE (status = 'SaleEnd')
          AND is_launchpad_hidden = false
          ${getLaunchpadListDTO.chainId ? 'AND studio_contract.chain_id = :chainId' : ''}
      `,
          {
            type: QueryTypes.SELECT,
            replacements: { chainId: getLaunchpadListDTO.chainId },
          },
        )) as any[]
      )[0].count as number,
    ]);

    const result = [];
    for (const contract of launchpadStudioContracts) {
      // 把 collections 的內容包到 collection:{} 裡面
      const collection = {
        id: contract.collectionId,
        contractAddress: contract.collectionContractAddress,
        bannerImageUrl: contract.collectionBannerImageUrl,
        logoImageUrl: contract.collectionLogoImageUrl,
        name: contract.collectionName,
        slug: contract.collectionSlug,
        description: contract.collectionDescription,
        isVerified: contract.collectionIsVerified,
        chainShortName: contract.collectionChainShortName,
        isMinting: contract.collectionIsMinting,
        isDrop: contract.collectionIsDrop,
      };

      result.push({
        id: contract.id,
        name: contract.name,
        chainId: contract.chainId,
        status: contract.status,
        dropUrls: contract.dropUrls,
        address: contract.address,
        schemaName: contract.schemaName,
        startTime: contract.startTime,
        price: contract.price,
        priceSymbol: contract.currencySymbol,
        currencyAddress: contract.currencyAddress,
        maxSupply: contract.maxSupply,
        totalSupply: contract.totalSupply,
        tokenId: contract.tokenId,
        collection,
      });
    }

    return {
      count: +count,
      rows: result,
    };
  }

  async setLaunchpadInfoByAdmin(
    contractId: string,
    launchpadInfoDTO: SetLaunchpadInfoByAdminDTO,
  ) {
    const contract = await this.studioContractRepository.findOne({
      where: {
        id: contractId,
      },
    });

    if (!contract) {
      throw new HttpException('Contract not found', HttpStatus.NOT_FOUND);
    }

    contract.isLaunchpadHidden = launchpadInfoDTO.isLaunchpadHidden;
    contract.launchpadRank = launchpadInfoDTO.launchpadRank;
    await contract.save();

    return contract;
  }

  /**
   * token centralized metadata
   */

  @Cacheable({
    key: 'contract:blindbox',
    seconds: 20,
  })
  async getContractBlindboxInfo(contractId: string) {
    const contract = await this.studioContractRepository.findOne({
      attributes: [
        'chainId',
        'address',
        'isBlindbox',
        'blindboxUrl',
        'blindboxName',
        'blindboxDescription',
        'blindboxTraits',
        'isCentralizedMetadata',
        'canRevealAt',
      ],
      where: {
        id: contractId,
      },
    });

    if (!contract) {
      return null;
    }

    return {
      chainId: contract.chainId,
      contractAddress: contract.address.toLowerCase(),
      isBlindbox: contract.isBlindbox,
      blindboxUrl: contract.blindboxUrl,
      blindboxName: contract.blindboxName,
      blindboxDescription: contract.blindboxDescription,
      blindboxTraits: contract.blindboxTraits,
      isCentralizedMetadata: contract.isCentralizedMetadata,
      canRevealAt: contract.canRevealAt,
    };
  }

  async getTokenMetadataFromCache(contractId: string, tokenId: string) {
    const cacheKey = `tokenMetadata:${contractId}:${tokenId}`;
    const cachedMetadata = await this.cacheService.getCache(cacheKey);

    if (cachedMetadata) {
      return cachedMetadata;
    }

    const metadata = await this.getTokenMetadata(contractId, tokenId);
    // 因為可能是沒 mint 的，所以cache設短一點避免被攻擊塞爆
    this.cacheService.setCache(cacheKey, metadata, 10);

    return metadata;
  }

  async updateTokenMetadataCache(contractId: string, tokenId: string) {
    const cacheKey = `tokenMetadata:${contractId}:${tokenId}`;
    const metadata = await this.getTokenMetadata(contractId, tokenId);
    await this.cacheService.setCache(cacheKey, metadata, 6000); // 100mins
    return metadata;
  }

  async getTokenMetadata(
    contractId: string,
    tokenId: string,
  ): Promise<{
    name: string;
    description: string;
    image: string;
    attributes: any;
  }> {
    try {
      const contract = await this.getContractBlindboxInfo(contractId);
      if (!contract) {
        throw new HttpException('Contract not found', HttpStatus.NOT_FOUND);
      }

      if (!contract.isCentralizedMetadata) {
        throw new HttpException(
          'Contract is not centralized metadata',
          HttpStatus.BAD_REQUEST,
        );
      }

      const metadata = await this.studioContractItemMetadataRepository.findOne({
        where: {
          studioContractId: contractId,
          tokenId,
        },
      });

      if (!metadata) {
        throw new HttpException(
          'Token metadata not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // 沒有 mint 的 token 也要檢查 on-chain 是否有 mint
      if (!metadata.isMinted) {
        // check on-chain isMinted
        const onChainOwner = await this.gatewayService.getOwnersByTokenOnChain(
          contract.chainId.toString() as ChainId,
          contract.contractAddress,
          tokenId,
        );

        // 如果 on-chain 沒有 owner，代表這個 token 還沒被 mint
        // 不能回傳 metadata，因為這樣會讓沒被 mint 的 blindbox token 被知道內容
        if (onChainOwner.length === 0) {
          throw new HttpException(
            'Token is not minted on-chain',
            HttpStatus.NOT_FOUND,
          );
        } else {
          metadata.isMinted = true;
          await metadata.save(); // 更新 isMinted 狀態
        }
      }

      if (contract.isBlindbox && !metadata.isRevealed) {
        return {
          name: metadata.blindboxName,
          description: metadata.blindboxDescription,
          image: metadata.blindboxImage,
          attributes: metadata.blindboxAttributes,
        };
      }

      return {
        name: metadata.name,
        description: metadata.description,
        attributes: metadata.attributes,
        image: metadata.image,
      };
    } catch (e) {
      throw SimpleException.fail({
        message: 'Failed to get token metadata',
        debug: e,
      });
    }
  }

  async getContractMintLog(dto: BiruMintLogPaginationDto) {
    const limit = dto.limit;
    const offset = (dto.page - 1) * dto.limit;
    const { rows, count } =
      await this.biruPointHistoryRepository.findAndCountAll({
        where: {
          contractAddress: dto.contractAddress,
          ...(dto.tokenId && { startTokenId: dto.tokenId }), // 有 startTokenId 才查
        },
        limit: limit,
        offset: offset,
        order: [['claimedAt', 'desc']],
      });
    return {
      items: rows,
      pagination: pagination(count, dto.page, limit),
    };
  }

  // 取得 Cache Key（tokenIds 排序並 join）
  getRevealChallengeCacheKey(
    walletAddress: string,
    contractAddress: string,
    tokenIds: string[],
  ) {
    return `revealChallenge:${walletAddress}:${contractAddress}:${tokenIds
      .map((t) => t.toString())
      .sort((a, b) => Number(a) - Number(b))
      .join(',')}`;
  }

  // 回傳完整 EIP-712 結構
  async generateRevealChallenge(input: RevealChallengeInput) {
    const walletAddress = input.walletAddress.toLowerCase();
    const contractAddress = input.contractAddress.toLowerCase();

    const nonce = uuidV4(randomBytes(128));
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const domain = {
      name: 'Lootex',
      version: '1',
      chainId: +input.chainId,
      verifyingContract: contractAddress,
    };
    const types = {
      RevealRequest: [
        { name: 'walletAddress', type: 'address' },
        { name: 'contractAddress', type: 'address' },
        { name: 'tokenIds', type: 'uint256[]' },
        { name: 'nonce', type: 'string' },
        { name: 'timestamp', type: 'string' },
      ],
    };
    const message = {
      walletAddress: walletAddress,
      contractAddress: contractAddress,
      tokenIds: input.tokenIds.map((id) => id.toString()),
      nonce,
      timestamp,
    };

    const cacheKey = this.getRevealChallengeCacheKey(
      walletAddress,
      contractAddress,
      input.tokenIds,
    );

    await this.cacheService.setCache(cacheKey, message, 60 * 10);

    return { domain, types, primaryType: 'RevealRequest', message };
  }

  // 驗證 Signature 與 Cache Message
  async verifyRevealChallenge(input: RevealChallengeInput, signature: string) {
    const walletAddress = input.walletAddress.toLowerCase();
    const contractAddress = input.contractAddress.toLowerCase();

    const cacheKey = this.getRevealChallengeCacheKey(
      walletAddress,
      contractAddress,
      input.tokenIds,
    );
    const cached: {
      id: string;
      walletAddress: string;
      contractAddress: string;
      tokenIds: string[];
      nonce: string;
      timestamp: string;
    } = await this.cacheService.getCache(cacheKey);
    if (!cached) {
      throw new HttpException(
        'Challenge expired or not found',
        HttpStatus.GONE,
      );
    }

    // 檢查過期時間（timestamp）是否過舊（optional，但更保險）
    const now = Math.floor(Date.now() / 1000);
    if (now - parseInt(cached.timestamp) > 600) {
      throw new HttpException('Challenge expired', HttpStatus.GONE);
    }

    const client = createPublicClient({
      chain: mainnet,
      transport: http(this.rpcHandlerService.getRpcUrl(+input.chainId)),
    });

    const domain = {
      name: 'Lootex',
      version: '1',
      chainId: +input.chainId,
      verifyingContract: contractAddress as `0x${string}`,
    };
    const types = {
      RevealRequest: [
        { name: 'walletAddress', type: 'address' },
        { name: 'contractAddress', type: 'address' },
        { name: 'tokenIds', type: 'uint256[]' },
        { name: 'nonce', type: 'string' },
        { name: 'timestamp', type: 'string' },
      ],
    };
    const message = {
      walletAddress: walletAddress,
      contractAddress: contractAddress,
      tokenIds: input.tokenIds.map(BigInt),
      nonce: cached.nonce,
      timestamp: cached.timestamp,
    };

    const isVerified = await client.verifyTypedData({
      address: walletAddress as `0x${string}`,
      domain,
      types,
      primaryType: 'RevealRequest',
      message,
      signature: signature as `0x${string}`,
    });

    if (!isVerified) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    // 上鏈拿 token owner

    const multicallData: ProxyContractRequest[] = input.tokenIds.map(
      (tokenId) => {
        const callData: callData[] = [
          {
            method: SupportedMethod.OWNEROF,
            param: [tokenId],
          },
        ];

        return {
          contractAddress: contractAddress,
          callData: callData,
          context: '',
        };
      },
    );

    const multicallResults = await this.rpcService.get(
      ChainMap[ChainIdMap[input.chainId]].RPC,
      multicallData,
    );
    for (const [index, result] of multicallResults.entries()) {
      if (result.value[0].success) {
        const owner: string = result.value[0].returnValues[0]?.toLowerCase();
        if (owner !== walletAddress) {
          throw new HttpException(
            `Token ID ${input.tokenIds[index]} is not owned by the wallet address`,
            HttpStatus.UNAUTHORIZED,
          );
        }
      }
    }

    // 更新 studio_contract_item_metadata 的 isRevealed
    const studioContract = await this.getContractByChainIdAndAddress(
      input.chainId,
      contractAddress,
    );

    if (!studioContract) {
      throw new HttpException('Contract not found', HttpStatus.NOT_FOUND);
    }

    if (!studioContract.isBlindbox) {
      throw new HttpException(
        'Contract is not a blindbox',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!studioContract.isCentralizedMetadata) {
      throw new HttpException(
        'Contract is not centralized metadata',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      !studioContract.canRevealAt ||
      new Date(studioContract.canRevealAt) > new Date()
    ) {
      throw new HttpException(
        'Contract cannot be revealed yet',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.studioContractItemMetadataRepository.update(
      {
        isRevealed: true,
        revealer: walletAddress,
        revealedAt: new Date(),
      },
      {
        where: {
          studioContractId: studioContract.id,
          tokenId: input.tokenIds,
        },
      },
    );

    // update asset
    input.tokenIds.forEach(async (tokenId) => {
      await this.updateTokenMetadataCache(studioContract.id, tokenId);
      this.assetDao.syncAssetOnChain({
        chainId: input.chainId as ChainId,
        contractAddress: contractAddress,
        tokenId: tokenId,
      });
    });

    const nftMetadata = await this.studioContractItemMetadataRepository.findAll(
      {
        attributes: ['tokenId', 'name', 'description', 'image', 'attributes'],
        where: {
          studioContractId: studioContract.id,
          tokenId: input.tokenIds,
        },
      },
    );

    return nftMetadata;
  }

  @Cacheable({
    key: 'walletHoldingBlindboxAssetsCount',
    seconds: 10,
  })
  async getWalletHoldingBlindboxAssetsByContract(
    walletAddress: string,
    contractAddress: string,
    chainId: ChainId,
    limit: number = 10,
    page: number = 1,
  ) {
    const studioContract = await this.studioContractRepository.findOne({
      attributes: ['id', 'isBlindbox'],
      where: {
        address: contractAddress,
        chainId,
      },
    });

    if (!studioContract || !studioContract.isBlindbox) {
      return [];
    }

    const contract = await this.contractRepository.findOne({
      attributes: ['id'],
      where: {
        address: contractAddress,
        chainId,
      },
    });

    if (!contract) {
      return [];
    }

    const collection = await this.collectionRepository.findOne({
      attributes: [
        'name',
        'slug',
        'contractAddress',
        'chainShortName',
        'chainId',
      ],
      where: {
        contractAddress,
        chainId,
      },
    });

    if (!collection) {
      return [];
    }

    const assets = (await this.sequelizeInstance.query(
      `
      SELECT
        asset.token_id AS "tokenId",
        asset.name AS "name",
        asset.description AS "description",
        asset.image_url AS "imageUrl",
        asset.traits AS "traits",
        asset.chain_id AS "chainId"
      FROM asset_as_eth_account
      JOIN asset ON asset_as_eth_account.asset_id = asset.id
      JOIN studio_contract_item_metadata ON studio_contract_item_metadata.token_id = asset.token_id
      WHERE
          asset_as_eth_account.contract_id = :contractId
        AND asset_as_eth_account.owner_address = :walletAddress
        AND asset_as_eth_account.quantity != '0'
        AND studio_contract_item_metadata.studio_contract_id = :studioContractId
        AND studio_contract_item_metadata.is_revealed = false
      LIMIT :limit
      OFFSET :offset
    `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          walletAddress: walletAddress.toLowerCase(),
          contractId: contract.id,
          studioContractId: studioContract.id,
          limit: limit,
          offset: limit * (page - 1),
        },
      },
    )) as any as {
      tokenId: string;
      name: string;
      description: string;
      imageUrl: string;
      traits: string;
      chainId: ChainId;
      // x_traits: string;
      // chain_id: string;
      // token_uri: string;
      // total_owners: string;
      // total_amount: string;
      // image_data: string;
    }[];

    if (!assets) {
      return null;
    }

    let count = 0;
    if (assets.length < limit) {
      count = assets.length;
      return { rows: assets, count };
    } else {
      count = await this.getWalletHoldingBlindboxAssetsCount(
        walletAddress,
        contractAddress,
        chainId,
      );

      return { rows: assets, count: count };
    }
  }

  @Cacheable({
    key: 'walletHoldingBlindboxAssetsCount',
    seconds: 10,
  })
  async getWalletHoldingBlindboxAssetsCount(
    walletAddress: string,
    contractAddress: string,
    chainId: ChainId,
  ): Promise<number> {
    const count = (
      await this.sequelizeInstance.query(
        `
      SELECT COUNT(*)
      FROM asset_as_eth_account
      JOIN asset_extra ON asset_as_eth_account.asset_id = asset_extra.asset_id
      JOIN asset ON asset_extra.asset_id = asset.id
      JOIN collections ON asset_extra.collection_id = collections.id
      JOIN studio_contract ON collections.contract_address = studio_contract.address AND collections.chain_id = studio_contract.chain_id
      JOIN studio_contract_item_metadata ON studio_contract.id = studio_contract_item_metadata.studio_contract_id AND asset.token_id = studio_contract_item_metadata.token_id
      WHERE
          studio_contract.is_blindbox = true
        AND studio_contract_item_metadata.is_revealed = false
        AND asset_as_eth_account.owner_address = :wallet_address
        AND studio_contract.address = :contract_address
        AND studio_contract.chain_id = :chain_id
    `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            wallet_address: walletAddress.toLowerCase(),
            contract_address: contractAddress.toLowerCase(),
            chain_id: chainId,
          },
        },
      )
    )[0] as any as {
      count: string;
    };

    if (!count || !count.count) {
      return 0;
    }

    return +count.count;
  }
}
