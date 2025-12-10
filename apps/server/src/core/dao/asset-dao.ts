import { ConfigurationService } from '@/configuration';
import { CacheService } from '@/common/cache';
import { Injectable, Logger } from '@nestjs/common';
import {
  AssetKey,
  TransferAssetOwnershipOnchain,
} from '@/api/v3/asset/asset.interface';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { InjectModel } from '@nestjs/sequelize';
import {
  Asset,
  AssetAsEthAccount,
  AssetExtra,
  Blockchain,
  Collection,
  Contract,
  SeaportOrderAsset,
} from '@/model/entities';
import { CollectionDao } from '@/core/dao/collection-dao';
import { AssetExtraDao } from '@/core/dao/asset-extra-dao';
import { LibsService } from '@/common/libs/libs.service';
import { TraitDao } from '@/core/dao/trait-dao';
import { Nft } from '@/core/third-party-api/gateway/gateway.interface';
import { ContractType } from '@/core/third-party-api/gateway/constants';
import { ChainId } from '@/common/utils/types';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { RefreshBlacklist } from '@/api/v3/asset/constants';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';

import { AssetMetadataFailure } from '@/model-small/entities/asset-metadata-failure.entity';
import { CollectionMetadataFailure } from '@/model-small/entities/collection-metadata-failure.entity';
import { DB_SMALL_NAME } from '@/core/small-db/small-constants';

@Injectable()
export class AssetDao {
  protected readonly logger = new Logger(AssetDao.name);

  constructor(
    @InjectModel(Asset)
    private assetRepository: typeof Asset,
    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,
    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,
    @InjectModel(Collection)
    private collectionRepository: typeof Collection,
    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,
    @InjectModel(SeaportOrderAsset)
    private seaportOrderRepository: typeof SeaportOrderAsset,
    @InjectModel(AssetMetadataFailure, DB_SMALL_NAME)
    private assetMetadataFailureRepository: typeof AssetMetadataFailure,
    @InjectModel(CollectionMetadataFailure, DB_SMALL_NAME)
    private collectionMetadataFailureRepository: typeof CollectionMetadataFailure,

    private readonly extraDao: AssetExtraDao,
    private readonly collectionDao: CollectionDao,
    private readonly gatewayService: GatewayService,
    private readonly traitDao: TraitDao,
    private readonly libsService: LibsService,
    private readonly config: ConfigurationService,
    private readonly cacheService: CacheService,
  ) {
    // const contract = '0xA9f2CC05B1B39c9171C380C064BEBfE4B5e15eAD'.toLowerCase();
    // const token = '29';
    // this.syncAssetOnChain(
    //   {
    //     contractAddress: contract,
    //     tokenId: token,
    //     chainId: '1868',
    //   },
    //   // { rpcEnd: RpcEnd.ankr },
    // ).then((data) => {
  }

  // Metadata Optimization Helpers

  private getCollectionFailCountKey(
    chainId: number | string,
    contractAddress: string,
  ): string {
    return `collection_fail_count:${chainId}:${contractAddress.toLowerCase()}`;
  }

  private getCollectionSuspendKey(
    chainId: number | string,
    contractAddress: string,
  ): string {
    return `collection_suspended:${chainId}:${contractAddress.toLowerCase()}`;
  }

  private async isCollectionSuspended(
    chainId: number | string,
    contractAddress: string,
  ): Promise<boolean> {
    const key = this.getCollectionSuspendKey(chainId, contractAddress);
    const isSuspended = await this.cacheService.getCache(key);

    if (isSuspended) {
      return true;
    }

    // DB Fallback for Permanent Blacklist
    const collectionFailure =
      await this.collectionMetadataFailureRepository.findOne({
        where: {
          chainId,
          contractAddress: contractAddress.toLowerCase(),
          status: 'BLACKLISTED',
        },
      });

    if (collectionFailure) {
      // Refill Redis cache to save DB hits (Permanent cache effectively)
      await this.cacheService.setCache(key, true, 24 * 60 * 60); // 24 hours
      return true;
    }

    return false;
  }

