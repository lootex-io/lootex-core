import { Category } from '@/api/v3/order/order.interface';
import { ConfigService } from '@nestjs/config';
import { ChainId } from '@/common/utils/types';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Op, WhereOptions } from 'sequelize';
import { Promise as promise } from 'bluebird';
import * as _ from 'lodash';
import { LibsService } from '@/common/libs/libs.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import {
  Account,
  Asset,
  AssetAsEthAccount,
  AssetExtra,
  AssetTraits,
  Blockchain,
  Collection,
  Contract,
  Currency,
  SeaportOrder,
  SeaportOrderAsset,
  Wallet,
} from '@/model/entities';
import { Sequelize } from 'sequelize-typescript';
import {
  AssetKey,
  ExploreAssetsByOpt,
  FindByFamily,
  FindQuery,
  FindResponse,
  GetAssetByContractQuery,
  GetAssetUserHolding,
  SimpleAsset,
  TransferAssetOwnershipOnchain,
  updateAssetOwnershipByAssetId,
  UpdateAssetsMetadataFromQueue,
  UpdateOwnerAssetsFromQueue,
} from '@/api/v3/asset/asset.interface';
import { TraitService } from '@/api/v3/trait/trait.service';
import BigNumber from 'bignumber.js';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { InjectModel } from '@nestjs/sequelize';
import { MAIN_CHAIN_IDS } from '@/common/utils';
import { AssetCountDTO, SyncCollectionDTO } from './asset.dto';
import { BlockStatus } from '@/model/entities/constant-model';
import { CacheService } from '@/common/cache';
import {
  ContractType,
  Priority,
} from '@/core/third-party-api/gateway/constants';
import { Nft } from '@/core/third-party-api/gateway/gateway.interface';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { CollectionDao } from '@/core/dao/collection-dao';
import { AssetDao } from '@/core/dao/asset-dao';
import { RefreshBlacklist } from './constants';
import { Cacheable } from '@/common/decorator/cacheable.decorator';

