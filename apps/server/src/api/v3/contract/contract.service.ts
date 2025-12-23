import { TraitService } from '@/api/v3/trait/trait.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Promise as promise } from 'bluebird';
import {
  Contract,
  Blockchain,
  Asset,
  AssetAsEthAccount,
  Collection,
  Wallet,
} from '@/model/entities';
import { ChainId } from '@/common/utils/types';
import { Nft } from '@/core/third-party-api/gateway/gateway.interface';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { LibsService } from '@/common/libs/libs.service';
import { ContractType } from '@/core/third-party-api/gateway/constants';
import { UpdateContractAssetsFromQueue } from '@/api/v3/asset/asset.interface';
import { Sequelize } from 'sequelize-typescript';
import { ConfigurationService } from '@/configuration';
import { InjectModel } from '@nestjs/sequelize';
import { ProviderTokens } from '@/model/providers';
import { CacheService } from '@/common/cache';
import { UpdateTrait } from '../trait/trait.interface';
import { CollectionDao } from '@/core/dao/collection-dao';
import { AssetDao } from '@/core/dao/asset-dao';
import { AssetExtraDao } from '@/core/dao/asset-extra-dao';
import { RefreshBlacklist } from '../asset/constants';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectModel(Contract)
    private contractRepository: typeof Contract,

    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,

    @InjectModel(Asset)
    private assetRepository: typeof Asset,

    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(Collection)
    private collectionRepository: typeof Collection,

    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelize: Sequelize,

    private gatewayService: GatewayService,
    private libsService: LibsService,
    private traitService: TraitService,
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,
    private readonly collectionDao: CollectionDao,
    private readonly assetDao: AssetDao,
    private readonly extraDao: AssetExtraDao,
  ) {}

  async findOne(chainId: ChainId, contractAddress: string) {
    try {
      return await this.contractRepository.findOne({
        where: {
          address: contractAddress,
          chainId,
        },
      });
    } catch (err) {
      this.logger.error(err);
      return promise.reject(err);
    }
  }

  async isContractOwner(
    chainId: ChainId,
    contractAddress: string,
    ownerAddress: string,
  ) {
    const cOwner = (
      await this.gatewayService.getContractOwnerOnChain(chainId, [
        contractAddress,
      ])
    ).shift();

    return cOwner.ownerAddress.toLowerCase() == ownerAddress.toLowerCase();
  }

  // batch-owner-assets
  async updateAssetsByQueue(
    options: UpdateContractAssetsFromQueue,
  ): Promise<void> {
    try {
      const isInBlacklist = RefreshBlacklist.some(
        (item) =>
          item.chainId === options.chainId &&
          item.address.toLowerCase() === options.contractAddress.toLowerCase(),
      );

      if (isInBlacklist) {
        this.logger.warn(
          `asset ${options.chainId}/${options.contractAddress} is in refresh blacklist`,
        );
        return null;
      }

      const [blockchain, contractInfo] = await Promise.all([
        this.blockchainRepository.findOne({
          where: {
            chainId: options.chainId,
          },
        }),
        this.collectionDao.findOrCreateContract(
          options.chainId,
          options.contractAddress,
        ),
      ]);

      const chainShortName = await this.libsService.findChainShortNameByChainId(
        options.chainId,
      );
      const collection = await this.collectionDao.findOrCreateCollection({
        chainShortName,
        contractAddress: options.contractAddress,
      });

      try {
        const contractMetadata = await this.gatewayService.getContractMetadata(
          options.chainId,
          options.contractAddress,
        );
        this.logger.debug(
          `contractMetadata ${JSON.stringify(contractMetadata)}`,
        );
        if (contractMetadata) {
          if (
            contractMetadata.verifiedCollection != collection.verifiedCollection
          ) {
            await this.collectionRepository.update(
              { verifiedCollection: contractMetadata.verifiedCollection },
              { where: { id: collection.id } },
            );
          }
        }
      } catch (e) {
        this.logger.error(`getContractMetadata error, ${JSON.stringify(e)}`);
      }

      if (!blockchain) {
        throw new Error(
          `blockchain find by blockchainId ${options.chainId} not found`,
        );
      }

      // check if contract is new. it's a new contract when nft size of contract is smaller than contractNewAssetSize
      const contractNewAssetSize = 20; //
      let isContractNew = false;
      const existTokenIds = [];
      const assets = await this.assetRepository.findAll({
        attributes: ['tokenId'],
        where: { contractId: contractInfo.id },
        limit: contractNewAssetSize,
      });
      if (assets.length < contractNewAssetSize) {
        isContractNew = true;
        existTokenIds.push(...assets.map((e) => e.tokenId));
      }

      const NFT_LIMIT = 20000;
      await this.gatewayService.getNftsByContract(
        options.chainId,
        options.contractAddress,
        NFT_LIMIT,
        async (page: number, nfts: Nft[]) => {
          try {
            this.logger.debug(
              `onPage page ${page}, nfts.length ${nfts.length}`,
            );

            if (isContractNew) {
              const updateNfts: Nft[] = [];
              const insertNfts = [];
              for (const nft of nfts) {
                if (existTokenIds.indexOf(nft.tokenId) > -1) {
                  updateNfts.push(nft);
                } else {
                  insertNfts.push(nft);
                }
              }
              // this.logger.debug(`updateNfts ${JSON.stringify(updateNfts)}`);
              // this.logger.debug(`insertNfts ${JSON.stringify(insertNfts)}`);
              await this._insertThirdNfts(insertNfts, {
                chainId: options.chainId,
                contractAddress: options.contractAddress,
                contractId: contractInfo.id,
                collectionId: collection.id,
                contractType: contractInfo.schemaName,
              });
              await this._updateThirdNft(updateNfts, {
                chainId: options.chainId,
                contractAddress: options.contractAddress,
                contractId: contractInfo.id,
                collectionId: collection.id,
              });
            } else {
              this.logger.debug(`updateNfts ${JSON.stringify(nfts)}`);
              await this._updateThirdNft(nfts, {
                chainId: options.chainId,
                contractAddress: options.contractAddress,
                contractId: contractInfo.id,
                collectionId: collection.id,
              });
            }
          } catch (e) {}
        },
      );

      return;
    } catch (err) {
      this.logger.error(err);
      return promise.reject(err);
    }
  }

  async getContractType(
    chainId: ChainId,
    contractAddress: string,
  ): Promise<string> {
    try {
      const contract = await this.contractRepository.findOne({
        attributes: ['schemaName'],
        where: {
          chainId,
          address: contractAddress,
        },
      });
      return contract.schemaName;
    } catch (err) {
      this.logger.error(err);
      return null;
    }
  }

  // clean repeat contract address
  async cleanRepeatContractAddress(): Promise<void> {
    try {
      // find repeat contract address
      const contracts = await this.contractRepository.findAll({
        attributes: [
          [
            this.sequelize.literal(
              `decode(lower(encode(address, 'escape')), 'escape')`,
            ),
            'address',
          ],
          [this.sequelize.fn('COUNT', this.sequelize.col('*')), 'count'],
        ],
        group: this.sequelize.literal(
          `decode(lower(encode(address, 'escape')), 'escape')`,
        ) as any,
        having: this.sequelize.literal('COUNT(*) > 1'),
      });

      const contractIds: string[] = await promise.mapSeries(
        contracts,
        async (contract) => {
          const contractByAddress = await this.contractRepository.findOne({
            where: {
              address: contract.address,
            },
          });
          return contractByAddress.id;
        },
      );

      // find assets by contract address
      const assets = await this.assetRepository.findAll({
        where: { contractId: contractIds },
      });

      const assetIds: string[] = assets.map((asset) => {
        return asset.id;
      });

      // find relations in asset as eth account and delete it
      await this.assetAsEthAccountRepository.destroy({
        where: {
          assetId: assetIds,
        },
      });

      // delete assets
      await this.assetRepository.destroy({
        where: {
          id: assetIds,
        },
      });

      await this.extraDao.destroy(assetIds);

      // delete repeat contract
      await this.contractRepository.destroy({
        where: {
          id: contractIds,
        },
      });

      return;
    } catch (err) {
      this.logger.error(err);
      return promise.resolve(err);
    }
  }

  async _updateThirdNft(
    data: Nft[],
    options: {
      chainId: ChainId;
      contractAddress: string;
      contractId: string;
      collectionId: string;
    },
  ) {
    let collectionId = options.collectionId;
    if (!collectionId) {
      const collection = await this.collectionRepository.findOne({
        attributes: ['id'],
        where: {
          contractAddress: options.contractAddress,
        },
      });
      collectionId = collection.id;
    }

    await promise.map(
      data,
      async (nft: Nft) => {
        try {
          const assetKey = {
            chainId: options.chainId,
            contractAddress: options.contractAddress,
            tokenId: nft.tokenId,
          };
          // data from rpc has higher priority than nft api
          // this.logger.log(`updateOwnerAsset ${JSON.stringify(assetKey)}`);
          let asset = await this.assetDao.syncAssetOnChain(assetKey, {
            isSpam: nft.isSpam,
          });
          if (!asset) {
            asset = await this.assetDao.syncAssetByNft(assetKey, nft);
          }
          // asset_as_eth_account
          // 不需要处理，已经在syncAssetByNft中处理了
        } catch (e) {
          this.logger.error(e);
        }
      },
      { concurrency: 1 },
    );
  }

  async _insertThirdNfts(
    data: Nft[],
    options: {
      chainId: ChainId;
      contractAddress: string;
      contractId: string;
      contractType: string;
      collectionId: string;
    },
  ) {
    const pageSize = 50; // max nft size per commit
    const pages = Math.ceil(data.length / pageSize);
    for (let page = 0; page < pages; page++) {
      const startIndex = page * pageSize;
      const endIndex = (page + 1) * pageSize;
      this.logger.debug(
        `insertThirdNfts total ${data.length} startIndex ${startIndex}, endIndex ${endIndex}`,
      );
      const nfts = data.slice(
        startIndex,
        endIndex <= data.length ? endIndex : data.length,
      );
      let collectionId = options.collectionId;
      if (!collectionId) {
        const collection = await this.collectionRepository.findOne({
          attributes: ['id'],
          where: {
            contractAddress: options.contractAddress,
          },
        });
        collectionId = collection.id;
      }

      const assetValues = await promise.map(
        nfts,
        async (nft) => {
          let totalOwners = '1';
          let ownerAddress = null;
          if (nft.contract.contractType == ContractType.ERC1155) {
            try {
              totalOwners = await this.gatewayService.getAssetTotalOwners(
                options.chainId,
                options.contractAddress,
                nft.tokenId,
              );
            } catch (error) {
              this.logger.error(
                `getAssetTotalOwners error ${JSON.stringify(error)}`,
              );
            }
          } else if (nft.contract.contractType == ContractType.ERC721) {
            try {
              ownerAddress = await this.gatewayService.nativeGetOwnerOf(
                options.chainId,
                options.contractAddress,
                nft.tokenId,
              );
            } catch (error) {
              this.logger.error(`getAssetOwner error ${JSON.stringify(error)}`);
            }
          }
          const asset = {
            contractId: options.contractId,
            tokenId: nft.tokenId,
            chainId: options.chainId,
            data: null,
            name: nft.metadata?.name ? nft.metadata?.name : `#${nft.tokenId}`,
            description: nft.metadata?.description,
            imageUrl:
              nft.metadata?.image?.trim() || nft.metadata?.imageUrl?.trim(),
            imageData: nft.metadata?.image_data || null,
            externalUrl: nft.metadata?.externalUrl?.trim(),
            backgroundColor: nft.metadata?.background_color,
            traits: nft.metadata?.attributes,
            animationUrl: nft.metadata?.animation_url?.trim(),
            animationType: await this.libsService.parseAnimationType(
              nft.metadata?.animation_url?.trim(),
            ),
            tokenUri: nft.tokenUri?.trim(),
            totalAmount: nft.totalAmount,
            totalOwners: totalOwners,
            ownerAddress: ownerAddress,
          };

          // if moralis no data, use rpc to get data
          if (
            !nft.metadata ||
            Object.keys(nft.metadata).length === 0 ||
            (!nft.metadata.image &&
              !nft.metadata.imageUrl &&
              !nft.metadata.image_data)
          ) {
            this.logger.debug(
              `[contract assets] update asset by rpc: ${nft.contract.contractAddress}, #${asset.tokenId} by rpc`,
            );
            const onchainNft: Nft =
              await this.gatewayService.getNftByTokenIdByContractOnChain(
                options.chainId,
                options.contractAddress,
                nft.tokenId,
              );

            asset.name = onchainNft.metadata?.name
              ? onchainNft.metadata?.name
              : `#${asset.tokenId}`;
            asset.description = onchainNft.metadata?.description;
            asset.imageUrl =
              onchainNft.metadata?.image?.trim() ||
              onchainNft.metadata?.image_url?.trim();
            asset.imageData = onchainNft.metadata?.image_data || null;
            asset.externalUrl = onchainNft.metadata?.external_url?.trim();
            asset.backgroundColor = onchainNft.metadata?.background_color;
            asset.traits = onchainNft.metadata?.attributes as unknown as string; // Attributes[] to string;
            asset.animationUrl = onchainNft.metadata?.animation_url?.trim();
            asset.animationType = (await this.libsService.parseAnimationType(
              nft.metadata?.animation_url?.trim(),
            )) as string;
            asset.tokenUri = onchainNft.tokenUri?.trim();
            // ownerAddress: onchainNft.owner.ownerAddress;
          }

          return asset;
        },
        { concurrency: 5 },
      );

      const assets = await this.assetRepository.bulkCreate(assetValues);

      const extraValues = assets.map((e) => ({
        assetId: e.id,
        collectionId: options.collectionId,
        chainId: e.chainId,
        contractId: options.contractId,
        assetCreatedAt: e.createdAt,
      }));
      await this.extraDao.createBulkAssetExtra(extraValues);

      // update traits
      const updateAssetTrait: UpdateTrait[] = assets.map((asset) => {
        return {
          assetId: asset.id,
          collectionId: collectionId,
          traits: this.traitService.normalizeTraits(asset.traits),
        };
      });

      this.traitService.updateAssetsTraits(updateAssetTrait);

      // add asset_as_eth_account
      const assetAsEthAccountValues = promise.map(
        assets,
        async (e) => {
          const selectAssetValue = assetValues.find<any>(
            (nftValue: any) => nftValue.tokenId === e.tokenId,
          );
          // this.logger.debug(
          //   `selectAssetValue ${JSON.stringify(selectAssetValue)}`,
          // );
          const ownerAddress = selectAssetValue?.ownerAddress;
          if (ownerAddress && options.contractType == ContractType.ERC721) {
            return {
              assetId: e.id,
              quantity: '1', // ERC721 only have 1
              ownerAddress: ownerAddress,
            };
          }
          return undefined;
        },
        { concurrency: 5 },
      );
      await this.assetAsEthAccountRepository.bulkCreate(
        assetAsEthAccountValues.filter((e) => e !== undefined),
      );
    }
  }
}