  private async shouldSkipAssetFetch(
    chainId: number | string,
    contractAddress: string,
    tokenId: string,
  ): Promise<boolean> {
    // Check DB for failure record
    const failure = await this.assetMetadataFailureRepository.findOne({
      where: {
        chainId,
        contractAddress: contractAddress.toLowerCase(),
        tokenId,
      },
    });

    if (failure) {
      // Increment request count
      await failure.increment('requestCount');

      if (failure.nextRetryAt && failure.nextRetryAt > new Date()) {
        return true;
      }
    }
    return false;
  }

  private async trackMetadataFailure(
    chainId: number | string,
    contractAddress: string,
    tokenId: string,
    error: Error,
    metadataUrl?: string,
  ): Promise<void> {
    // 1. Upsert Asset Failure Record in DB
    const now = new Date();
    let failure = await this.assetMetadataFailureRepository.findOne({
      where: {
        chainId,
        contractAddress: contractAddress.toLowerCase(),
        tokenId,
      },
    });

    // Error Classification
    let errorReason = 'UNKNOWN_ERROR';
    if (error) {
      const msg = error.message || error.toString();
      if (msg.includes('404')) errorReason = 'METADATA_404';
      else if (msg.includes('timeout')) errorReason = 'TIMEOUT';
      else if (msg.includes('image')) errorReason = 'IMAGE_404';
      else errorReason = msg.substring(0, 255);
    }

    // Strict Blacklist: 30 Days Backoff
    const nextRetryDelay = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (!failure) {
      failure = await this.assetMetadataFailureRepository.create({
        chainId: Number(chainId),
        contractAddress: contractAddress.toLowerCase(),
        tokenId,
        failCount: 1,
        lastFailedAt: now,
        nextRetryAt: new Date(now.getTime() + nextRetryDelay),
        errorReason,
        metadataUrl: metadataUrl || null,
      });
    } else {
      await failure.update({
        failCount: failure.failCount + 1,
        lastFailedAt: now,
        nextRetryAt: new Date(now.getTime() + nextRetryDelay),
        errorReason,
        metadataUrl: metadataUrl || failure.metadataUrl, // Update if provided, else keep existing
      });
    }

    // 2. Increment Collection Failure Count (Redis)
    const collectionFailKey = this.getCollectionFailCountKey(
      chainId,
      contractAddress,
    );
    const currentCollectionFail =
      ((await this.cacheService.getCache(collectionFailKey)) as string) || '0';
    const newCollectionFail = parseInt(currentCollectionFail) + 1;
    // Collection fail count TTL = 1 hour (3600 seconds) - sliding window effect
    await this.cacheService.setCache(
      collectionFailKey,
      newCollectionFail,
      3600,
    );

    // 3. Check for Collection Suspension
    // MAX_COLLECTION_FAIL_THRESHOLD = 10 (Strict Blacklist)
    if (newCollectionFail >= 10) {
      const suspendKey = this.getCollectionSuspendKey(chainId, contractAddress);
      // COLLECTION_SUSPEND_TTL = 24 hours (86400 seconds)
      await this.cacheService.setCache(suspendKey, true, 86400);

      // Persist to SmallDB as BLACKLISTED
      const collectionFailure =
        await this.collectionMetadataFailureRepository.findOne({
          where: { chainId, contractAddress: contractAddress.toLowerCase() },
        });

      if (collectionFailure) {
        await collectionFailure.update({
          status: 'BLACKLISTED',
          totalAssetFailures: newCollectionFail,
          suspendedAt: new Date(),
          retryAfter: null, // Permanent, no retry
        });
      } else {
        await this.collectionMetadataFailureRepository.create({
          chainId: Number(chainId),
          contractAddress: contractAddress.toLowerCase(),
          status: 'BLACKLISTED',
          totalAssetFailures: newCollectionFail,
          suspendedAt: new Date(),
          retryAfter: null, // Permanent, no retry
        });
      }

      this.logger.warn(
        `Collection ${chainId}/${contractAddress} BLACKLISTED due to ${newCollectionFail} failures.`,
      );
    } else {
      // Optional: Update totalAssetFailures periodically or on every failure if needed
      // For performance, we might skip updating DB on every single asset failure unless it hits threshold
      // But to keep 'total_asset_failures' accurate for reporting, we might want to upsert here.
      // Let's do a "lazy" upsert or just update when suspending to save DB writes.
      // User requested "Record it", so let's update it if it exists, or create if not.
      // To avoid too many DB writes, we can just update it when we suspend.
      // OR, we can update it every time but that's heavy.
      // Decision: Only update DB when status changes to SUSPENDED or periodically.
      // For now, let's stick to updating when suspending to avoid performance regression.
    }
  }