import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { asyncConcurrent } from '@/common/utils/utils.pure';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
// binding asset collection
const chainShortNames = {
  '1': 'ETH',
  '5': 'ETH_TESTNET',
  '56': 'BSC',
  '97': 'BSC_TESTNET',
  '137': 'POLYGON',
  '80001': 'POLYGON_TESTNET',
  '43114': 'AVAX',
  '43113': 'AVAX_TESTNET',
  '42161': 'ARBITRUM',
  '421613': 'ARBITRUM_TESTNET',
};

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);
  constructor(
    private readonly configService: ConfigService,

    @InjectModel(Asset)
    private assetRepository: typeof Asset,

    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,

    @InjectModel(AssetTraits)
    private assetTraitsRepository: typeof AssetTraits,

    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,

    @InjectModel(Contract)
    private contractRepository: typeof Contract,

    @InjectModel(Collection)
    private collectionRepository: typeof Collection,

    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,

    @InjectModel(Account)
    private accountRepository: typeof Account,

    @InjectModel(SeaportOrder)
    private seaportOrderRepository: typeof SeaportOrder,

    @InjectModel(SeaportOrderAsset)
    private seaportOrderAssetRepository: typeof SeaportOrderAsset,

    @InjectModel(Currency)
    private currencyRepository: typeof Currency,

    private assetExtraService: AssetExtraService,

    private gatewayService: GatewayService,

    private traitService: TraitService,

    private readonly libsService: LibsService,

    private readonly contractService: ContractService,

    private readonly cacheService: CacheService,
    private readonly assetDao: AssetDao,
    private readonly collectionDao: CollectionDao,
    private readonly sequelizeInstance: Sequelize,
  ) { }

  @Cacheable({
    key: 'asset-find-by-id',
    seconds: 60,
  })
  async findById(id: string): Promise<any> {
    const asset = await this.assetRepository.findOne({
      where: {
        id,
      },
      include: [
        {
          model: Contract,
          as: 'Contract',
        },
        {
          model: AssetAsEthAccount,
          where: {
            quantity: {
              [Op.ne]: '0',
            },
          },
          include: [
            {
              model: Wallet,
              include: [{ model: Account }],
            },
          ],
          order: [['quantity', 'DESC']],
          limit: 10,
        },
      ],
    });

    const assetExtra = await this.assetExtraRepository.findOne({
      attributes: ['block'],
      where: { assetId: id },
    });

    if (assetExtra.block === BlockStatus.BLOCKED) {
      throw new HttpException('Asset has been blocked.', HttpStatus.FORBIDDEN);
    }

    const collection = await this.getAssetCollection(asset);
    // asset.Collection = collection;

    const assetOrder = await this.getAssetOrderInfo(asset.id);
    // asset.order = assetOrder;

    const returnAsset = {
      ...asset.toJSON(),
      Collection: collection,

      order: assetOrder,
    };

    return returnAsset;
  }

  async find(options: FindQuery): Promise<FindResponse> {
    try {
      const query: WhereOptions = {};

      if (options.ownerAddress) {
        const assetAsAccounts = await this.assetAsEthAccountRepository.findAll({
          where: {
            quantity: {
              [Op.ne]: '0',
            },
            ownerAddress: options.ownerAddress,
          },
        });

        query.id = assetAsAccounts.map((assetAsAccount) => {
          return assetAsAccount.assetId;
        });
      }
      if (
        ((options.ownerAddress && !!query.id.length) ||
          !options.ownerAddress) &&
        options.traits
      ) {
        const assetIds = await this.traitService.getAssetIdsByTraits({
          collectionSlug: options.collectionSlug,
          traits: options.traits,
        });

        this.logger.debug(`# of assets from owner: ${query.id?.length ?? 0}`);
        this.logger.debug(`# of assets from traits table: ${assetIds.length}`);

        if (options.ownerAddress && !!query.id?.length) {
          const filteredAssetIds = assetIds.filter((value) =>
            query.id.includes(value),
          );
          query.id = filteredAssetIds;
        } else if (!options.ownerAddress) {
          query.id = assetIds;
        }
      }

      this.logger.debug(`# of assets to query: ${query.id?.length ?? 0}`);

      if (options.chainId) {
        query.chainId = options.chainId;
      }

      if (options.collectionSlug) {
        const collection = await this.collectionRepository.findOne({
          where: {
            slug: options.collectionSlug,
          },
        });

        const contract = await this.contractRepository.findOne({
          where: {
            address: collection?.contractAddress,
          },
        });

        query.contractId = contract?.id;
      }

      this.logger.debug(`query = ${JSON.stringify(query)}`);

      const results = await this.findAssetsAndCountByQuery(
        query,
        options.limit,
        options.page,
      );

      const count = results.count;
      let rows = results.rows;

      rows = await promise.map(
        rows,
        async (asset) => {
          if (!asset.Contract) {
            return null;
          }

          const collection = await this.getAssetCollection(asset);
          asset.Collection = collection;

          const assetOrder = await this.getAssetOrderInfo(asset.id);
          asset.order = assetOrder;

          return asset;
        },
        { concurrency: 10 },
      );

      // 將一些不合法的 asset 去除
      rows = _.remove(rows, (n) => {
        return n !== null;
      });

      return {
        rows,
        count,
      };
    } catch (err) {
      this.logger.error(err);
      return {
        rows: [],
        count: 0,
      };
    }
  }

  // batch-owner-assets
  @logRunDuration(new Logger(AssetService.name))
  async updateAssetsByQueue(
    options: UpdateOwnerAssetsFromQueue,
  ): Promise<void> {
    this.logger.debug('updateAssetsByQueue start ...');
    try {
      const blockchain = await this.blockchainRepository.findOne({
        where: {
          chainId: options.chainId,
        },
      });

      if (!blockchain) {
        throw new Error(
          `blockchain find by blockchainId ${options.chainId} not found`,
        );
      }

      // owner exist assetAsEthAccount
      const oldAssetEthAccounts =
        await this.assetAsEthAccountRepository.findAll({
          attributes: ['id'],
          where: {
            ownerAddress: options.ownerAddress,
          },
          include: [
            {
              model: Asset,
              where: {
                chainId: options.chainId,
              },
            },
          ],
        });
      const oldAssetEthAccountsIds = oldAssetEthAccounts.map(
        (assetEthAccount) => assetEthAccount.id,
      );
      const newAssetEthAccountsIds: string[] = [];
      const NFT_LIMIT = 20000;

      // 已同步的sync个数
      const syncedCount = 0;
      await this.gatewayService.getNftsByOwner(
        options.chainId,
        options.ownerAddress,
        NFT_LIMIT,
        async (page: number, nfts: Nft[]) => {
          this.logger.debug(
            `onPage chainId-${options.chainId} ${page} nfts.length ${nfts.length}`,
          );

          const assetAsEthAccountsValues: {
            assetId: string;
            quantity: string;
            ownerAddress: string;
            contractType: ContractType;
            contractId?: string;
          }[] = await promise
            .map(
              nfts,
              async (nft: Nft) => {
                try {
                  const isInBlacklist = RefreshBlacklist.some(
                    (item) =>
                      item.chainId === options.chainId &&
                      item.address.toLowerCase() ===
                      nft.contract.contractAddress.toLowerCase(),
                  );

                  if (isInBlacklist) {
                    this.logger.debug(
                      `[owner assets ${options.ownerAddress}] asset ${options.chainId}/${nft.contract.contractAddress}/${nft.tokenId} is in refresh blacklist`,
                    );
                    return null;
                  }

                  const collection =
                    await this.collectionDao.findCacheCollection(
                      options.chainId,
                      nft.contract.contractAddress,
                    );
                  if (collection?.block === BlockStatus.BLOCKED) {
                    this.logger.error(`Collection's block is blocked`);
                    return null;
                  }
                  //
                  //
                  const assetKey = {
                    chainId: options.chainId,
                    contractAddress: nft.contract.contractAddress,
                    tokenId: nft.tokenId,
                  };
                  let asset = await this.assetDao.syncAssetOnChain(assetKey, {
                    isSpam: nft.isSpam,
                    rpcEnd: RpcEnd.default,
                    syncOwnerShip: false,
                  });
                  if (!asset) {
                    asset = await this.assetDao.syncAssetByNft(assetKey, nft);
                  }
                  if (asset) {
                    const values = {
                      assetId: asset.id,
                      ownerAddress: options.ownerAddress,
                      contractId: asset.contractId,
                    };
                    if (nft?.contract.contractType === ContractType.ERC721) {
                      return {
                        ...values,
                        quantity: '1',
                        contractType: ContractType.ERC721,
                      };
                    } else if (
                      nft?.contract.contractType === ContractType.ERC1155
                    ) {
                      const quantity = nft.owner.amount
                        ? await this.gatewayService.get1155BalanceOf(
                          options.chainId,
                          nft.contract.contractAddress,
                          options.ownerAddress,
                          nft.tokenId,
                          RpcEnd.default,
                        )
                        : '1';
                      return {
                        ...values,
                        quantity: quantity,
                        contractType: ContractType.ERC1155,
                      };
                    }
                  }
                } catch (err) {
                  this.logger.error(
                    `updateAssetsByQueue sync nft error [${options.chainId}/${nft.contract?.contractAddress}/${nft.tokenId}] ${err?.message}`,
                  );
                }
              },
              { concurrency: 2 },
            )
            .filter((e) => e != null);

          const filters = assetAsEthAccountsValues.map((e) => {
            if (e.contractType === ContractType.ERC721) {
              return { assetId: e.assetId };
            } else if (e.contractType === ContractType.ERC1155) {
              return { assetId: e.assetId, ownerAddress: options.ownerAddress };
            }
          });
          const assetAsEthAccounts =
            await this.assetAsEthAccountRepository.findAll({
              attributes: ['id', 'assetId', 'quantity', 'ownerAddress'],
              where: { [Op.or]: filters },
            });
          this.logger.debug(`assetAsEthAccounts ${assetAsEthAccounts.length}`);
          for (const item of assetAsEthAccountsValues) {
            let assetEthAccount = assetAsEthAccounts.find(
              (e) => e.assetId == item.assetId,
            );
            if (assetEthAccount) {
              await assetEthAccount.update({
                quantity: item.quantity,
                ownerAddress: options.ownerAddress,
                contractId: item.contractId,
              });
            } else {
              assetEthAccount = await this.assetAsEthAccountRepository.create({
                assetId: item.assetId,
                quantity: item.quantity,
                ownerAddress: options.ownerAddress,
                contractId: item.contractId,
              });
            }
            if (assetEthAccount) {
              newAssetEthAccountsIds.push(assetEthAccount.id);
            }
          }
        },
      );

      // compress oldAssetEthAccountsIds and newAssetEthAccountsIds
      // delete oldAssetEthAccountsIds not in newAssetEthAccountsIds
      const deleteAssetEthAccountsIds = _.difference(
        oldAssetEthAccountsIds,
        newAssetEthAccountsIds,
      );
      this.logger.debug(
        `newAssetEthAccountsIds ${JSON.stringify(newAssetEthAccountsIds)}`,
      );
      this.logger.debug(
        `deleteAssetEthAccountsIds ${JSON.stringify(
          deleteAssetEthAccountsIds,
        )}`,
      );
      await this.assetAsEthAccountRepository.destroy({
        where: {
          id: { [Op.in]: deleteAssetEthAccountsIds },
        },
      });
    } catch (err) {
      this.logger.error(err);
      return Promise.resolve();
    }
    this.logger.debug('updateAssetsByQueue end ...');
  }

  async getAssetsByContractAddress(
    options: GetAssetByContractQuery,
  ): Promise<FindResponse> {
    try {
      if (options.page <= 0) {
        throw new Error('options.page must gt 0');
      }

      if (options.limit <= 0) {
        throw new Error('options.limit must gt 0');
      }

      const contract = await this.contractRepository.findOne({
        where: {
          address: options.contractAddress,
          chainId: options.chainId,
        },
      });

      if (!contract) {
        throw new Error('contract not found');
      }

      const { count, rows } = await this.assetRepository.findAndCountAll({
        where: {
          contractId: contract.id,
          ...(options.traits && {
            id: {
              [Op.in]: this.traitService.getTraitLiteral(options.traits),
            },
          }),
        },
        include: [
          { model: Contract },
          {
            model: AssetAsEthAccount,
            where: {
              quantity: {
                [Op.ne]: '0',
              },
            },
            order: [['quantity', 'DESC']],
            limit: 50,
          },
        ],
        limit: options.limit,
        offset: (options.page - 1) * options.limit,
        replacements: {
          chainId: options.chainId,
          contractAddress: options.contractAddress,
          ...(options.traits && this.traitService.getParameter(options.traits)),
        },
      });

      return {
        rows,
        count,
      };
    } catch (err) {
      this.logger.error(err);
      return promise.reject(err);
    }
  }

  async getAssetsByUsername(
    username: string,
    chainId: string | null,
    limit: number,
    page: number,
  ) {
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

      if (wallets.length === 0) {
        return {
          rows: [],
          count: 0,
        };
      }

      const ownerAddressList = _.map(wallets, (wallet) => {
        return wallet.address.toLowerCase();
      });

      const assets = await this.assetAsEthAccountRepository.findAll({
        where: {
          ownerAddress: ownerAddressList,
        },
      });

      if (assets.length === 0) {
        return {
          rows: [],
          count: 0,
        };
      }

      const assetIds = _.map(assets, (asset) => {
        return asset.assetId;
      });

      const assetQuery: WhereOptions = {
        id: assetIds,
      };

      if (chainId) {
        assetQuery.chainId = chainId;
      }

      const results = await this.findAssetsAndCountByQuery(
        assetQuery,
        limit,
        page,
      );

      let rows = results.rows;
      const count = results.count;

      rows = await promise.map(
        rows,
        async (asset) => {
          if (!asset.Contract) {
            return null;
          }

          const collection = await this.getAssetCollection(asset);
          asset.Collection = collection;

          const assetOrder = await this.getAssetOrderInfo(asset.id);
          asset.order = assetOrder;

          return asset;
        },
        { concurrency: 10 },
      );

      return {
        rows,
        count,
      };
    } catch (err) {
      this.logger.error(err);
      return promise.reject(err);
    }
  }

  @Cacheable({
    key: 'update-asset-owners',
    seconds: 60 * 10,
  })
  async updateAssetOwners(options: UpdateAssetsMetadataFromQueue) {
    let totalOwners = '0';
    const asset = await this.assetRepository.findOne({
      attributes: ['id', 'totalOwners'],
      where: {
        chainId: options.chainId,
        tokenId: options.tokenId,
      },
      include: [
        {
          attributes: ['id', 'schemaName'],
          model: Contract,
          where: {
            address: options.contractAddress.toLowerCase(),
            chainId: options.chainId,
          },
        },
      ],
    });

    if (!asset) {
      this.logger.debug(
        `updateAssetOwners asset not found ${options.chainId}/${options.contractAddress}/${options.tokenId}`,
      );
      return false;
    }
    if (asset.Contract.schemaName != ContractType.ERC1155) {
      this.logger.debug(
        `updateAssetOwners asset not erc1155 ${options.chainId}/${options.contractAddress}/${options.tokenId}`,
      );
      return false;
    }

    if (options.chainId != '5000') {
      try {
        totalOwners = await this.gatewayService.getAssetTotalOwners(
          options.chainId,
          options.contractAddress,
          options.tokenId,
        );
      } catch (err) {
        this.logger.debug(
          `updateAssetOwners getAssetTotalOwners error ${options.chainId}/${options.contractAddress}/${options.tokenId}`,
        );
        totalOwners = (
          await this.assetAsEthAccountRepository.count({
            where: {
              assetId: asset.id,
            },
          })
        ).toString();
      }
    } else {
      totalOwners = (
        await this.assetAsEthAccountRepository.count({
          where: {
            assetId: asset.id,
          },
        })
      ).toString();
    }

    if (asset.totalOwners === +totalOwners) {
      this.logger.debug(
        `updateAssetOwners totalOwners not changed ${options.chainId}/${options.contractAddress}/${options.tokenId}`,
      );
      return false;
    }

    this.logger.debug(
      `updateAssetOwners totalOwners changed ${options.chainId}/${options.contractAddress}/${options.tokenId} ${asset.totalOwners} -> ${totalOwners}`,
    );
    asset.set({
      totalOwners: totalOwners,
    });
    asset.save({ silent: true });
    return true;
  }

  // this function is deprecated
  async updateAssetOwnersByQueue(options: UpdateAssetsMetadataFromQueue) {
    let owners = [];
    const totalOwners = await this.gatewayService.getAssetTotalOwners(
      options.chainId,
      options.contractAddress,
      options.tokenId,
    );

    const asset = await this.assetRepository.findOne({
      attributes: ['id', 'totalOwners'],
      where: {
        chainId: options.chainId,
        tokenId: options.tokenId,
      },
      include: [
        {
          model: Contract,
          where: {
            address: options.contractAddress.toLowerCase(),
            chainId: options.chainId,
          },
        },
      ],
    });

    if (!asset) {
      return;
    }

    const result = await this.gatewayService.getNftOwnersByTokenId(
      options.chainId,
      options.contractAddress,
      options.tokenId,
      Priority.LOW,
      +totalOwners,
    );

    owners = result.result;

    const { id: assetId, contractId } = await this.assetRepository.findOne({
      where: {
        chainId: options.chainId,
        tokenId: options.tokenId,
      },
      include: [
        {
          model: Contract,
          where: {
            address: options.contractAddress.toLowerCase(),
            chainId: options.chainId,
          },
        },
      ],
    });

    await this.assetAsEthAccountRepository.destroy({
      where: {
        assetId,
      },
    });

    await this.assetAsEthAccountRepository.bulkCreate(
      owners.map((owner) => ({
        assetId,
        ownerAddress: owner.ownerAddress,
        quantity: owner.amount,
        contractId,
      })),
    );
  }

  // return asset simple info, blocked collection asset are not filtered out
  async getAssetSimpleInfo(assetKey: AssetKey): Promise<SimpleAsset> {
    const asset = await this.assetRepository.findOne({
      attributes: ['id', 'name', 'imageUrl', 'imagePreviewUrl'],
      where: {
        chainId: assetKey.chainId,
        tokenId: assetKey.tokenId,
      },
      include: [
        {
          model: Contract,
          attributes: ['id', 'address'],
          where: {
            address: assetKey.contractAddress,
            chainId: assetKey.chainId,
          },
        },
      ],
    });

    if (!asset) {
      return null;
    }

    return {
      contractAddress: asset.Contract.address,
      tokenId: asset.tokenId,
      chainId: assetKey.chainId,
      name: asset.name,
      imageUrl: asset.imageUrl,
      imagePreviewUrl: asset.imagePreviewUrl,
    };
  }

  async getAssetDetailInfo(opts: FindByFamily) {
    const chainId: string = await this.libsService.findChainIdByChainShortName(
      opts.chainShortName,
    );
    const asset = await this.assetRepository.findOne({
      attributes: ['id'],
      where: {
        chainId,
        tokenId: opts.tokenId,
      },
      include: [
        {
          model: Contract,
          as: 'Contract',
          where: {
            chainId,
            address: opts.contractAddress,
          },
        },
      ],
    });
    const _findAssetDetailById = async (assetId) => {
      const extra = await this.assetExtraRepository.findOne({
        where: { assetId: assetId },
        include: [
          { model: Collection, as: 'Collection', required: false },
          { model: Asset, as: 'Asset', required: false },
          { model: Contract, as: 'Contract', required: false },
        ],
      });
      if (
        extra.block === BlockStatus.BLOCKED ||
        extra.Collection.block === BlockStatus.BLOCKED
      ) {
        throw new HttpException(
          'Asset has been blocked.',
          HttpStatus.FORBIDDEN,
        );
      }
      const assetInfo: any = { ...extra.Asset.toJSON() };
      assetInfo.Contract = extra.Contract;
      assetInfo.Collection = extra.Collection;
      assetInfo.collectionOwnerAddress = extra.Collection.ownerAddress;
      // const assetAsEthAccounts = await this.assetAsEthAccountRepository.findAll(
      //   {
      //     attributes: ['id', 'quantity'],
      //     where: { assetId: assetId },
      //   },
      // );
      // const total: BigNumber = assetAsEthAccounts.reduce(
      //   (acc, assetAsEthAccount) => {
      //     return acc.plus(assetAsEthAccount.quantity);
      //   },
      //   new BigNumber(0),
      // );
      assetInfo.total = extra.Asset.totalOwners.toString();

      assetInfo.viewCount = extra.viewCount;
      assetInfo.rarityRanking = extra.rarityRanking;

      return assetInfo;
    };

    if (asset) {
      this.checkAssetOrderStatus(asset.id);
      this.updateAssetOwners({
        chainId: chainId as ChainId,
        contractAddress: opts.contractAddress,
        tokenId: opts.tokenId,
      });
      return _findAssetDetailById(asset.id);
    } else {
      this.logger.warn('asset not found');
      const newAsset = await this.assetDao.syncAssetOnChain({
        contractAddress: opts.contractAddress,
        chainId: chainId as any,
        tokenId: opts.tokenId,
      });
      if (!newAsset) {
        throw new HttpException('Asset not found', 404);
      }
      return _findAssetDetailById(newAsset.id);
    }
  }

  /**
   * update order status if transactions occur on other platforms
   * @param assetId
   */
  async checkAssetOrderStatus(assetId: string) {
    this.logger.debug('checkAssetOrderStatus');
    const extra = await this.assetExtraRepository.findOne({
      where: { assetId: assetId },
      include: [
        { model: Collection, as: 'Collection', required: false },
        { model: Asset, as: 'Asset', required: false },
        { model: Contract, as: 'Contract', required: false },
        { model: SeaportOrder, as: 'bestListingOrder', required: false },
        { model: SeaportOrder, as: 'bestOfferOrder', required: false },
      ],
    });
    const order = extra.bestListingOrder;
    // const order = extra.bestOfferOrder;
    if (order) {
      const orderOffer = order.offerer;
      const _updateOrderStatus = async (
        extraId: string,
        seaportOrderId: string,
      ) => {
        this.logger.debug(
          `_updateOrderStatus extraId ${extraId} seaportOrderId ${seaportOrderId}`,
        );
        // update order
        await this.seaportOrderRepository.update(
          { isFillable: false },
          { where: { id: extra.bestListingOrderId } },
        );
        // update extra
        await this.assetExtraRepository.update(
          {
            bestListingOrderId: null,
            bestListingSymbol: '',
            bestListingPerPrice: null,
            bestListingPlatform: null,
          },
          { where: { id: extraId } },
        );
      };
      if (extra.Contract.schemaName === ContractType.ERC721) {
        const owners = await this.gatewayService.getOwnersByTokenOnChain(
          extra.Asset.chainId.toString(),
          extra.Contract.address,
          extra.Asset.tokenId,
        );
        if (owners && owners.length > 0) {
          const ownerAddress = owners[0].ownerAddress.toLowerCase();
          this.logger.debug(
            `orderOffer ${orderOffer} ownerAddress ${ownerAddress}`,
          );
          if (orderOffer.toLowerCase() !== ownerAddress) {
            await _updateOrderStatus(extra.id, extra.bestListingOrderId);
          }
        }
      } else if (extra.Contract.schemaName === ContractType.ERC1155) {
        const balance = await this.gatewayService.get1155BalanceOf(
          extra.chainId.toString() as ChainId,
          extra.Contract.address,
          orderOffer,
          extra.Asset.tokenId.toString(),
        );
        const orderAsset = await this.seaportOrderAssetRepository.findOne({
          attributes: ['startAmount'],
          where: {
            seaportOrderId: order.id,
          },
        });
        this.logger.debug(
          `orderOffer ${orderOffer} balance ${balance}, startAmount ${orderAsset.startAmount} `,
        );
        if (
          new BigNumber(balance).comparedTo(
            new BigNumber(orderAsset.startAmount),
          ) === -1
        ) {
          await _updateOrderStatus(extra.id, extra.bestListingOrderId);
        }
      }
    }
  }

  async findAssetsAndCountByQuery(
    query: WhereOptions,
    limit: number,
    page: number,
  ) {
    return await this.assetRepository.findAndCountAll({
      where: query,
      // distinct: true,
      include: [
        {
          model: Contract,
          as: 'Contract',
        },
        // {
        //   model: AssetAsEthAccount,
        //   include: [
        //     {
        //       model: Wallet,
        //       include: [{ model: Account }],
        //     },
        //   ],
        //   order: [
        //     ['updatedAt', 'DESC'],
        //     ['quantity', 'DESC'],
        //   ],
        //   limit: 50,
        // },
        {
          attributes: ['id'],
          model: AssetExtra,
          where: {
            block: BlockStatus.NORMAL,
          },
        },
      ],
      order: [
        ['createdAt', 'DESC'],
        // [AssetAsEthAccount, 'updatedAt', 'DESC'], TODO: not work, need support this.
        [Contract, 'address'],
        // ['token_id', 'ASC'],
      ],
      limit,
      offset: (page - 1) * limit,
    });
  }

  async exploreAssetsByOpts(opts: ExploreAssetsByOpt) {
    try {
      const query: WhereOptions = {
        chainId: opts.chainId,
      };

      // keywords
      if (opts.keywords && opts.keywords.length > 0) {
        // 取得 asset name 模糊比對結果
        const ilikeAssetNameQuery = opts.keywords.map((keyword) => {
          return {
            name: {
              [Op.iLike]: `%${keyword}%`,
            },
          };
        });
        const assetsList = await this.assetRepository.findAll({
          where: {
            [Op.or]: ilikeAssetNameQuery,
          },
        });
        const assetIds = _.map(assetsList, (asset) => {
          return asset.id;
        });

        // 取得 contract name 模糊比對結果
        const ilikeContractNameQuery = opts.keywords.map((keyword) => {
          return {
            name: {
              [Op.iLike]: `%${keyword}%`,
            },
          };
        });
        const contractListByName = await this.contractRepository.findAll({
          where: {
            [Op.or]: ilikeContractNameQuery,
          },
        });
        const contractListByNameIds = await _.map(
          contractListByName,
          (contract) => {
            return contract.id;
          },
        );

        // 取得 contract address 結果
        const ilikeContractAddressQuery = opts.keywords.map((keyword) => {
          return {
            address: keyword,
          };
        });
        const contractListByAddress = await this.contractRepository.findAll({
          where: {
            [Op.or]: ilikeContractAddressQuery,
          },
        });
        const contractListByAddressIds = _.map(
          contractListByAddress,
          (contract) => {
            return contract.id;
          },
        );

        // 合併 contract name & contract address
        const contractIds = _.concat(
          contractListByNameIds,
          contractListByAddressIds,
        );

        const assetByContractIds = await this.assetRepository.findAll({
          where: {
            contractId: contractIds,
          },
        });
        const assetIdsByContractIds = _.map(assetByContractIds, (asset) => {
          return asset.id;
        });

        query['$or'] = [
          {
            id: _.concat(assetIds, assetIdsByContractIds),
          },
        ];
      }

      // order status
      if (opts.orderStatus) {
        const currencyWhere: WhereOptions = {};
        let currency: Currency;
        if (opts.priceSymbol) {
          currencyWhere.symbol = opts.priceSymbol;
          currency = await this.currencyRepository.findOne({
            where: currencyWhere,
            include: [
              {
                model: Blockchain,
                where: {
                  chainId: opts.chainId,
                },
              },
            ],
          });
        }

        const ordersWhere: WhereOptions = {};
        if (opts.priceMin && opts.priceMax) {
          ordersWhere.price = {
            [Op.between]: [opts.priceMin, opts.priceMax],
          };
        } else if (opts.priceMin) {
          ordersWhere.price = {
            [Op.gte]: opts.priceMin,
          };
        } else if (opts.priceMax) {
          ordersWhere.price = {
            [Op.lte]: opts.priceMax,
          };
        }
        ordersWhere.category = opts.orderStatus
          ? opts.orderStatus
          : Category.LISTING;
        ordersWhere.isFillable = true;

        let orders: SeaportOrder[];
        if (currency) {
          orders = await this.seaportOrderRepository.findAll({
            where: ordersWhere,
            include: [
              {
                model: SeaportOrderAsset,
                where: {
                  currencyId: currency.id,
                },
              },
            ],
          });
        } else {
          orders = await this.seaportOrderRepository.findAll({
            where: ordersWhere,
          });
        }

        const orderAssets = await this.seaportOrderAssetRepository.findAll({
          where: {
            seaportOrderId: _.map(orders, (order) => {
              return order.id;
            }),
            currencyId: null,
          },
        });

        const assetIds = _.map(orderAssets, (orderAsset) => {
          return orderAsset.assetId;
        });

        if (query['$or']) {
          // Use the intersection in lodash to merge the original query with the new query
          // https://lodash.com/docs/4.17.15#intersectionWith
          query['$or'][0].id = _.intersectionWith(
            query['$or'][0].id,
            assetIds,
            _.isEqual,
          );
        } else {
          query['$or'] = [
            {
              id: assetIds,
            },
          ];
        }
      }

      if (
        opts.traits &&
        opts.traits.length > 0 &&
        opts.collectionSlugs.length === 1
      ) {
        const assetIds = await this.traitService.getAssetIdsByTraits({
          collectionSlug: opts.collectionSlugs[0],
          traits: opts.traits,
        });

        if (query['$or']) {
          query['$or'][0].id = _.intersectionWith(
            query['$or'][0].id,
            assetIds,
            _.isEqual,
          );
        } else {
          query['$or'] = [
            {
              id: assetIds,
            },
          ];
        }
      }

      if (opts.username) {
        const user = await this.accountRepository.findOne({
          where: {
            username: opts.username,
          },
          include: [
            {
              model: Wallet,
            },
          ],
        });

        if (!user) {
          return {
            rows: [],
            count: 0,
          };
        }

        const userAssets = await this.assetAsEthAccountRepository.findAll({
          where: {
            ownerAddress: user.wallets.map((wallet) => {
              return wallet.address;
            }),
          },
        });

        const assetIds = _.map(userAssets, (userAsset) => {
          return userAsset.assetId;
        });

        if (query['$or']) {
          query['$or'][0].id = _.intersectionWith(
            query['$or'][0].id,
            assetIds,
            _.isEqual,
          );
        } else {
          query['$or'] = [
            {
              id: assetIds,
            },
          ];
        }
      }

      if (opts.collectionSlugs) {
        const collections = await this.collectionRepository.findAll({
          where: {
            slug: opts.collectionSlugs,
          },
        });

        const contractPromises = collections.map(async (collection) => {
          const chainId = await this.libsService.findChainIdByChainShortName(
            collection.chainShortName,
          );
          return {
            chainId,
            address: collection.contractAddress,
          };
        });

        const contractConditions = await Promise.all(contractPromises);

        const contracts = await this.contractRepository.findAll({
          where: {
            [Op.or]: contractConditions,
          },
        });

        const contractIds = _.map(contracts, (contract) => {
          return contract.id;
        });

        const assets = await this.assetRepository.findAll({
          where: {
            contractId: contractIds,
          },
        });

        const assetIds = _.map(assets, (asset) => {
          return asset.id;
        });

        if (query['$or']) {
          query['$or'][0].id = _.intersectionWith(
            query['$or'][0].id,
            assetIds,
            _.isEqual,
          );
        } else {
          query['$or'] = [
            {
              id: assetIds,
            },
          ];
        }
      }

      const { rows: assets, count } = await this.findAssetsAndCountByQuery(
        query,
        opts.limit,
        opts.page,
      );

      let rows = assets;

      // Batch fetch collections
      const collections = await this.getAssetsCollections(rows);
      const collectionMap = new Map<string, Collection>();
      collections.forEach((c) => {
        if (c && c.contractAddress) {
          collectionMap.set(
            `${c.chainId}-${c.contractAddress.toLowerCase()}`,
            c,
          );
        }
      });

      const assetIds = rows.map((r) => r.id);
      // Batch fetch orders
      const ordersMap = await this.getAssetsOrderInfo(assetIds);

      rows = await promise.map(
        rows,
        async (asset) => {
          if (!asset.Contract) {
            return null;
          }

          // Match collection
          const key = `${asset.Contract.chainId
            }-${asset.Contract.address.toLowerCase()}`;
          let collection = collectionMap.get(key);

          // Fallback if not found or needs update (preserve original logic)
          if (
            !collection ||
            collection.ownerAddress === 'eth' ||
            !collection.ownerAddress
          ) {
            collection = await this.getAssetCollection(asset);
          }
          asset.Collection = collection;

          // Match orders
          asset.order = ordersMap[asset.id] || { listing: null, offer: null };

          return asset;
        },
        { concurrency: 10 },
      );

      return {
        assets,
        count,
      };
    } catch (err) {
      this.logger.error(err);
      return promise.reject(err);
    }
  }

  async getAssetsCollections(assets: Asset[]) {
    if (!assets || assets.length === 0) {
      return [];
    }

    const conditions = assets.map((asset) => ({
      contractAddress: asset.Contract.address,
      chainId: asset.Contract.chainId,
    }));

    // Deduplicate conditions
    const uniqueConditions = _.uniqWith(conditions, _.isEqual);

    const collections = await this.collectionRepository.findAll({
      where: {
        [Op.or]: uniqueConditions,
      },
    });

    return collections;
  }

  async getAssetsOrderInfo(assetIds: string[]) {
    if (!assetIds || assetIds.length === 0) {
      return {};
    }

    // Fetch AssetExtra with bestListingOrder and bestOfferOrder
    const assetExtras = await this.assetExtraRepository.findAll({
      where: {
        assetId: {
          [Op.in]: assetIds,
        },
      },
      include: [
        {
          model: SeaportOrder,
          as: 'bestListingOrder',
        },
        {
          model: SeaportOrder,
          as: 'bestOfferOrder',
        },
      ],
    });

    const result = {};
    assetIds.forEach((id) => {
      result[id] = { listing: null, offer: null };
    });

    assetExtras.forEach((extra) => {
      if (extra.bestListingOrder) {
        result[extra.assetId].listing = {
          offerer: extra.bestListingOrder.offerer,
          price: extra.bestListingOrder.price,
          priceSymbol: extra.bestListingSymbol,
          hash: extra.bestListingOrder.hash,
          category: extra.bestListingOrder.category,
          startTime: new Date(extra.bestListingOrder.startTime * 1000),
          endTime: new Date(extra.bestListingOrder.endTime * 1000),
          platformType: extra.bestListingPlatformType,
        };
      }

      if (extra.bestOfferOrder) {
        result[extra.assetId].offer = {
          offerer: extra.bestOfferOrder.offerer,
          price: extra.bestOfferOrder.price,
          priceSymbol: extra.bestOfferSymbol,
          hash: extra.bestOfferOrder.hash,
          category: extra.bestOfferOrder.category,
          startTime: new Date(extra.bestOfferOrder.startTime * 1000),
          endTime: new Date(extra.bestOfferOrder.endTime * 1000),
          platformType: extra.bestOfferPlatformType,
        };
      }
    });

    return result;
  }

  async getAssetCollection(asset: Asset) {
    const existCollection = await this.collectionRepository.findOne({
      where: {
        contractAddress: asset.Contract.address,
        chainId: asset.Contract.chainId,
      },
    });

    if (existCollection) {
      // if ownerAddress is eth, mean not found ownerAddress, find it again
      if (
        existCollection.ownerAddress === 'eth' ||
        !existCollection.ownerAddress
      ) {
        const contractOwnerAddress = await this.collectionDao.getContractOwner(
          asset.Contract.chainId as any,
          asset.Contract.address,
        );

        await this.collectionRepository.update(
          {
            ownerAddress: contractOwnerAddress,
          },
          {
            where: {
              id: existCollection.id,
            },
          },
        );
      }
      return existCollection;
    }

    // if collection not exist, create new collection
    const chainShortName = await this.libsService.findChainShortNameByChainId(
      asset.Contract.chainId,
    );
    const collection = await this.collectionDao.findOrCreateCollection({
      chainShortName: chainShortName,
      contractAddress: asset.Contract.address,
    });

    return collection;
  }

  async getAssetOrderInfo(assetId: string) {
    const result = await this.getAssetsOrderInfo([assetId]);
    return result[assetId] || { listing: null, offer: null };
  }

  async updateAssetTotalOwners(
    contractAddress: string,
    tokenId: string,
    chainId: ChainId,
  ) {
    const asset = await this.assetRepository.findOne({
      attributes: ['id', 'totalOwners'],
      where: {
        tokenId,
        chainId,
      },
      include: [
        {
          attributes: ['id', 'schemaName'],
          model: Contract,
          where: {
            address: contractAddress,
          },
        },
      ],
    });

    if (!asset) {
      return;
    }

    // get owners count by Moralis
    const totalOwners = await this.gatewayService.getAssetTotalOwners(
      chainId,
      contractAddress,
      tokenId,
    );

    asset.totalOwners = +totalOwners;
    asset.save({ silent: true });
  }

  async syncAssetUserHolding(query: GetAssetUserHolding) {
    // check have ownerAddress or username
    if (!query.ownerAddress && !query.username) {
      throw new HttpException(
        'ownerAddress or username is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const walletAddresses = [];

    if (query.ownerAddress) {
      walletAddresses.push(query.ownerAddress);
    }

    if (query.username) {
      const wallets = await this.walletRepository.findAll({
        attributes: ['address'],
        include: [
          {
            model: Account,
            attributes: ['username'],
            where: {
              username: query.username,
            },
          },
        ],
      });

      if (!wallets.length) {
        return;
      }

      walletAddresses.push(...wallets.map((wallet) => wallet.address));
    }

    const asset = await this.assetRepository.findOne({
      attributes: ['id'],
      where: {
        tokenId: query.tokenId,
        chainId: query.chainId,
      },
      include: [
        {
          model: Contract,
          attributes: ['id', 'schemaName'],
          where: {
            address: query.contractAddress,
            chainId: query.chainId,
          },
        },
      ],
    });

    if (!asset) {
      throw new HttpException('asset not found', HttpStatus.BAD_REQUEST);
    }

    if (asset.Contract.schemaName === ContractType.ERC721) {
      const owner = (
        await this.gatewayService.getOwnersByTokenOnChain(
          query.chainId,
          query.contractAddress,
          query.tokenId,
        )
      )[0]?.ownerAddress?.toLowerCase();

      await this.updateAssetOwnershipByAssetId({
        assetId: asset.id,
        ownerAddress: owner,
        amount: '1',
        schemaName: ContractType.ERC721,
      });

      return walletAddresses.map((walletAddress) => {
        return {
          ownerAddress: walletAddress,
          amount: owner === walletAddress ? '1' : '0',
        };
      });
    } else if (asset.Contract.schemaName === ContractType.ERC1155) {
      const ownersAmount: { ownerAddress: string; amount: string }[][] =
        promise.map(walletAddresses, async (walletAddress) => {
          return await this.gatewayService.getOwnersByTokenOnChain(
            query.chainId,
            query.contractAddress,
            query.tokenId,
            walletAddress,
          );
        });

      const returnOwnersAmount = ownersAmount.map((owner) => {
        this.updateAssetOwnershipByAssetId({
          assetId: asset.id,
          ownerAddress: owner[0].ownerAddress.toLowerCase(),
          amount: owner[0].amount,
          schemaName: asset.Contract.schemaName as ContractType,
        });

        return {
          ownerAddress: owner[0].ownerAddress.toLowerCase(),
          amount: owner[0].amount,
        };
      });

      return returnOwnersAmount;
    }
  }

  async getAssetUserHolding(query: GetAssetUserHolding): Promise<string> {
    // if no ownerAddress and username, return
    if (!query.ownerAddress && !query.username) {
      return;
    }

    if (query.ownerAddress) {
      const assetAsEthAccount = await this.assetAsEthAccountRepository.findOne({
        include: [
          {
            model: Asset,
            where: {
              tokenId: query.tokenId,
              chainId: query.chainId,
            },
            include: [
              {
                model: Contract,
                where: {
                  address: query.contractAddress,
                },
              },
            ],
          },
          {
            model: Wallet,
            where: {
              address: query.ownerAddress,
            },
          },
        ],
      });

      if (!assetAsEthAccount) {
        return;
      }

      return assetAsEthAccount.quantity;
    }

    if (query.username) {
      const wallets = await this.walletRepository.findAll({
        include: [
          {
            model: Account,
            where: {
              username: query.username,
            },
          },
        ],
      });

      if (!wallets.length) {
        return;
      }

      const walletAddresses = wallets.map((wallet) => wallet.address);
      const assetAsAccount = await this.assetAsEthAccountRepository.findOne({
        include: [
          {
            model: Asset,
            where: {
              tokenId: query.tokenId,
              chainId: query.chainId,
            },
            include: [
              {
                model: Contract,
                where: {
                  address: query.contractAddress,
                },
              },
            ],
          },
        ],
        where: {
          ownerAddress: {
            [Op.in]: walletAddresses,
          },
        },
      });

      if (!assetAsAccount) {
        return;
      }

      return assetAsAccount.quantity;
    }
  }

  parseAsset(asset) {
    return {
      contractId: asset.Contract?.id,
      contractName: asset.Contract?.name,
      contractAddress: asset.Contract?.address,
      contractType: asset.Contract?.schemaName,
      contractChainId: asset.Contract?.chainId,
      assetId: asset.id,
      assetName: asset.name,
      assetImageUrl: asset.imageUrl,
      assetImagePreviewUrl: asset.imagePreviewUrl,
      assetAnimationUrl: asset.animationUrl,
      assetAnimationType: asset.animationType,
      assetDescription: asset.description,
      assetBackgroundColor: asset.backgroundColor,
      assetExternalUrl: asset.externalUrl,
      assetTraits: asset.traits,
      assetXTraits: asset.Xtraits,
      assetTokenUri: asset.tokenUri,
      assetImageData: 'TBD',
      assetTokenId: asset.tokenId,
      assetTotalOwners: asset.totalOwners,
      assetTotalAmount: asset.totalAmount,
      assetLikesCount: asset.likesCount,
      collectionId: asset.Collection?.id,
      collectionChainShortName: asset.Collection?.chainShortName,
      collectionSlug: asset.Collection?.slug,
      collectionName: asset.Collection?.name,
      collectionContractAddress: asset.Collection?.contractAddress,
      collectionServiceFee: asset.Collection?.serviceFee,
      collectionCreatorFee: asset.Collection?.creatorFee,
      collectionOwnerAddress: asset.Collection?.ownerAddress,
      collectionLogoImageUrl: asset.Collection?.logoImageUrl,
      collectionExternalLinks: asset.Collection?.externalLinks,
      collectionIsVerified: asset.Collection?.isVerified,
      owners: asset.AssetAsEthAccount?.map((owner) => {
        return {
          username: owner.Wallet?.Account?.username,
          avatarUrl: owner.Wallet?.Account?.avatarUrl,
          ownerAddress: owner.ownerAddress,
          quantity: owner.quantity,
          updatedAt: owner.updatedAt,
        };
      }),
      order: asset.order ? asset.order : null,
    };
  }

  async getAssetCount(filter: AssetCountDTO) {
    if (filter.username) {
      const count = await this.assetAsEthAccountRepository.count({
        where: {
          '$Wallet.Account.username$': filter.username,
          '$Asset.chain_id$': MAIN_CHAIN_IDS,
        },
        include: [
          { model: Asset, as: 'Asset' },
          { model: Wallet, include: [{ model: Account, as: 'Account' }] },
        ],
      });
      return { count };
    }
  }

  /**
   * sync all nfts of collection by rpc.
   * @param chainId
   * @param contractAddress
   * @param concurrency
   */
  async syncCollection(user: Account, dto: SyncCollectionDTO) {
    this.logger.log(`syncCollection ${user?.id} dto ${JSON.stringify(dto)}`);

    const isInBlacklist = RefreshBlacklist.some(
      (item) =>
        item.chainId === dto.chainId &&
        item.address.toLowerCase() === dto.contractAddress.toLowerCase(),
    );

    if (isInBlacklist) {
      this.logger.log(
        `syncCollection dto ${JSON.stringify(dto)} is in blacklist`,
      );
      return;
    }

    const chainId = dto.chainId as ChainId;
    const contractAddress = dto.contractAddress;
    if (!chainId || !contractAddress) {
      return;
    }

    if (user && false) {
      this.logger.debug('syncCollection admin');
    } else {
      const wallets = await this.walletRepository.findAll({
        attributes: ['address'],
        where: {
          account_id: user.id,
        },
      });

      const collection = await this.collectionRepository.findOne({
        attributes: ['id', 'ownerAddress'],
        where: {
          contractAddress: contractAddress,
          chainId: chainId,
        },
      });
      if (
        collection &&
        wallets &&
        wallets.find(
          (wallet) =>
            wallet.address.toLowerCase() ==
            collection.ownerAddress.toLowerCase(),
        )
      ) {
        this.logger.debug('syncCollection owner of collection');
      } else {
        throw new HttpException('no permission', HttpStatus.FORBIDDEN);
      }
    }

    const cacheKey = `Collection:sysCollection:${chainId}:${contractAddress}`;
    const taskState = await this.cacheService.getCache<boolean>(cacheKey);

    if (dto.cancel) {
      if (taskState) {
        await this.cacheService.delCache(cacheKey);
        return 'Task is canceled';
      } else {
        return 'Task is not running';
      }
    } else {
      if (taskState) {
        // send to slack channel for running task is start
        return 'Task is running';
      }
    }
    // auto close task 12 hour later.
    await this.cacheService.setCache<boolean>(cacheKey, true, 12 * 60 * 60);

    const assets = await this.assetRepository.findAll({
      attributes: ['tokenId', 'imageUrl'],
      where: {
        '$Contract.address$': contractAddress,
        chainId: chainId,
      },
      include: [{ model: Contract, as: 'Contract', attributes: [] }],
      order: [['createdAt', 'DESC']],
      limit: dto.assetNum,
    });
    // this.logger.debug(`assets.length ${assets.length}`);
    // this.logger.debug(`assets ${JSON.stringify(assets)}`);
    const startTime = new Date().getTime();
    let skipCount = 0;
    let syncedCount = 0;

    asyncConcurrent(
      assets,
      async (asset) => {
        const state = await this.cacheService.getCache<boolean>(cacheKey);
        if (!state) {
          throw new Error(
            `syncCollection canceled : ${chainId} ${contractAddress}`,
          );
        }
        if (!dto.force && asset.imageUrl && asset.imageUrl != '') {
          // do not sync asset if metadata is not null
          // this.logger.debug(`imageUrl ${asset.imageUrl}`);
          skipCount++;
          this.logger.log(
            `syncCollection asset ship : ${chainId} ${contractAddress} ${asset.tokenId} skipCount ${skipCount}`,
          );
        } else {
          try {
            const newAsset = await this.assetDao.syncAssetOnChain(
              {
                contractAddress,
                tokenId: asset.tokenId,
                chainId: chainId,
              },
              { rpcEnd: RpcEnd.default },
            );
            syncedCount++;
            this.logger.log(
              `syncCollection asset ok : ${chainId} ${contractAddress} ${asset.tokenId} syncedCount ${syncedCount}`,
            );
          } catch (e) {
            this.logger.error(`${JSON.stringify(e)}`);
          }
        }
      },
      4,
    )
      .then(() => {
        const endTime = new Date().getTime();
        const timespan = Math.round((endTime - startTime) / 1000);
        this.logger.log(
          `syncCollection completed ${chainId} ${contractAddress} cost time ${timespan} second`,
        );

      })
      .catch((e) => {
        // Send syncCollection Error message to Channel
        this.logger.log(`syncCollection error, ${e.toString()}`);
      })
      .finally(async () => {
        this.logger.debug('syncCollection finally');
        await this.cacheService.delCache(cacheKey);
      });
    return 'Task start running';
  }

  /**
   * 給定 assetId, schemaName(contractType), ownerAddress, amount 來更新 asset_as_eth_account 的 ownerAddress
   * 注：如果需要從鏈上拿 ERC1155 的 balance，請使用 transferAssetOwnershipOnchain
   * @param param
   * @returns
   */
  async updateAssetOwnershipByAssetId(param: updateAssetOwnershipByAssetId) {
    this.logger.debug(
      `[updateAssetOwnershipByAssetId] param ${JSON.stringify(param)}`,
    );
    if (!param.assetId) {
      this.logger.debug(
        `[updateAssetOwnershipByAssetId] assetId is required ${JSON.stringify(
          param,
        )}`,
      );
      return false;
    }
    if (!param.schemaName) {
      this.logger.debug(
        `[updateAssetOwnershipByAssetId] schemaName is required ${JSON.stringify(
          param,
        )}`,
      );
      return false;
    }
    if (!param.ownerAddress) {
      this.logger.debug(
        `[updateAssetOwnershipByAssetId] ownerAddress is required ${JSON.stringify(
          param,
        )}`,
      );
      return false;
    }

    const assetId = param.assetId;
    const contractType = param.schemaName;
    const ownerAddress = param.ownerAddress.toLowerCase();

    // ERC721
    if (contractType == ContractType.ERC721) {
      const assetAsEthAccount = await this.assetAsEthAccountRepository.findOne({
        attributes: ['id'],
        where: {
          assetId,
        },
      });

      if (assetAsEthAccount) {
        await this.assetAsEthAccountRepository.update(
          {
            ownerAddress,
          },
          {
            where: {
              id: assetAsEthAccount.id,
            },
          },
        );
      } else {
        const asset = await this.assetRepository.findByPk(assetId, {
          attributes: ['contractId'],
        });
        if (asset) {
          await this.assetAsEthAccountRepository.create({
            assetId,
            ownerAddress,
            quantity: '1',
            contractId: asset.contractId,
          });
        }
      }

      return true;
    }

    // ERC1155
    if (contractType == ContractType.ERC1155) {
      const toAssetAsEthAccount =
        await this.assetAsEthAccountRepository.findOne({
          attributes: ['id', 'quantity'],
          where: {
            assetId,
            ownerAddress,
          },
        });

      //                  | 沒找到資料 | 有找到資料
      // new quantity =0  |   無視    |    刪除
      // new quantity >0  |   新增    |    更新
      if (toAssetAsEthAccount) {
        if (param.amount == '0') {
          await this.assetAsEthAccountRepository.destroy({
            where: {
              id: toAssetAsEthAccount.id,
            },
          });
        } else {
          await this.assetAsEthAccountRepository.update(
            {
              ownerAddress,
              quantity: param.amount,
            },
            {
              where: {
                id: toAssetAsEthAccount.id,
              },
            },
          );
        }
      } else {
        if (param.amount == '0') {
          return false;
        } else {
          const asset = await this.assetRepository.findByPk(assetId, {
            attributes: ['contractId'],
          });
          if (asset) {
            await this.assetAsEthAccountRepository.create({
              assetId,
              ownerAddress,
              quantity: param.amount,
              contractId: asset.contractId,
            });
          }
        }
      }

      this.logger.debug(
        `[updateAssetOwnershipByAssetId] updateAssetOwnershipByAssetId success ${JSON.stringify(
          param,
        )}`,
      );

      return true;
    }
  }

  /**
   * 給定 chainId, contractAddress, tokenId, toAddress, fromAddress 來更新 asset_as_eth_account 的 ownerAddress
   * 會從鏈上拿 ERC1155 的 balance
   * @param param
   * @returns
   */
  @Cacheable({
    key: 'transferAssetOwnershipOnchain',
    seconds: 15,
  })
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
      attributes: ['id'],
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
      const onchainAsset = await this.assetDao.syncAssetOnChain(
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
        attributes: ['id'],
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
        if (fromAddressAmount !== '0') {
          if (fromAssetAsEthAccount.quantity !== fromAddressAmount) {
            await this.assetAsEthAccountRepository.update(
              {
                ownerAddress: fromAddress,
                quantity: fromAddressAmount,
              },
              {
                where: {
                  id: fromAssetAsEthAccount.id,
                },
              },
            );
          }
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
        });
      }

      if (toAssetAsEthAccount) {
        if (toAddressAmount !== '0') {
          if (toAssetAsEthAccount.quantity !== toAddressAmount) {
            await this.assetAsEthAccountRepository.update(
              {
                ownerAddress: toAddress,
                quantity: toAddressAmount,
              },
              {
                where: {
                  id: toAssetAsEthAccount.id,
                },
              },
            );
          }
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
        });
      }

      return true;
    }
  }

  async test(chainId, contractAddress, tokenId) {
    return {
      nftStatus: await this.gatewayService.getNftStatus(
        chainId,
        contractAddress,
        tokenId,
      ),
      collectionStatus: await this.gatewayService.getCollectionStats(
        chainId,
        contractAddress,
      ),
    };
  }

}