  async syncAssetOnChain(
    options: AssetKey,
    optionsExtra?: {
      isSpam?: boolean;
      rpcEnd?: RpcEnd;
      syncOwnerShip?: boolean;
      fromAddress?: string;
      toAddress?: string;
    },
  ): Promise<Asset> {
    optionsExtra = {
      isSpam: false,
      rpcEnd: RpcEnd.default,
      syncOwnerShip: true,
      ...optionsExtra,
    };
    try {
      const blockchain = await this._findCacheBlockChain(options.chainId);

      if (!blockchain) {
        this.logger.warn(`blockchain chainId=${options.chainId} not supported`);
        return null;
      }

      const isInBlacklist = RefreshBlacklist.some(
        (item) =>
          item.chainId === options.chainId &&
          item.address.toLowerCase() === options.contractAddress.toLowerCase(),
      );

      if (isInBlacklist) {
        this.logger.warn(
          `asset ${options.chainId}/${options.contractAddress}/${options.tokenId} is in refresh blacklist`,
        );
        return null;
      }

      // Check Collection Suspension
      const isCollectionSuspended = await this.isCollectionSuspended(
        options.chainId,
        options.contractAddress,
      );
      if (isCollectionSuspended) {
        this.logger.warn(
          `Collection ${options.chainId}/${options.contractAddress} is suspended due to high failure rate.`,
        );
        return null;
      }

      // Check Asset Failure Count
      const shouldSkipAsset = await this.shouldSkipAssetFetch(
        options.chainId,
        options.contractAddress,
        options.tokenId,
      );

      if (shouldSkipAsset) {
        this.logger.warn(
          `Asset ${options.chainId}/${options.contractAddress}/${options.tokenId} skipped due to repeated metadata failures.`,
        );
        return null;
      }

      const nft: Nft =
        await this.gatewayService.getNftByTokenIdByContractOnChain(
          options.chainId,
          options.contractAddress,
          options.tokenId,
          optionsExtra.rpcEnd,
        );
      if (!nft?.metadata) {
        this.logger.warn(
          `asset ${options.chainId}/${options.contractAddress}/${options.tokenId} can not be found on chain`,
        );
        // Track Failure
        await this.trackMetadataFailure(
          options.chainId,
          options.contractAddress,
          options.tokenId,
          new Error('METADATA_404'),
          nft?.tokenUri,
        );
        return null;
      }

      const contract = await this._findCacheContract(
        options.chainId,
        nft.contract.contractAddress,
      );

      const collection = await this._findCacheCollection({
        chainShortName: blockchain.shortName,
        contractAddress: nft.contract.contractAddress,
      });

      // TODO: need to refactor this timing
      // update collection owner address from RPC
      const contractOwnerAddress = await this.collectionDao.getContractOwner(
        options.chainId,
        options.contractAddress,
        { rpcEnd: optionsExtra.rpcEnd },
      );
      // 减少频繁更新ownerAddress信息
      if (contractOwnerAddress !== collection.ownerAddress) {
        this.logger.debug(
          `collectionRepository.update ${contractOwnerAddress} ${collection.ownerAddress}`,
        );
        await this.collectionRepository.update(
          { ownerAddress: contractOwnerAddress },
          { where: { id: collection.id } },
        );
      }

      const asset: Asset = await this._findOrCreateAsset(
        {
          ...options,
          contractId: contract.id,
          rpcEnd: optionsExtra.rpcEnd,
          collectionId: collection.id,
        },
        nft,
      );

      await this._checkOrCreateAssertExtra(
        { assetId: asset.id, collectionId: collection.id },
        {
          contractAddress: contract.address,
          chainShortName: blockchain.shortName,
          isSpam: optionsExtra.isSpam,
        },
      );

      if (nft.owner.ownerAddress && optionsExtra.syncOwnerShip) {
        // contractType为erc1155时 RpcService.getNftByTokenIdByContract 的 owner.ownerAddress
        // 为 null, 所以只需要考虑erc721情况
        if (nft?.contract.contractType === ContractType.ERC721) {
          const quantity = '1';
          await this.updateOrCreateAssetEthAccount(
            { assetId: asset.id },
            {
              quantity: quantity,
              ownerAddress: nft.owner.ownerAddress,
              contractId: contract.id,
            },
            {
              assetId: asset.id,
              ownerAddress: nft.owner.ownerAddress,
              quantity: quantity,
              contractId: contract.id,
            },
          );
        }
      }

      // 主要用在 1155 的 ownerShip 轉移
      if (optionsExtra.fromAddress && optionsExtra.toAddress) {
        await this.transferAssetOwnershipOnchain({
          contractAddress: options.contractAddress,
          tokenId: options.tokenId,
          chainId: options.chainId,
          fromAddress: optionsExtra.fromAddress,
          toAddress: optionsExtra.toAddress,
        });
      }

      return asset;
    } catch (err) {
      this.logger.error(err);
      // Track Failure on Error (e.g. 404/410/500 from RPC/Gateway)
      await this.trackMetadataFailure(
        options.chainId,
        options.contractAddress,
        options.tokenId,
        err,
        // We don't have easy access to tokenUri here in the catch block unless we scope it out
        // For now, leave it undefined or try to fetch if possible, but that risks infinite loop.
        // Best effort: if err object has it? No.
      );
      return Promise.resolve(null);
    }
  }

  async syncAssetByNft(options: AssetKey, nft: Nft): Promise<Asset> {
    try {
      const isInBlacklist = RefreshBlacklist.some(
        (item) =>
          item.chainId === options.chainId &&
          item.address.toLowerCase() ===
            nft.contract.contractAddress.toLowerCase(),
      );

      if (isInBlacklist) {
        this.logger.debug(
          `[syncAssetByNft] asset ${options.chainId}/${nft.contract.contractAddress}/${nft.tokenId} is in refresh blacklist`,
        );
        return null;
      }

      const blockchain = await this._findCacheBlockChain(options.chainId);

      if (!blockchain) {
        this.logger.warn(`blockchain chainId=${options.chainId} not supported`);
        return null;
      }

      const contract = await this._findCacheContract(
        options.chainId,
        nft.contract.contractAddress,
        {
          name: nft?.contract?.name,
          symbol: nft?.contract.symbol,
          contractType: nft?.contract.contractType,
        },
      );

      const collection = await this._findCacheCollection({
        contractAddress: nft.contract.contractAddress,
        chainShortName: blockchain.shortName,
      });

      if (
        !nft.metadata ||
        Object.keys(nft.metadata).length === 0 ||
        (!nft.metadata.image &&
          !nft.metadata.imageUrl &&
          !nft.metadata.image_data)
      ) {
        this.logger.debug(
          `[contract assets] update asset by rpc: ${options.contractAddress}, #${options.tokenId}`,
        );
        nft = await this.gatewayService.getNftByTokenIdByContractOnChain(
          options.chainId,
          options.contractAddress,
          options.tokenId,
        );
      }

      const asset = await this._findOrCreateAsset(
        { ...options, contractId: contract.id, collectionId: collection.id },
        nft,
      );

      await this._checkOrCreateAssertExtra(
        { assetId: asset.id, collectionId: collection.id },
        {
          contractAddress: contract.address,
          chainShortName: blockchain.shortName,
          isSpam: nft.isSpam,
        },
      );

      return asset;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async _findOrCreateAsset(
    options: {
      contractId: string;
      contractAddress: string;
      tokenId: string;
      chainId: ChainId;
      rpcEnd?: RpcEnd;
      collectionId?: string;
    },
    nft: Nft,
  ): Promise<Asset> {
    let totalOwners = null;
    if (nft.contract.contractType == ContractType.ERC1155) {
      try {
        totalOwners = await this.gatewayService.getAssetTotalOwners(
          options.chainId,
          options.contractAddress,
          nft.tokenId,
          { rpcEnd: options.rpcEnd },
        );
      } catch (error) {
        this.logger.error(error);
      }
    }

    let asset = await this.assetRepository.findOne({
      where: {
        contractId: options.contractId,
        tokenId: nft.tokenId,
        chainId: options.chainId,
      },
    });

    if (!asset) {
      asset = await this.assetRepository.create({
        contractId: options.contractId,
        tokenId: nft.tokenId,
        chainId: options.chainId,
        data: null,
        name: nft.metadata?.name ? nft.metadata?.name : `#${nft.tokenId}`,
        description: nft.metadata?.description,
        imageUrl:
          nft.metadata?.image?.trim() || nft.metadata?.image_url?.trim(),
        imageData: nft.metadata?.image_data || null,
        externalUrl: nft.metadata?.external_url?.trim(),
        backgroundColor: nft.metadata?.background_color,
        traits: this.traitDao.normalizeTraits(
          nft.metadata?.attributes,
        ) as any as string,
        animationUrl: nft.metadata?.animation_url?.trim(),
        animationType: await this.libsService.parseAnimationType(
          nft.metadata?.animation_url?.trim(),
        ),
        tokenUri: nft.tokenUri?.trim() ?? '',
        totalOwners: totalOwners || '1',
      });

      this._updateAssetTraits({
        asset,
        collectionId: options.collectionId,
        nft,
      });
    } else {
      const assetName = nft.metadata?.name
        ? nft.metadata?.name
        : `#${asset.tokenId}`;
      const assetDesc = nft.metadata?.description;
      const assetImageUrl =
        nft.metadata?.image?.trim() || nft.metadata?.image_url?.trim();
      const assetExternalUrl = nft.metadata?.external_url?.trim();
      const assetImageData = nft.metadata?.image_data || null;
      const assetBackgroundColor = nft.metadata?.background_color;
      const assetTraits = this.traitDao.normalizeTraits(
        nft.metadata?.attributes,
      ) as any as string;
      const assetAnimationUrl = nft.metadata?.animation_url?.trim();
      const assetAnimationType = (await this.libsService.parseAnimationType(
        nft.metadata?.animation_url?.trim(),
      )) as string;
      const assetTokenUri = nft.tokenUri?.trim() ?? '';

      const roughValue = (v) => {
        if (v === null || v === undefined || v === '') {
          return undefined;
        }
        return v;
      };
      const replacer = (key, value) => {
        if (value === null || value === undefined || value === '') {
          return undefined;
        }
        return value;
      };
      // 这里不考虑traits的变化，因为syncAssetByNft已经包含_updateAssetTraits
      // const traitsNeedUpdateFn = () => {
      //   return (
      //     asset.traits !=
      //     JSON.stringify(
      //       this.traitDao.normalizeTraits(nft.metadata?.attributes),
      //       replacer,
      //     )
      //   );
      // };

      this._updateAssetTraits({
        asset,
        collectionId: options.collectionId,
        nft,
      });

      const roughCompare = (x, y) => roughValue(x) == roughValue(y);
      if (
        !roughCompare(asset.name, assetName) ||
        !roughCompare(asset.description, assetDesc) ||
        !roughCompare(asset.imageUrl, assetImageUrl) ||
        !roughCompare(asset.externalUrl, assetExternalUrl) ||
        !roughCompare(asset.imageData, assetImageData) ||
        !roughCompare(asset.backgroundColor, assetBackgroundColor) ||
        !roughCompare(asset.traits, assetTraits) ||
        // traitsNeedUpdateFn() ||
        !roughCompare(asset.animationUrl, assetAnimationUrl) ||
        !roughCompare(asset.animationType, assetAnimationType) ||
        !roughCompare(asset.tokenUri, assetTokenUri)
      ) {
        asset.name = assetName;
        asset.description = assetDesc;
        asset.imageUrl = assetImageUrl;
        asset.externalUrl = assetExternalUrl;
        asset.imageData = assetImageData;
        asset.backgroundColor = assetBackgroundColor;
        asset.traits = assetTraits;
        asset.animationUrl = assetAnimationUrl;
        asset.animationType = assetAnimationType;
        asset.tokenUri = assetTokenUri;
        // 更新时，如果拿取不到，不需要更新该字段
        if (totalOwners != null) {
          asset.totalOwners = parseInt(totalOwners || '1');
        }
        await asset.save({ silent: true });
      }
    }
    return asset;
  }

  async _updateAssetTraits(options: { asset: Asset; collectionId; nft: Nft }) {
    const assetId = options.asset.id;
    const collectionId = options.collectionId;
    const normalizeDbTraits = this.traitDao.normalizeTraits(
      options.asset.traits,
    );
    const normalizeThirdTraits = this.traitDao.normalizeTraits(
      options.nft.metadata?.attributes,
    );
    let isUpdated = false;
    // 判斷如果 DB 跟 鏈上 抓到一樣的
    if (
      JSON.stringify(normalizeDbTraits) != JSON.stringify(normalizeThirdTraits)
    ) {
      this.traitDao.updateAssetsTraits([
        {
          assetId,
          collectionId,
          traits: normalizeThirdTraits,
        },
      ]);

      isUpdated = true;
    }

    // 可能會 asset_traits 一開始沒有資料，所以要新增
    const assetTraitCount = await this.traitDao.getAssetTraitCount(
      options.asset.id,
    );
    if (assetTraitCount == 0 && JSON.stringify(normalizeThirdTraits)) {
      this.traitDao.updateAssetsTraits([
        {
          assetId,
          collectionId,
          traits: normalizeThirdTraits,
        },
      ]);

      isUpdated = true;
    }

    return isUpdated;
  }

  @Cacheable({ seconds: 5 * 60 })
  async _findCacheBlockChain(chainId: ChainId) {
    return await this.blockchainRepository.findOne({
      where: {
        chainId: chainId,
      },
    });
  }

  @Cacheable({ seconds: 5 * 60 })
  async _findCacheCollection(values: {
    chainShortName: string;
    contractAddress: string;
  }) {
    return await this.collectionDao.findOrCreateCollection(values);
  }

  @Cacheable({ seconds: 5 * 60 })
  async _findCacheContract(
    chainId: ChainId,
    contractAddress: string,
    contractInfo?: {
      name: string;
      symbol: string;
      contractType: string;
    },
    forceUpdate = false,
  ) {
    return await this.collectionDao.findOrCreateContract(
      chainId,
      contractAddress,
      contractInfo,
      forceUpdate,
    );
  }

  async _checkOrCreateAssertExtra(
    values: { assetId: string; collectionId?: string },
    options?: {
      contractAddress: string;
      chainShortName: string;
      isSpam: boolean;
    },
  ) {
    try {
      let assetExtra = await this.assetExtraRepository.findOne({
        where: {
          assetId: values.assetId,
        },
      });
      if (assetExtra) {
        return assetExtra;
      }
      if (!values.collectionId) {
        const collection = await this.collectionDao.findOrCreateCollection({
          contractAddress: options.contractAddress,
          chainShortName: options.chainShortName,
        });
        values.collectionId = collection.id;
      }
      // const assetExtra: AssetExtra = await this.assetExtraRepository.create(
      //   values,
      // );
      assetExtra = await this.extraDao.createDefaultAssetExtra(
        values.assetId,
        values.collectionId,
        options?.isSpam ?? false,
      );
      return assetExtra;
    } catch (e) {
      this.logger.error(`createAssertExtra ${e.toString()}`);
    }
  }

  async updateOrCreateAssetEthAccount(
    where,
    updateValues,
    createValues: {
      assetId: string;
      quantity: string;
      ownerAddress: string;
      contractId?: string;
    },
  ): Promise<AssetAsEthAccount> {
    let obj = await this.assetAsEthAccountRepository.findOne({
      where: where,
    });
    if (obj) {
      // const isEqual =
      //   obj.assetId === createValues.assetId &&
      //   obj.ethAccountId === createValues.ethAccountId &&
      //   obj.quantity === createValues.quantity &&
      //   obj.ownerAddress === createValues.ownerAddress;
      // // if (!isEqual) {
      obj = await obj.update(updateValues);
      // Ensure contractId is backfilled if missing during update
      if (!obj.contractId && createValues.contractId) {
        await obj.update({ contractId: createValues.contractId });
      }
    } else {
      obj = await this.assetAsEthAccountRepository.create(createValues);
    }
    return obj;
  }

  async transferAssetOwnershipOnchain(
    param: TransferAssetOwnershipOnchain,
    option?: { rpcEnd?: RpcEnd },
  ) {
    const chainId = param.chainId as ChainId;
    const contractAddress = param.contractAddress;
    const tokenId = param.tokenId;
    const toAddress = param.toAddress.toLowerCase();
    const fromAddress = param.fromAddress.toLowerCase();

    option = {
      rpcEnd: RpcEnd.default,
      ...option,
    };

    this.logger.debug(
      `[transferAssetOwnership] param ${JSON.stringify(param)}`,
    );
    let asset = await this.assetRepository.findOne({
      attributes: ['id', 'contractId'],
      where: {
        chainId,
        tokenId,
      },
      include: [
        {
          attributes: ['schemaName'],
          model: Contract,
          where: {
            address: contractAddress,
            chainId,
          },
        },
      ],
    });

    if (!asset) {
      const onchainAsset = await this.syncAssetOnChain(
        {
          contractAddress,
          chainId,
          tokenId,
        },
        { rpcEnd: option.rpcEnd },
      );
      if (!onchainAsset) {
        this.logger.debug(
          `[transferAssetOwnership] asset not found on-chain${JSON.stringify(param)}`,
        );
        return false;
      }

      asset = await this.assetRepository.findOne({
        attributes: ['id', 'contractId'],
        where: {
          chainId,
          tokenId,
        },
        include: [
          {
            attributes: ['schemaName'],
            model: Contract,
            where: {
              address: contractAddress,
              chainId,
            },
          },
        ],
      });
    }

    if (asset.Contract.schemaName == ContractType.UNKNOWN) {
      this.logger.debug(
        `[transferAssetOwnership] asset schemaName is unknown ${JSON.stringify(
          param,
        )}`,
      );
      return false;
    }

    const assetId = asset.id;

    // ERC721
    if (asset.Contract.schemaName == ContractType.ERC721) {
      const assetAsEthAccount = await this.assetAsEthAccountRepository.findOne({
        attributes: ['id'],
        where: {
          assetId,
        },
      });

      if (assetAsEthAccount) {
        await this.assetAsEthAccountRepository.update(
          {
            ownerAddress: toAddress,
            contractId: asset.contractId,
          },
          {
            where: {
              id: assetAsEthAccount.id,
            },
          },
        );
      } else {
        await this.assetAsEthAccountRepository.create({
          assetId,
          ownerAddress: toAddress,
          quantity: '1',
          contractId: asset.contractId,
        });
      }

      const needUpdateFillable = await this.seaportOrderRepository.findAll({
        attributes: ['id', 'isFillable'],
        where: {
          isFillable: true,
        },
        include: [
          {
            attributes: ['id'],
            model: SeaportOrderAsset,
            where: {
              assetId,
            },
          },
        ],
      });

      // ERC721 需要把訂單 isFillable 設為 false
      if (needUpdateFillable?.length > 0) {
        await this.seaportOrderRepository.update(
          {
            isFillable: false,
          },
          {
            where: {
              id: needUpdateFillable.map((item) => {
                return item.id;
              }),
            },
          },
        );
      }

      return true;
    }

    // ERC1155
    if (asset.Contract.schemaName == ContractType.ERC1155) {
      const fromAddressAmount = await this.gatewayService.get1155BalanceOf(
        chainId,
        contractAddress,
        fromAddress,
        tokenId,
        option.rpcEnd,
      );
      const toAddressAmount = await this.gatewayService.get1155BalanceOf(
        chainId,
        contractAddress,
        toAddress,
        tokenId,
        option.rpcEnd,
      );

      const fromAssetAsEthAccount =
        await this.assetAsEthAccountRepository.findOne({
          attributes: ['id', 'quantity'],
          where: {
            assetId,
            ownerAddress: fromAddress,
          },
        });
      const toAssetAsEthAccount =
        await this.assetAsEthAccountRepository.findOne({
          attributes: ['id', 'quantity'],
          where: {
            assetId,
            ownerAddress: toAddress,
          },
        });

      //                  | 沒找到資料 | 有找到資料
      // new quantity =0  |   無視    |    刪除
      // new quantity >0  |   新增    |    更新
      if (fromAssetAsEthAccount) {
        if (
          fromAssetAsEthAccount.quantity !== fromAddressAmount &&
          fromAddressAmount !== '0'
        ) {
          await this.assetAsEthAccountRepository.update(
            {
              ownerAddress: fromAddress,
              quantity: fromAddressAmount,
              contractId: asset.contractId,
            },
            {
              where: {
                id: fromAssetAsEthAccount.id,
              },
            },
          );
        } else {
          await this.assetAsEthAccountRepository.destroy({
            where: {
              id: fromAssetAsEthAccount.id,
            },
          });
        }
      } else if (fromAddressAmount !== '0') {
        await this.assetAsEthAccountRepository.create({
          assetId,
          ownerAddress: fromAddress,
          quantity: fromAddressAmount,
          contractId: asset.contractId,
        });
      }

      if (toAssetAsEthAccount) {
        if (
          toAssetAsEthAccount.quantity !== toAddressAmount &&
          toAddressAmount !== '0'
        ) {
          await this.assetAsEthAccountRepository.update(
            {
              ownerAddress: toAddress,
              quantity: toAddressAmount,
              contractId: asset.contractId,
            },
            {
              where: {
                id: toAssetAsEthAccount.id,
              },
            },
          );
        } else {
          await this.assetAsEthAccountRepository.destroy({
            where: {
              id: toAssetAsEthAccount.id,
            },
          });
        }
      } else if (toAddressAmount !== '0') {
        await this.assetAsEthAccountRepository.create({
          assetId,
          ownerAddress: toAddress,
          quantity: toAddressAmount,
          contractId: asset.contractId,
        });
      }

      return true;
    }
  }
}
