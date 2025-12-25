import { CacheService } from '@/common/cache';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ContractService } from '@/api/v3/contract/contract.service';
import { LibsService, TestnetChainIds } from '@/common/libs/libs.service';
import { Sequelize } from 'sequelize-typescript';
import {
  Asset,
  Contract,
  Collection,
  Currency,
  Blockchain,
  Wallet,
  AssetAsEthAccount,
  Account,
  SeaportOrder,
  SeaportOrderAsset,
  AssetExtra,
  CollectionTradingBoardOneHour,
  CollectionTradingBoardOneDay,
  CollectionTradingBoardOneWeek,
  CollectionTradingBoardOneMonth,
  AssetTraits,
  TradingRecordLog,
  CollectionTradingData,
} from '@/model/entities';
import { FindResponse } from '@/api/v3/asset/asset.interface';
import {
  CollectionListQuery,
  CollectionFindResponse,
  CollectionExtends,
  ExploreCollectionsByOpt,
  CollectionInfo,
  TimeRange,
} from '@/api/v3/collection/collection.interface';
import {
  BestCollectionOfferOrder,
  CacheBestListing,
  Category,
  OfferType,
} from '@/api/v3/order/order.interface';
import { ChainId } from '@/common/utils/types';
import * as sequelize from 'sequelize';
import { Promise as promise } from 'bluebird';
import { Op, QueryTypes, WhereOptions } from 'sequelize';
import { ConfigurationService } from '@/configuration/configuration.service';
import { IPFS_GATEWAY, LOOTEX_ADMIN_WALLET } from '@/common/utils/constants';
import * as _ from 'lodash';
import { InjectModel } from '@nestjs/sequelize';
import { ProviderTokens } from '@/model/providers';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { BlockStatus } from '@/model/entities/constant-model';
import { CollectionDao } from '@/core/dao/collection-dao';
import escapeString from 'escape-sql-string';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { TraitDao } from '@/core/dao/trait-dao';
import * as mimeTypes from 'mime-types';
import { ethers } from 'ethers';
import {
  COLLECTION_BEST_LISTING_KEY,
  COLLECTION_BEST_OFFER_KEY,
} from '../order/constants';
import { SimpleException } from '@/common/utils/simple.util';
import { OrderDao } from '@/core/dao/order-dao';
import { CollectionTradingBoard } from '@/model/entities/collection-trading-board/collection-trading-board.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Subject } from 'rxjs';
import BigNumber from 'bignumber.js';

const COLLECTION_MASTER_WALLET_ADDRESS =
  '0x0000000000000000000000000000000000000000';

@Injectable()
export class CollectionService implements OnModuleDestroy {
  private destroy$ = new Subject<void>();
  private activeRequests = new Set<AbortController>();

  protected readonly logger = new Logger(CollectionService.name);

  constructor(
    @InjectModel(Asset)
    private assetRepository: typeof Asset,

    @InjectModel(Collection)
    private collectionRepository: typeof Collection,

    @InjectModel(Contract)
    private contractRepository: typeof Contract,

    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,

    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,

    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,

    @InjectModel(AssetTraits)
    private assetTraitsRepository: typeof AssetTraits,

    @InjectModel(Account)
    private readonly accountRepository: typeof Account,

    @InjectModel(CollectionTradingBoardOneHour)
    private collectionTradingBoardOneHourRepository: typeof CollectionTradingBoardOneHour,

    @InjectModel(CollectionTradingBoardOneDay)
    private collectionTradingBoardOneDayRepository: typeof CollectionTradingBoardOneDay,

    @InjectModel(CollectionTradingBoardOneWeek)
    private collectionTradingBoardOneWeekRepository: typeof CollectionTradingBoardOneWeek,

    @InjectModel(CollectionTradingBoardOneMonth)
    private collectionTradingBoardOneMonthRepository: typeof CollectionTradingBoardOneMonth,


    @InjectModel(SeaportOrder)
    private seaportOrderRepository: typeof SeaportOrder,

    @InjectModel(TradingRecordLog)
    private tradingRecordLogRepository: typeof TradingRecordLog,

    @InjectModel(CollectionTradingData)
    private collectionTradingDataRepository: typeof CollectionTradingData,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly collectionDao: CollectionDao,
    private readonly traitDao: TraitDao,
    private readonly orderDao: OrderDao,
    private readonly gatewayService: GatewayService,
    private readonly httpService: HttpService,
    private readonly libsService: LibsService,
    private readonly contractService: ContractService,
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,

  ) { }

  // use to get account created collection
  async getCollectionsByQuery(
    opt: CollectionListQuery,
    searchAccount: Account = null,
  ): Promise<CollectionFindResponse> {
    try {
      const query: WhereOptions = {};

      if (opt.username) {
        const account = await this.accountRepository.findOne({
          where: {
            username: opt.username,
          },
          include: [
            {
              model: Wallet,
            },
          ],
        });

        if (!account) {
          throw new Error(`account username=${opt.username} not found`);
        }

        query.ownerAddress = account.wallets.map((w) => w.address);
      }

      if (opt.chainShortName) {
        query.chainShortName = opt.chainShortName;
      }

      if (opt.holderUsername) {
        const account = await this.accountRepository.findOne({
          where: {
            username: opt.holderUsername,
          },
          include: [
            {
              model: Wallet,
            },
          ],
        });

        if (!account) {
          throw new Error(`account username=${opt.holderUsername} not found`);
        }

        const ownerAssets = await this.assetAsEthAccountRepository.findAll({
          where: {
            ownerAddress: account.wallets.map((w) => w.address),
          },
          include: [
            {
              model: Asset,
              include: [
                {
                  model: Contract,
                },
              ],
            },
          ],
        });

        if (!ownerAssets) {
          throw new Error(
            `assetAsEthAccount accountId=${account.id} not found`,
          );
        }

        const distinctContracts = await Promise.all(
          _.uniq(
            ownerAssets.map(async (asset) => ({
              address: asset.Asset.Contract.address,
              chainShortName:
                await this.libsService.findChainShortNameByChainId(
                  asset.Asset.Contract.chainId,
                ),
            })),
          ),
        );

        if (opt.chainShortName) {
          _.remove(
            distinctContracts,
            (c) => c.chainShortName !== opt.chainShortName,
          );
        }

        query['$or'] = distinctContracts.map((c) => ({
          chainShortName: c.chainShortName,
          contractAddress: c.address,
        }));
      }

      const { count, rows } = await this.collectionRepository.findAndCountAll({
        where: query,
        limit: opt.limit,
        offset: (opt.page - 1) * opt.limit,
      });

      const extendsRows: CollectionExtends[] = await promise.map(
        rows,
        async (row) => {
          row.totalOwners = await this.getCacheTotalOwnersByCollectionId(
            row.id,
          );
          row.totalItems = await this.getCacheTotalItemsByCollectionId(row.id);

          return row;
        },
      );

      return {
        rows: extendsRows,
        count,
      };
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  async getCollectionBySlug(slug: string): Promise<Collection> {
    try {
      this.logger.debug(`slug = ${slug}`);
      let collection = await this.collectionRepository.findOne({
        where: {
          slug,
        },
      });
      this.logger.debug(`collection = ${collection}`);

      if (!collection) {
        collection = await this.collectionDao.findOrCreateCollection({
          chainShortName: slug.split(':')[0],
          contractAddress: slug.split(':')[1],
        });
      }

      if (collection.block === BlockStatus.BLOCKED) {
        throw new HttpException(
          'Collection has been blocked.',
          HttpStatus.FORBIDDEN,
        );
      }
      return collection;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  @Cacheable({
    key: 'collection-simple-by-slug',
    seconds: 10,
  })
  async getCollectionSimpleBySlug(slug: string): Promise<Collection> {
    try {
      this.logger.debug(`slug = ${slug}`);
      const collection = await this.collectionRepository.findOne({
        where: {
          slug,
        },
      });

      if (!collection) {
        throw new HttpException('collection not found', HttpStatus.NOT_FOUND);
      }

      if (collection.block === BlockStatus.BLOCKED) {
        throw new HttpException(
          'Collection has been blocked.',
          HttpStatus.FORBIDDEN,
        );
      }
      return collection;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  @Cacheable({
    key: 'collection-simple-by-address-and-chainId',
    seconds: 30,
  })
  async getCollectionSimpleByAddressAndChainId(
    contractAddress: string,
    chainId: ChainId,
  ): Promise<Collection> {
    try {
      // this.logger.debug(`slug = ${slug}`);
      const collection = await this.collectionRepository.findOne({
        where: {
          contractAddress,
          chainId,
        },
      });

      if (!collection) {
        throw new HttpException('collection not found', HttpStatus.NOT_FOUND);
      }

      if (collection.block === BlockStatus.BLOCKED) {
        throw new HttpException(
          'Collection has been blocked.',
          HttpStatus.FORBIDDEN,
        );
      }
      return collection;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  async getCollectionById(id: string): Promise<Collection> {
    try {
      return this.collectionRepository.findOne({
        where: {
          id,
        },
      });
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  async getCollectionAssetsBySlug(
    slug: string,
    chainId: ChainId,
    limit: number,
    page: number,
  ): Promise<FindResponse> {
    try {
      this.logger.debug(`slug = ${slug}`);
      this.logger.debug(`chainId = ${chainId}`);
      const collection = await this.collectionRepository.findOne({
        where: {
          slug,
        },
      });

      if (!collection) {
        throw new Error('collection not found by slug');
      }

      const results = await this.assetRepository.findAndCountAll({
        where: {},
        include: [
          {
            model: Contract,
            as: 'Contract',
            where: {
              address: collection.contractAddress,
            },
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
            order: [
              ['updatedAt', 'DESC'],
              ['quantity', 'DESC'],
            ],
            limit: 50,
          },
          {
            model: SeaportOrderAsset,
            as: 'SOA',
            required: false,
            duplicating: false,
            include: [
              {
                model: SeaportOrder,
                where: {
                  isFillable: true,
                  [Op.not]: [{ category: Category.OFFER }],
                },
                required: true,
                duplicating: false,
                include: [
                  {
                    model: SeaportOrderAsset,
                    include: [
                      {
                        model: Currency,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
        limit,
        offset: (page - 1) * limit,
      });

      let rows = results.rows;
      const count = results.count;

      rows = await promise.map(rows, async (asset) => {
        return asset;
      });

      return {
        rows,
        count,
      };
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  async myCollections(userId: string): Promise<Collection[]> {
    try {
      this.logger.debug(`userId = ${userId}`);
      const collections = await this.collectionRepository.findAll({
        where: {
          ownerAccountId: userId,
        },
      });
      return collections;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  /**
   * 缓存10min
   * @param collectionId
   * @param quantity
   */
  @Cacheable({ key: 'collections:random-assets', seconds: 600 })
  async getRandomAssets(collectionId: string, quantity = 3): Promise<Asset[]> {
    try {
      const collection = await this.collectionRepository.findOne({
        where: {
          id: collectionId,
        },
      });

      if (!collection) {
        this.logger.debug('collection not found');
        return [];
      }

      const blockchain = await this.blockchainRepository.findOne({
        where: {
          shortName: collection.chainShortName,
        },
      });

      if (!blockchain) {
        this.logger.debug('blockchain not found');
        return [];
      }

      const contract = await this.contractRepository.findOne({
        where: {
          address: collection.contractAddress,
          chainId: blockchain.chainId,
        },
      });

      if (!contract) {
        this.logger.debug('contract not found');
        return [];
      }

      const randomSql = `with ids as(
          SELECT "Asset"."id"
          FROM "asset" AS "Asset"
                   INNER JOIN "asset_extra" AS "AssetExtra"
                              ON "Asset"."id" = "AssetExtra"."asset_id" AND "AssetExtra"."block" = 'Normal'
                   LEFT OUTER JOIN "contract" AS "Contract" ON "Asset"."contract_id" = "Contract"."id"
          WHERE "Asset"."contract_id" = :contractId limit 1000
          )
          SELECT id from ids ORDER BY random() LIMIT :limit`;
      const randomRes: any[] = await this.sequelizeInstance.query(randomSql, {
        replacements: { contractId: contract.id, limit: quantity },
        type: QueryTypes.SELECT,
      });
      const ids = randomRes.map((e) => e.id);
      const assets = await this.assetRepository.findAll({
        where: { id: ids },
        include: [
          {
            model: AssetExtra,
            where: {
              block: BlockStatus.NORMAL,
            },
          },
          {
            model: Contract,
          },
        ],
      });

      return assets;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  /**
   * get and use RPC to sync collection owner address
   * @param slug
   * @returns
   */
  async getCollectionContractOwnerAddress(slug: string): Promise<string> {
    try {
      this.logger.debug(`slug = ${slug}`);
      const collection = await this.collectionRepository.findOne({
        where: {
          slug,
        },
      });

      if (!collection) {
        throw new Error('collection not found');
      }

      const blockchain = await this.blockchainRepository.findOne({
        where: {
          shortName: collection.chainShortName,
        },
      });

      const contract = await this.contractRepository.findOne({
        where: {
          address: collection.contractAddress,
        },
      });

      const chainId = blockchain ? blockchain.chainId : '1';

      const ownerAddress = await this.collectionDao.getContractOwner(
        chainId as any,
        contract?.address || collection.contractAddress,
      );

      // replace db collection.ownerAddress
      collection.set({ ownerAddress });
      await collection.save();

      return ownerAddress;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  async updateCollectionOwnerAccountId(slug: string) {
    const defaultWallet = await this.walletRepository.findOne({
      where: {
        address: this.configService.get(
          'LOOTEX_ADMIN_WALLET',
          LOOTEX_ADMIN_WALLET,
        ),
      },
    });

    const ownerAddress = await this.getCollectionContractOwnerAddress(slug);

    let wallet = await this.walletRepository.findOne({
      where: {
        address: ownerAddress,
      },
    });
    if (!wallet) wallet = defaultWallet;

    const collection = await this.collectionRepository.findOne({
      where: {
        slug,
      },
    });

    if (!collection) {
      throw new Error('collection not found');
    }

    collection.set({ ownerAccountId: wallet.accountId });
    return await collection.save();
  }

  async getCacheTotalOwnersByCollectionId(
    collectionId: string,
    needUpdate = false,
  ): Promise<string> {
    if (needUpdate) {
      this.totalOwners(collectionId, true);
    }

    const cacheTotalOwners = (await this.cacheService.getCache(
      'collection-totalOwners-' + collectionId,
    )) as string;
    if (cacheTotalOwners) {
      return cacheTotalOwners;
    }

    const collection = await this.collectionRepository.findOne({
      attributes: ['id', 'contractAddress', 'chainId'],
      where: {
        id: collectionId,
      },
    });

    if (!collection) {
      throw new Error('collection not found');
    }

    const contract = await this.contractRepository.findOne({
      attributes: ['id', 'totalOwners'],
      where: {
        address: collection.contractAddress,
        chainId: collection.chainId,
      },
    });

    if (!contract.totalOwners) {
      this.totalOwners(collectionId, true);
      return '0';
    } else {
      this.totalOwners(collectionId);
    }

    this.cacheService.setCache(
      'collection-totalOwners-' + collectionId,
      contract.totalOwners,
      60 * 20,
    );

    return contract.totalOwners;
  }

  private activeTotalOwnersUpdates = 0;
  private readonly MAX_CONCURRENT_UPDATES = 1;

  async totalOwners(id: string, isUpdate = false): Promise<string> {
    // 1. Try to get from cache first
    const cachedTotalOwners = await this.cacheService.getCache<string>(
      'collection-totalOwners-' + id,
    );
    if (cachedTotalOwners && !isUpdate) {
      return cachedTotalOwners;
    }

    // Fetch collection to get chainId and contractAddress
    const collection = await this.collectionRepository.findOne({
      where: { id },
      attributes: ['id', 'contractAddress', 'chainId'],
    });

    if (!collection) {
      return '0';
    }

    const chainId = collection.chainId.toString();

    // 2. If Moralis data exists, use it (for non-excluded chains)
    // 5000 = Mantle, 1868 = Soneium
    if (chainId !== '5000' && chainId !== '1868') {
      try {
        const collectionStats = await this.gatewayService.getCollectionStats(
          chainId as ChainId,
          collection.contractAddress,
        );

        if (
          collectionStats &&
          collectionStats.owners &&
          collectionStats.owners.current
        ) {
          // Sync to contract table asynchronously
          const contract = await this.contractRepository.findOne({
            where: { address: collection.contractAddress, chainId },
          });

          if (contract) {
            contract.totalOwners = collectionStats.owners.current;
            contract.save(); // async save
          }

          await this.cacheService.setCache(
            'collection-totalOwners-' + id,
            collectionStats.owners.current,
            60 * 60 * 24, // 24 hours
          );
          return collectionStats.owners.current;
        }
      } catch (err) {
        // Ignore gateway errors, fall back to DB
        this.logger.warn(`Gateway service failed for ${id}: ${err}`);
      }
    }

    // 3. Fallback to DB value (always cache, even if 0)
    const contract = await this.contractRepository.findOne({
      where: {
        address: collection.contractAddress,
        chainId: collection.chainId,
      },
      attributes: ['id', 'totalOwners'],
    });

    if (!contract) {
      return '0';
    }

    // If we have a value in DB (even if it's 0), cache and return it
    if (contract.totalOwners !== null && contract.totalOwners !== undefined) {
      const cacheTTL =
        Number(contract.totalOwners) > 0
          ? 60 * 60 * 24 // 24 hours for non-zero values
          : 60 * 60; // 1 hour for zero values (might be a new collection)

      await this.cacheService.setCache(
        'collection-totalOwners-' + id,
        contract.totalOwners,
        cacheTTL,
      );

      return contract.totalOwners;
    }

    // 4. Only if DB value is null/undefined, trigger background update
    const lockKey = 'collection-totalOwners-lock-' + id;
    const isLocked = await this.cacheService.getCache(lockKey);

    if (!isLocked) {
      await this.cacheService.setCache(lockKey, '1', 60 * 60 * 24); // Lock for 24 hours
      this.updateTotalOwnersInBackground(contract, id).catch((err) => {
        this.logger.error(
          `Background totalOwners update failed for ${id}: ${err}`,
        );
      });
    }

    return '0';
  }

  private async updateTotalOwnersInBackground(contract: Contract, id: string) {
    try {
      const result = (await this.sequelizeInstance.query(
        `
        SELECT COUNT(DISTINCT owner_address) as "totalOwners"
        FROM asset_as_eth_account aea
        JOIN asset a ON a.id = aea.asset_id
        WHERE a.contract_id = :contractId
        `,
        {
          replacements: { contractId: contract.id },
          type: QueryTypes.SELECT,
        },
      )) as { totalOwners: string }[];

      const totalOwners = result[0]?.totalOwners || '0';

      contract.totalOwners = totalOwners;
      await contract.save();

      await this.cacheService.setCache(
        'collection-totalOwners-' + id,
        totalOwners,
        60 * 60 * 24, // 24 hours
      );

      await this.cacheService.setCache(
        'collection-totalOwners-isUpdated-' + id,
        '1',
        60 * 60 * 24, // 24 hours
      );

      await this.cacheService.delCache('collection-totalOwners-lock-' + id);

      // this.logger.log(`Updated totalOwners for collection ${id} in background: ${totalOwners}`);
    } catch (err) {
      this.logger.error(
        `updateTotalOwnersInBackground failed for ${id}: ${err}`,
      );
      // Don't throw, just log, to ensure finally block in caller works (though caller doesn't await)
      // Actually caller does not await, so we should handle error here.
    }
  }

  @Cacheable({
    key: 'collection:totalVolume',
    seconds: 60 * 5,
  })
  async totalVolume(id: string): Promise<number> {
    void id;
    return 0;
  }

  async totalTradingCount(id: string): Promise<number> {
    void id;
    return 0;
  }

  async getCacheTotalItemsByCollectionId(
    collectionId: string,
    needUpdate = false,
  ) {
    if (needUpdate) {
      this.totalItems(collectionId, true);
    }

    const collection = await this.collectionRepository.findOne({
      attributes: [
        'id',
        'contractAddress',
        'chainShortName',
        'chainId',
        'isMinting',
      ],
      where: {
        id: collectionId,
      },
    });

    if (!collection) {
      throw new Error('collection not found');
    }

    // 如果是 minting collection，就算沒有 force update 也要更新
    if (collection.isMinting) {
      this.totalItems(collectionId, true);
    }

    const cacheTotalItems = +(await this.cacheService.getCache(
      'collection-totalItems-' + collectionId,
    )) as number;
    if (cacheTotalItems) {
      return cacheTotalItems;
    }

    const chainId = parseInt(
      await this.libsService.findChainIdByChainShortName(
        collection.chainShortName,
      ),
    );

    const contract = await this.contractRepository.findOne({
      attributes: ['id', 'totalSupply'],
      where: {
        address: collection.contractAddress,
        chainId,
      },
    });

    if (!contract.totalSupply) {
      this.totalItems(collectionId, true);
      return 0;
    } else {
      this.totalItems(collectionId);
    }

    this.cacheService.setCache(
      'collection-totalItems-' + collectionId,
      contract.totalSupply,
      60 * 20,
    );

    return +contract.totalSupply;
  }

  async totalItems(id: string, isUpdate = false): Promise<string> {
    try {
      // cache(20min) > contract.totalSupply > morails totalSupply > db asset count
      const cacheTotalItems = (await this.cacheService.getCache(
        'collection-totalItems-' + id,
      )) as string;
      const needUpdate = !(
        (await this.cacheService.getCache(
          'collection-totalItems-isUpdated-' + id,
        )) == '1'
      );
      if (cacheTotalItems && !isUpdate && needUpdate) {
        return cacheTotalItems;
      }

      const collection = await this.collectionRepository.findOne({
        attributes: ['id', 'contractAddress', 'chainId'],
        where: {
          id,
        },
      });

      if (!collection) {
        throw new Error('collection not found');
      }

      const contract = await this.contractRepository.findOne({
        attributes: ['id', 'totalSupply'],
        where: {
          address: collection.contractAddress,
          chainId: collection.chainId,
        },
      });

      if (!contract.totalSupply || isUpdate) {
        // 從 Moralis/NFTScan 拿
        try {
          const totalSupply =
            +(
              await this.gatewayService.getCollectionStats(
                collection.chainId.toString() as ChainId,
                collection.contractAddress,
              )
            ).total_tokens || 0;

          if (totalSupply > 0) {
            contract.set({ totalSupply });
            contract.save();

            this.cacheService.setCache(
              'collection-totalItems-' + id,
              totalSupply,
              60 * 20,
            );

            this.cacheService.setCache(
              'collection-totalItems-isUpdated-' + id,
              '1',
              60 * 20,
            );

            return totalSupply.toString();
          }
        } catch (err) {
          null;
        }
      } else {
        this.cacheService.setCache(
          'collection-totalItems-' + id,
          contract.totalSupply,
          60 * 20,
        );

        this.cacheService.setCache(
          'collection-totalItems-isUpdated-' + id,
          '1',
          60 * 20,
        );

        return contract.totalSupply;
      }

      const totalSupply =
        (
          (await this.sequelizeInstance.query(
            `SELECT CAST(SUM(CAST(quantity AS NUMERIC(78))) AS VARCHAR) as sum
        FROM asset_as_eth_account
        WHERE contract_id = :contractId
          AND quantity != '0'`,
            {
              replacements: { contractId: contract.id },
              type: QueryTypes.SELECT,
            },
          )) as { sum: string }[]
        )?.[0]?.sum || '0';

      contract.set({ totalSupply });
      contract.save();

      this.cacheService.setCache(
        'collection-totalItems-' + id,
        totalSupply,
        60 * 20,
      );

      this.cacheService.setCache(
        'collection-totalItems-isUpdated-' + id,
        '1',
        60 * 20,
      );

      return totalSupply.toString();
    } catch (err) {
      this.logger.error(err);
      return '0';
    }
  }

  async inManegementCollections(address: string): Promise<Collection[]> {
    try {
      this.logger.debug(`ownerAddress = ${address}`);

      const collectionMasterWallet = await this.walletRepository.findOne({
        where: {
          address: COLLECTION_MASTER_WALLET_ADDRESS,
        },
      });

      if (!collectionMasterWallet) {
        throw new Error('collection master wallet not found');
      }

      const collections = await this.collectionRepository.findAll({
        where: {
          ownerAddress: address,
          ownerAccountId: collectionMasterWallet.accountId,
        },
      });
      return collections;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  async exploreCollectionsByOpts(
    opts: ExploreCollectionsByOpt,
    searchAccount: Account,
  ) {
    try {
      const query: WhereOptions = {};

      if (this.configService.get('NODE_ENV') == 'production') {
        query.chainId = {
          [Op.notIn]: TestnetChainIds,
        };
      }

      if (opts.isVerified) {
        query.isVerified = true;
      }

      if (opts.chainId) {
        query.chainId = opts.chainId;
      }

      if (opts.username) {
        const account = await this.accountRepository.findOne({
          where: {
            username: opts.username,
          },
        });

        if (!account) {
          throw new Error('account not found');
        }

        const wallets = await this.walletRepository.findAll({
          where: {
            accountId: account.id,
            [Op.not]: {
              provider: 'PRIVY_LIBRARY_SA',
            },
          },
        });

        const walletAddresses = wallets.map((wallet) =>
          wallet.address.toLowerCase(),
        );

        if (walletAddresses.length > 0) {
          const assetAsEthAccounts =
            await this.assetAsEthAccountRepository.findAll({
              attributes: [
                [Sequelize.col('Asset.contract_id'), 'contractId'],
              ],
              include: [
                {
                  model: Asset,
                  attributes: [],
                  required: true,
                  where: opts.chainId ? { chainId: opts.chainId } : {},
                },
              ],
              where: {
                [Op.and]: [
                  Sequelize.where(
                    Sequelize.fn(
                      'LOWER',
                      Sequelize.col('AssetAsEthAccount.owner_address'),
                    ),
                    {
                      [Op.in]: walletAddresses,
                    },
                  ),
                  {
                    quantity: {
                      [Op.ne]: '0',
                    },
                  },
                ],
              },
              group: ['Asset.contract_id'],
              raw: true,
            });

          const contractIds = assetAsEthAccounts
            .map((a: any) => a.contractId)
            .filter((id) => id);

          if (contractIds.length > 0) {
            const contracts = await this.contractRepository.findAll({
              attributes: ['address'],
              where: {
                id: contractIds,
              },
              raw: true,
            });
            query.contractAddress = contracts.map((c: any) => {
              return Buffer.isBuffer(c.address)
                ? c.address.toString('utf8')
                : c.address;
            });
          } else {
            query.contractAddress = [];
          }
        } else {
          query.contractAddress = [];
        }
      }

      if (opts.walletAddress) {
        const walletAddress = opts.walletAddress.toLowerCase();

        const assetAsEthAccounts =
          await this.assetAsEthAccountRepository.findAll({
            attributes: [
              [Sequelize.col('Asset.contract_id'), 'contractId'],
            ],
            include: [
              {
                model: Asset,
                attributes: [],
                required: true,
                where: opts.chainId ? { chainId: opts.chainId } : {},
              },
            ],
            where: {
              [Op.and]: [
                Sequelize.where(
                  Sequelize.fn(
                    'LOWER',
                    Sequelize.col('AssetAsEthAccount.owner_address'),
                  ),
                  walletAddress,
                ),
                {
                  quantity: {
                    [Op.ne]: '0',
                  },
                },
              ],
            },
            group: ['Asset.contract_id'],
            raw: true,
          });

        const contractIds = assetAsEthAccounts
          .map((a: any) => a.contractId)
          .filter((id) => id);

        if (contractIds.length > 0) {
          const contracts = await this.contractRepository.findAll({
            attributes: ['address'],
            where: {
              id: contractIds,
            },
            raw: true,
          });
          query.contractAddress = contracts.map((c: any) => {
            return Buffer.isBuffer(c.address)
              ? c.address.toString('utf8')
              : c.address;
          });
        } else {
          query.contractAddress = [];
        }
      }

      let iLikeCollectionNamesQuery;
      const keywords = opts.keywords?.filter((e) => e != null && e.length > 0);
      if (opts.keywords) {
        iLikeCollectionNamesQuery = keywords.map((keyword) => {
          const query: WhereOptions = {
            [Op.or]: [
              {
                '$Collection.name$': {
                  [Op.iLike]: `%${keyword}%`,
                },
              },
              {
                '$Collection.contract_address$': {
                  [Op.like]: `${keyword.toLowerCase()}%`,
                },
              },
              sequelize.where(
                sequelize.fn(
                  'similarity',
                  sequelize.col('Collection.name'),
                  keyword,
                ),
                '>',
                '0.2',
              ),
            ],
          };
          return query;
        });
      }

      // --- sorting ---
      const collectionOrder: sequelize.Order = [['createdAt', 'DESC']];
      if (opts.keywords) {
        const keywordOrderQuery = keywords
          .map(
            (keyword) =>
              `"Collection"."name" ILIKE ${escapeString(`%${keyword}%`)}`,
          )
          .join(' OR ');

        collectionOrder.unshift([
          sequelize.literal(`CASE WHEN ${keywordOrderQuery} THEN 1 ELSE 2 END`),
          'ASC',
        ]);
      }

      if (opts.sortBy?.[0] === 'isCampaign202408Featured') {
        collectionOrder.unshift(['isCampaign202408Featured', 'DESC']);
      }

      collectionOrder.unshift(['is_verified', 'DESC']);

      // --- find collection ---
      const { rows, count } = await this.collectionRepository.findAndCountAll({
        where: {
          ...query,
          ...(opts.keywords
            ? [{ [Op.and]: iLikeCollectionNamesQuery }]
            : [])[0],
          block: { [Op.not]: BlockStatus.BLOCKED },
        },
        limit: opts.limit,
        offset: (opts.page - 1) * opts.limit,
        order: collectionOrder,
      });

      if (!rows.length) {
        return { rows: [], count: 0 };
      }

      if (opts.isSimple) {
        const collections = await Promise.all(
          rows.map(async (collection) => {
            return collection;
          }),
        );

        return { rows: collections, count };
      }

      const collections = await Promise.all(
        rows.map(async (collection) => {
          const [
            randomAssets,
            totalOwners,
            totalItems,
            orderInfo,
            priceSymbol,
          ] = await Promise.all([
            this.getRandomAssets(collection.id, 8),
            this.getCacheTotalOwnersByCollectionId(collection.id),
            this.getCacheTotalItemsByCollectionId(collection.id),

            this.getCollectionOrderStatus(
              collection.contractAddress,
              collection.chainId.toString(),
            ),
            this.libsService.getSymbolFromChainShortName(
              collection.chainShortName,
            ),
          ]);
          return {
            ...collection.toJSON(),
            totalOwners,
            totalItems,

            randomAssets,
            orderInfo,
            priceSymbol,
          };
        }),
      );

      return { rows: collections, count };
    } catch (err) {
      throw new HttpException(err, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async exploreTopVolumeCollectionsByOpts(
    opts: ExploreCollectionsByOpt,
    searchAccount: Account,
  ) {
    void opts;
    void searchAccount;
    return {
      rows: [],
      count: 0,
    };
  }

  async getAssetsFromChainIdAndAddress(
    chainId: number,
    contractAddress: string,
  ) {
    const contract = await this.contractRepository.findOne({
      attributes: ['id'],
      where: {
        address: contractAddress,
      },
    });
    if (contract) {
      const assets = await this.assetRepository.findAll({
        where: {
          contractId: contract.id,
          chainId: chainId,
        },
        attributes: ['id'],
      });
      return assets;
    }
    return [];
  }

  async getCollectionPreviewInfo(
    slugs: string[],
    searchAccount: Account,
  ): Promise<CollectionInfo[]> {
    const collections = await this.collectionRepository.findAll({
      where: { slug: slugs },
      include: [],
    });

    const collectionsInfo = await Promise.all(
      collections.map(async (collection) => {
        const bestListing = await this.getCollectionBestListingFromCache(
          collection.contractAddress,
          collection.chainId.toString(),
        );
        const totalVolume = await this.totalVolume(collection.id);
        return {
          ...collection.toJSON(),

          floorPrice: bestListing?.perPrice || 0,
          totalVolume: totalVolume,
          priceSymbol: await this.libsService.getSymbolFromChainShortName(
            collection.chainShortName,
          ),
        };
      }),
    );
    console.log('collectionsInfo.length', collectionsInfo.length);
    // 對 collectionsInfo 按 slugs 的順序進行排序
    return collectionsInfo.sort((a, b) => {
      return slugs.indexOf(a.slug) - slugs.indexOf(b.slug);
    });
  }

  async isAccountIsCollectionOwner(
    accountId: string,
    collectionId: string,
  ): Promise<boolean> {
    let isOwner = false;
    const account = await this.accountRepository.findOne({
      attributes: ['id'],
      include: [
        {
          attributes: ['address'],
          model: Wallet,
        },
      ],
      where: {
        id: accountId,
      },
    });
    const collection = await this.collectionRepository.findOne({
      attributes: ['id', 'ownerAddress'],
      where: {
        id: collectionId,
      },
    });

    account.wallets.forEach((wallet) => {
      if (wallet.address === collection.ownerAddress) {
        isOwner = true;
      }
    });
    return isOwner;
  }





  async updateCollectionTraits(slug) {
    // get all assetIds of collection
    // call traitsDao.updateAssetTraits

    const collection = await this.collectionRepository.findOne({
      where: {
        slug,
      },
    });
    if (!collection) {
      throw new Error('collection not found');
    }
    const collectionId = collection.id;
    const contractAddress = collection.contractAddress;
    const chainId = collection.chainId;

    // each turn 100 assets(max update 100000 asset)
    for (let i = 0; i < 1000; i++) {
      const assets = await this.assetRepository.findAll({
        attributes: ['id', 'traits'],
        where: {
          chainId,
        },
        include: [
          {
            attributes: ['address'],
            model: Contract,
            where: {
              address: contractAddress,
              chainId,
            },
          },
        ],
        limit: 100,
        offset: i * 100,
        order: [['createdAt', 'ASC']],
      });

      if (!assets) {
        break;
      }

      const updateAssets: {
        assetId: string;
        collectionId: string;
        traits: any;
      }[] = assets.map((asset) => {
        return {
          assetId: asset.id,
          collectionId,
          traits: asset.traits,
        };
      });

      this.traitDao.updateAssetsTraits(updateAssets);
    }
  }

  async getAccountHoldingAssetsCount(
    accountId: string,
    contractAddress: string,
    chainId: ChainId,
  ) {
    const account = await this.accountRepository.findOne({
      attributes: ['id'],
      where: {
        id: accountId,
      },
      include: [
        {
          attributes: ['address'],
          model: Wallet,
        },
      ],
    });

    return await this.assetAsEthAccountRepository.count({
      where: {
        ownerAddress: account.wallets.map((w) => w.address),
      },
      include: [
        {
          required: true,
          model: Asset,
          include: [
            {
              model: Contract,
              where: {
                address: contractAddress.toLowerCase(),
                chainId,
              },
            },
          ],
        },
      ],
    });
  }

  // 跟上面的 getCollectionOrderStatistic 一樣，這個理論上在大量訂單的 collection 會有比較好的效能，
  // 但是在小量訂單的 collection 會比較慢，目前沒必要用
  async getCollectionOrderStatus(contractAddress: string, chainId: string) {
    const collection = await this.collectionRepository.findOne({
      attributes: ['id', 'slug'],
      where: {
        contractAddress,
        chainId,
      },
    });

    if (!collection) {
      return {
        floorPrice: 0,
        bestOffer: 0,
        totalVolume: 0,
      };
    }

    const [bestListing, bestOffer, totalVolume, currentListing] =
      await Promise.all([
        this.getCollectionBestListingFromCache(contractAddress, chainId),
        this.getCollectionBestOfferFromCache(contractAddress, chainId),
        this.getCollectionTotalVolume(collection.id),
        this.getCollectionCurrentListing(contractAddress, chainId),
      ]);

    return {
      floorPrice: bestListing?.perPrice || 0,
      bestOffer: bestOffer?.perPrice || 0,
      totalVolume,
      currentListing,
    };
  }

  async getCollectionTotalVolume(collectionId) {
    return 0;
  }

  async getCollectionBestListingFromCache(
    contractAddress: string,
    chainId: string,
    needReturn = false,
  ): Promise<CacheBestListing> {
    const key = `${COLLECTION_BEST_LISTING_KEY}:${contractAddress}:${chainId}`;
    const bestListing: CacheBestListing = await this.cacheService.getCache(key);

    if (!bestListing) {
      const bestListing = this.updateCollectionBestListingToCache(
        contractAddress,
        chainId,
        {
          force: true,
        },
      );

      if (needReturn) {
        return await bestListing;
      }

      return null;
    }

    if ((bestListing as any) === 'NULL') {
      return null;
    }

    return bestListing;
  }

  async getCollectionBestOfferFromCache(
    contractAddress: string,
    chainId: string,
  ): Promise<CacheBestListing> {
    const key = `${COLLECTION_BEST_OFFER_KEY}:${contractAddress}:${chainId}`;
    const bestOffer: CacheBestListing = await this.cacheService.getCache(key);

    if (!bestOffer) {
      const bestOffer = this.updateCollectionBestOfferToCache(
        contractAddress,
        chainId,
        {
          force: true,
        },
      );

      return null;
    }

    if ((bestOffer as any) === 'NULL') {
      return null;
    }

    return bestOffer;
  }

  /**
   * options.force = true 會強制更新最佳訂單到 cache
   * options.newListing 有值的話，會比較新的訂單跟 cache 裡的訂單，如果新的比較好，就更新 cache
   *   要確保 options.newListing 有 hash, perPrice, platformType, endTime
   * @param contractAddress
   * @param chainId
   * @param options
   * @returns
   */
  async updateCollectionBestListingToCache(
    contractAddress: string,
    chainId: string,
    options?: {
      newListing?: SeaportOrder;
      force?: boolean;
    },
  ) {
    const key = `${COLLECTION_BEST_LISTING_KEY}:${contractAddress}:${chainId}`;
    if (options.force) {
      console.log(`force update best listing ${contractAddress}:${chainId}`);
      const bestListing = await this.orderDao.getCollectionBestListing(
        contractAddress,
        chainId,
      );

      if (!bestListing) {
        await this.cacheService.setCache(key, 'NULL', 60 * 60 * 24 * 30);
        return null;
      }

      // const currency = await this.seaportOrderAssetRepository.findOne({
      //   attributes: ['Currency.symbol'],
      //   where: {
      //     seaportOrderId: bestListing.id,
      //     side: 0,
      //     itemType: { [Op.in]: [0, 1] },
      //   },
      //   include: {
      //     model: Currency,
      //     attributes: ['symbol'],
      //     required: true,
      //   },
      // });

      const returnBestListing: CacheBestListing = {
        id: bestListing?.id,
        hash: bestListing?.hash,
        price: bestListing?.price,
        perPrice: bestListing?.perPrice,
        startTime: bestListing?.startTime,
        endTime: bestListing?.endTime,
        chainId: bestListing?.chainId,
        exchangeAddress: bestListing?.exchangeAddress,
        platformType: bestListing?.platformType,
        // priceSymbol: currency.Currency.symbol,
      };

      if (options.newListing) {
        await this.cacheService.setCache(
          key,
          returnBestListing,
          60 * 60 * 24 * 30,
        );
      }

      await this.cacheService.setCache(
        key,
        returnBestListing,
        60 * 60 * 24 * 30,
      );

      return returnBestListing;
    }

    if (options.newListing) {
      const currentBestListing = await this.getCollectionBestListingFromCache(
        contractAddress,
        chainId,
      );

      if (
        !currentBestListing ||
        currentBestListing.perPrice > options.newListing.perPrice ||
        (currentBestListing.perPrice == options.newListing.perPrice &&
          currentBestListing.platformType > options.newListing.platformType) ||
        (currentBestListing.perPrice == options.newListing.perPrice &&
          currentBestListing.platformType == options.newListing.platformType &&
          currentBestListing.endTime < options.newListing.endTime)
      ) {
        const newCacheBestOffer: CacheBestListing = {
          id: options.newListing.id,
          hash: options.newListing.hash,
          price: options.newListing.price,
          perPrice: options.newListing.perPrice,
          startTime: options.newListing.startTime,
          endTime: options.newListing.endTime,
          chainId: options.newListing.chainId,
          exchangeAddress: options.newListing.exchangeAddress,
          platformType: options.newListing.platformType,
          // priceSymbol: options.newListing.Currency.symbol,
        };

        await this.cacheService.setCache(
          key,
          newCacheBestOffer,
          60 * 60 * 24 * 30,
        );
      }
    }
  }

  /**
   * options.force = true 會強制更新最佳訂單到 cache
   * options.newOffer 有值的話，會比較新的訂單跟 cache 裡的訂單，如果新的比較好，就更新 cache
   *   要確保 options.newOffer 有 hash, perPrice, platformType, endTime
   * @param contractAddress
   * @param chainId
   * @param options
   * @returns
   */
  async updateCollectionBestOfferToCache(
    contractAddress: string,
    chainId: string,
    options?: {
      newOffer?: SeaportOrder;
      force?: boolean;
    },
  ) {
    const key = `${COLLECTION_BEST_OFFER_KEY}:${contractAddress}:${chainId}`;
    if (options.force) {
      console.log(`force update best offer ${contractAddress}:${chainId}`);
      const bestOffer = await this.getCollectionBestOffer(
        contractAddress,
        chainId,
      );

      if (!bestOffer) {
        await this.cacheService.setCache(key, 'NULL', 60 * 60 * 24 * 30);
        return null;
      }

      // const currency = await this.seaportOrderAssetRepository.findOne({
      //   attributes: ['Currency.symbol'],
      //   where: {
      //     seaportOrderId: bestListing.id,
      //     side: 0,
      //     itemType: { [Op.in]: [0, 1] },
      //   },
      //   include: {
      //     model: Currency,
      //     attributes: ['symbol'],
      //     required: true,
      //   },
      // });

      const returnBestOffer: CacheBestListing = {
        id: bestOffer?.id,
        hash: bestOffer?.hash,
        price: bestOffer?.price,
        perPrice: bestOffer?.perPrice,
        startTime: bestOffer?.startTime,
        endTime: bestOffer?.endTime,
        chainId: bestOffer?.chainId,
        exchangeAddress: bestOffer?.exchangeAddress,
        platformType: bestOffer?.platformType,
        // priceSymbol: currency.Currency.symbol,
      };

      if (options.newOffer) {
        await this.cacheService.setCache(
          key,
          returnBestOffer,
          60 * 60 * 24 * 30,
        );
      }

      await this.cacheService.setCache(key, returnBestOffer, 60 * 60 * 24 * 30);

      return returnBestOffer;
    }

    if (options.newOffer) {
      const currentBestOffer = await this.getCollectionBestListingFromCache(
        contractAddress,
        chainId,
      );

      if (
        !currentBestOffer ||
        currentBestOffer.perPrice < options.newOffer.perPrice ||
        (currentBestOffer.perPrice == options.newOffer.perPrice &&
          currentBestOffer.platformType > options.newOffer.platformType) ||
        (currentBestOffer.perPrice == options.newOffer.perPrice &&
          currentBestOffer.platformType == options.newOffer.platformType &&
          currentBestOffer.endTime < options.newOffer.endTime)
      ) {
        const newCacheBestOffer: CacheBestListing = {
          id: options.newOffer.id,
          hash: options.newOffer.hash,
          price: options.newOffer.price,
          perPrice: options.newOffer.perPrice,
          startTime: options.newOffer.startTime,
          endTime: options.newOffer.endTime,
          chainId: options.newOffer.chainId,
          exchangeAddress: options.newOffer.exchangeAddress,
          platformType: options.newOffer.platformType,
          // priceSymbol: options.newOffer.Currency.symbol,
        };

        await this.cacheService.setCache(
          key,
          newCacheBestOffer,
          60 * 60 * 24 * 30,
        );
      }
    }
  }

  async getCollectionBestOffer(contractAddress: string, chainId: string) {
    return await this.seaportOrderRepository.findOne({
      subQuery: false,
      attributes: [
        'id',
        'price',
        'perPrice',
        'startTime',
        'endTime',
        'category',
        'isFillable',
        'hash',
        'chainId',
        'exchangeAddress',
        'platformType',
      ],
      where: {
        chainId,
        category: Category.OFFER,
        isFillable: true,
      },
      include: [
        {
          attributes: ['token'],
          model: SeaportOrderAsset,
          where: {
            token: ethers.utils.getAddress(contractAddress.toLowerCase()),
          },
        },
      ],
      order: [
        ['perPrice', 'DESC'],
        ['platformType', 'ASC'],
        ['endTime', 'ASC'],
      ],
    });
  }

  @Cacheable({ key: 'collection:listing', seconds: 60 * 10 })
  async getCollectionCurrentListing(contractAddress: string, chainId: string) {
    return await this.seaportOrderRepository.count({
      where: {
        chainId,
        category: Category.LISTING,
        isFillable: true,
      },
      include: [
        {
          attributes: ['token'],
          model: SeaportOrderAsset,
          where: {
            token: ethers.utils.getAddress(contractAddress.toLowerCase()),
          },
        },
      ],
    });
  }


  @Cacheable({ key: 'collection:listingPercents', seconds: 60 * 5 })
  async getCollectionListingPercents(collectionId: string) {
    const collection = await this.collectionRepository.findOne({
      attributes: ['id', 'contractAddress', 'chainId'],
      where: {
        id: collectionId,
      },
    });

    if (!collection) {
      throw new Error('collection not found');
    }

    let totalSupply = await this.getCacheTotalItemsByCollectionId(
      collection.id,
    );

    if (!totalSupply) {
      this.totalItems(collection.id, true);

      totalSupply = await this.assetExtraRepository.count({
        where: {
          collectionId: collection.id,
        },
      });
    }

    const listingCount = await this.assetExtraRepository.count({
      where: {
        collectionId: collection.id,
        // best_listing_order_id is not null
        bestListingOrderId: { [Op.not]: null },
      },
    });

    return listingCount / totalSupply;
  }

  @Cacheable({ key: 'collection:allowCurrencies', seconds: 60 * 10 })
  async getCollectionPriceSymbol(collectionId: string): Promise<string> {
    const collection = await this.collectionRepository.findOne({
      attributes: ['id', 'chainShortName'],
      where: {
        id: collectionId,
      },
    });
    if (!collection) {
      throw new Error('collection not found');
    }

    return await this.libsService.getSymbolFromChainShortName(
      collection.chainShortName,
    );
  }

  async getTradingBoard({
    limit,
    page,
    chainId,
    timeRange,
  }: {
    limit: number;
    page: number;
    chainId?: ChainId;
    timeRange: TimeRange;
  }) {
    let tradingBoardRepository;
    switch (timeRange) {
      case TimeRange.ONE_HOUR:
        tradingBoardRepository = this.collectionTradingBoardOneHourRepository;
        break;
      case TimeRange.ONE_DAY:
        tradingBoardRepository = this.collectionTradingBoardOneDayRepository;
        break;
      case TimeRange.ONE_WEEK:
        tradingBoardRepository = this.collectionTradingBoardOneWeekRepository;
        break;
      case TimeRange.ONE_MONTH:
        tradingBoardRepository = this.collectionTradingBoardOneMonthRepository;
        break;
      default:
        throw new Error('invalid timeRange');
    }

    const whereCondition: WhereOptions = {};
    if (chainId) {
      whereCondition.chainId = chainId;
    }

    const { rows: tradingBoard, count } =
      await tradingBoardRepository.findAndCountAll({
        where: whereCondition,
        order: [['tradingVolume', 'DESC']],
        limit,
        offset: (page - 1) * limit,
      });

    if (!tradingBoard) {
      return { rows: [], count: 0 };
    }

    const result = await promise.map(
      tradingBoard,
      async (data: CollectionTradingBoard) => {
        try {
          const symbol = await this.getCollectionPriceSymbol(data.collectionId);
          const [bestListing, bestCollectionOffer, listing] = await Promise.all(
            [
              this.getCollectionBestListingFromCache(
                data.contractAddress,
                data.chainId.toString(),
              ),
              this.getBestCollectionOffer(data.slug),
              this.getCollectionListingPercents(data.collectionId),
            ],
          );

          this.getCacheTotalOwnersByCollectionId(data.collectionId);
          this.getCacheTotalItemsByCollectionId(data.collectionId);

          const floorPriceChangePercent = bestListing
            ? BigNumber(bestListing.perPrice)
              .minus(data.minFloorPrice)
              .div(data.minFloorPrice)
              .toNumber() * 100
            : 0;

          return {
            ...data.toJSON(),
            floorPriceChangePercent,
            bestListing,
            bestCollectionOffer,
            listing,
            symbol,
          };
        } catch (err) {
          console.error(
            `get trading board error collection ${data.chainId}:${data.contractAddress}, message: ${err.message}`,
          );
          console.error(err);
        }
      },
      { concurrency: 10 },
    );

    // remove null
    return { rows: result.filter((x) => x), count: count };
  }

  /**
   * for biru.gg
   * 因為需要顯示全部 collections（包含沒交易跟地板價）
   * @param param0
   * @returns
   */
  async getTradingBoardAllCollection({
    limit,
    page,
    chainId,
    timeRange,
  }: {
    limit: number;
    page: number;
    chainId?: ChainId;
    timeRange: TimeRange;
  }) {
    const tradingBoardRepository = `collection_trading_board_${timeRange}`;

    const whereCondition: WhereOptions = {};
    if (chainId) {
      whereCondition.chainId = chainId;
    }

    const tradingBoard = (await this.sequelizeInstance.query(
      `
      SELECT
          ${tradingBoardRepository}.truncated_time AS "truncatedTime",
          collections.chain_id AS "chainId",
          collections.contract_address AS "contractAddress",
          ${tradingBoardRepository}.trading_volume AS "tradingVolume",
          ${tradingBoardRepository}.trading_count AS "tradingCount",
          ${tradingBoardRepository}.min_floor_price AS "minFloorPrice",
          ${tradingBoardRepository}.previous_volume AS "previousVolume",
          ${tradingBoardRepository}.volume_change_percent AS "volumeChangePercent",
          ${tradingBoardRepository}.previous_floor_price AS "previousFloorPrice",
          collections.id AS "collectionId",
          collections.logo_image_url AS "logoImageUrl",
          collections.name AS "name",
          collections.is_verified AS "isVerified",
          collections.slug AS "slug",
          collections.chain_short_name AS "chainShortName",
          contract.total_supply AS "totalSupply",
          contract.total_owners AS "totalOwners"
      FROM ${tradingBoardRepository}
      RIGHT JOIN collections
          ON ${tradingBoardRepository}.collection_id = collections.id AND collections.block != 'Blocked'
      LEFT JOIN contract
          ON collections.contract_address = encode(contract.address, 'escape')
              AND collections.chain_id = contract.chain_id
      WHERE collections.chain_id = :chainId
      ORDER BY trading_volume DESC NULLS LAST, collections.is_minting DESC, collections.is_verified DESC
      LIMIT :limit
      OFFSET :offset
      `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          tradingBoardRepository,
          chainId,
          limit,
          offset: (page - 1) * limit,
        },
      },
    )) as {
      truncatedTime: Date;
      chainId: ChainId;
      contractAddress: string;
      tradingVolume: number;
      tradingCount: number;
      minFloorPrice: number;
      previousVolume: number;
      volumeChangePercent: number;
      previousFloorPrice: number;
      collectionId: string;
      logoImageUrl: string;
      name: string;
      isVerified: boolean;
      slug: string;
      chainShortName: string;
      totalSupply: number;
      totalOwners: number;
    }[];

    const count =
      +(
        (await this.sequelizeInstance.query(
          `
            SELECT COUNT(*)
            FROM ${tradingBoardRepository}
            RIGHT JOIN collections
                ON ${tradingBoardRepository}.collection_id = collections.id
            WHERE collections.chain_id = :chainId
          `,
          {
            type: sequelize.QueryTypes.SELECT,
            replacements: {
              tradingBoardRepository,
              chainId,
            },
          },
        )) as { count: string }[]
      )?.[0]?.count || 0;

    if (!tradingBoard) {
      return { rows: [], count: 0 };
    }

    const result = await promise.map(
      tradingBoard,
      async (data: {
        truncatedTime: Date;
        chainId: ChainId;
        contractAddress: string;
        tradingVolume: number;
        tradingCount: number;
        minFloorPrice: number;
        previousVolume: number;
        volumeChangePercent: number;
        previousFloorPrice: number;
        collectionId: string;
        logoImageUrl: string;
        name: string;
        isVerified: boolean;
        slug: string;
        chainShortName: string;
        totalSupply: number;
        totalOwners: number;
      }) => {
        try {
          const symbol = await this.getCollectionPriceSymbol(data.collectionId);
          const [bestListing, bestCollectionOffer, listing] = await Promise.all(
            [
              this.getCollectionBestListingFromCache(
                data.contractAddress,
                data.chainId.toString(),
              ),
              this.getBestCollectionOffer(data.slug),
              this.getCollectionListingPercents(data.collectionId),
            ],
          );

          this.getCacheTotalOwnersByCollectionId(data.collectionId);
          this.getCacheTotalItemsByCollectionId(data.collectionId);

          const floorPriceChangePercent = bestListing
            ? BigNumber(bestListing.perPrice)
              .minus(data.minFloorPrice)
              .div(data.minFloorPrice)
              .toNumber() * 100
            : 0;

          return {
            ...data,
            floorPriceChangePercent,
            bestListing,
            bestCollectionOffer,
            listing,
            symbol,
          };
        } catch (err) {
          console.error(
            `get trading board error collection ${data.chainId}:${data.contractAddress}, message: ${err.message}`,
          );
          console.error(err);
        }
      },
      { concurrency: 10 },
    );

    // remove null
    return { rows: result.filter((x) => x), count: count };
  }

  /**
   * return best collection offer,
   * force: true, force update cache,
   * !!bestSeaportOrder.SeaportOrderAsset only NFT!!
   * @param slug
   * @param force
   * @returns {Promise<{hasBestCollectionOrder: boolean; bestSeaportOrder: SeaportOrder; priceSymbol: string}>}
   */
  async getBestCollectionOffer(
    slug: string,
    force = false,
  ): Promise<BestCollectionOfferOrder> {
    try {
      if (force) {
        this.logger.debug(`[getBestCollectionOffer] ${slug} isForce:${force}`);
      }
      const cacheKey = `collection:best:collection_offer:${slug}`;
      const cache:
        | {
          hasBestCollectionOrder: boolean;
          bestSeaportOrder: SeaportOrder;
          priceSymbol: string;
        }
        | undefined = await this.cacheService.getCache(cacheKey);

      if (cache && !force) {
        return cache;
      }

      const collection = await this.collectionRepository.findOne({
        attributes: ['id', 'slug', 'contractAddress', 'chainId'],
        where: {
          slug,
          block: {
            [Op.ne]: BlockStatus.BLOCKED,
          },
        },
      });

      if (!collection) {
        throw new HttpException(
          `Collection ${slug} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const seaportOrder = await this.seaportOrderRepository.findOne({
        where: {
          chainId: collection.chainId,
          category: Category.OFFER,
          offerType: OfferType.COLLECTION,
          isFillable: true,
        },
        include: [
          {
            model: SeaportOrderAsset,
            where: {
              token: ethers.utils.getAddress(collection.contractAddress),
            },
          },
        ],
        order: [
          ['perPrice', 'DESC'],
          ['createdAt', 'ASC'],
        ],
      });

      if (!seaportOrder) {
        const cacheValue = {
          hasBestCollectionOrder: false,
          bestSeaportOrder: null,
          priceSymbol: null,
        };

        // TODO: 先調低 cache 時間，之後能確定所有情境都能更新再調整
        await this.cacheService.setCache(cacheKey, cacheValue, 60 * 5);

        return cacheValue;
      }

      const currencySymbol = (
        await this.seaportOrderRepository.findOne({
          attributes: ['id'],
          where: {
            id: seaportOrder.id,
          },
          include: [
            {
              attributes: ['id'],
              right: true,
              model: SeaportOrderAsset,
              include: [
                {
                  attributes: ['id', 'symbol'],
                  model: Currency,
                },
              ],
            },
          ],
        })
      ).SeaportOrderAssets[0].Currency.symbol;

      const cacheValue = {
        hasBestCollectionOrder: true,
        bestSeaportOrder: seaportOrder,
        priceSymbol: currencySymbol,
      };

      await this.cacheService.setCache(cacheKey, cacheValue, 60 * 60 * 24 * 7);

      return cacheValue;
    } catch (e) {
      this.logger.error(`get best collection offer error ${slug}: ${e}`);
      return {
        hasBestCollectionOrder: false,
        bestSeaportOrder: null,
        priceSymbol: null,
      };
    }
  }

  private async rateLimitedSyncOrders(
    orders: Array<{
      chainId: string;
      contractAddress: string;
      tokenId: string;
    }>,
    options?: { signal?: AbortSignal },
  ): Promise<{ results: any[]; errors: any[] }> {
    const queue = [...orders];
    const results = [];
    const errors = [];
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const processQueue = async () => {
      while (queue.length > 0) {
        // 檢查是否需要中止
        if (options?.signal?.aborted) {
          throw new Error('AbortError');
        }

        const batch = queue.splice(0, 3);
        try {
          const batchPromises = batch.map((order) =>
            this.syncOrder(order.chainId, order.contractAddress, order.tokenId)
              .then((result) => {
                consecutiveErrors = 0;
                return result;
              })
              .catch((error) => {
                consecutiveErrors++;
                errors.push({ tokenId: order.tokenId, error });

                if (consecutiveErrors >= maxConsecutiveErrors) {
                  this.logger.warn(
                    `Too many consecutive errors (${consecutiveErrors}), increasing wait time...`,
                  );
                  return new Promise((resolve) =>
                    setTimeout(resolve, 1500 * 2),
                  );
                }
                return null;
              }),
          );

          results.push(...(await Promise.all(batchPromises)));

          if (queue.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        } catch (error) {
          this.logger.error('Batch processing error:', error);
          queue.push(...batch);
        }
      }
    };

    await processQueue();
    return { results, errors };
  }

  private async syncOrder(
    chainId: string,
    contractAddress: string,
    tokenId: string,
    retries = 3,
    userAgent?: string,
  ) {
    // 檢查是否為搜索引擎爬蟲訪問
    if (userAgent && this.isSearchEngineBot(userAgent)) {
      const botType = this.getBotType(userAgent);
      this.logger.debug(
        `🤖 ${botType} 訪問，跳過 syncOrder 操作: ${userAgent}`,
      );
      return {
        synced: false,
        msg: 'Skipped for Search Engine Bot',
        reason: `${botType} detected, skipping sync operation to reduce database load`,
        botType: botType,
        cacheTime: 3600, // 1小時緩存
      };
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const baseUrl = this.configService.get('BASE_URL');
        if (!baseUrl) {
          throw new Error('BASE_URL is not configured');
        }

        const url = new URL('/api/v3/aggregator/syncOrder', baseUrl).toString();
        this.logger.debug(`Syncing order with URL: ${url}`);

        const response = await firstValueFrom(
          this.httpService.post(
            url,
            {
              chainId: parseInt(chainId),
              contractAddress,
              tokenId,
            },
            {
              headers: {
                'x-client-id': 'lootex',
                'x-api-key': this.configService.get('LOOTEX_API_KEY'),
              },
            },
          ),
        );

        this.logger.debug(`Synced order for tokenId: ${tokenId}`);
        return response.data;
      } catch (error) {
        const status = error.response?.status;

        this.logger.error(
          `Error syncing order for tokenId ${tokenId} (Attempt ${attempt}/${retries}):`,
          {
            status,
            message: error.message,
            data: error.response?.data,
          },
        );

        if (status === 500) {
          const waitTime = 3000 * Math.pow(2, attempt - 1);
          this.logger.debug(`Waiting ${waitTime / 1000}s before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else if (attempt === retries) {
          throw error;
        }
      }
    }
  }

  async _recordCollectionTradingData(time: Date) {
    try {
      // 現在的小時
      // yyyy-MM-dd HH:mm:ss
      // 然後把 mm, ss 都設為 0
      const now = time;
      const currentHour = now.getHours();
      const startTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        currentHour - 1,
        0,
        0,
      );
      const endTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        currentHour,
        0,
        0,
      );

      const formattedDateStartTime = startTime
        .toISOString()
        .replace('T', ' ')
        .replace('Z', ' +00:00');
      const formattedDateEndTime = endTime
        .toISOString()
        .replace('T', ' ')
        .replace('Z', ' +00:00');

      // 查詢這個小時的所有交易
      const isLogged = await this.tradingRecordLogRepository.findOne({
        where: {
          time: formattedDateStartTime,
        },
      });

      if (isLogged) {
        return;
      }

      const tradingData = await this.sequelizeInstance.query(
        `
      SELECT
          sum(soh.usd_price) AS volume,
          count(*) AS count,
          encode(soh.contract_address, 'escape') AS contract_address,
          soh.chain_id
      FROM
          seaport_order_history soh
      JOIN
          blockchain ON blockchain.chain_id = soh.chain_id
      WHERE
          soh.category = 'sale'::asset_event_history_category
          AND soh.currency_symbol::text <> ''
          AND soh.start_time >= :startTime
          AND soh.start_time <= :endTime
      GROUP BY
          soh.contract_address,
          soh.chain_id;
      `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            startTime: formattedDateStartTime,
            endTime: formattedDateEndTime,
          },
        },
      );

      const floorPriceData = await this.sequelizeInstance.query(
        `
      SELECT
          seaport_order.chain_id,
          LOWER(ENCODE(token, 'escape')) AS contract_address,
          MIN(per_price) AS floor_price
      FROM
          seaport_order
      LEFT JOIN
          seaport_order_asset
      ON
          seaport_order.id = seaport_order_asset.seaport_order_id
      WHERE
          seaport_order.is_fillable
          AND item_type > 1
      GROUP BY
          seaport_order.chain_id, token;
      `,
        {
          type: QueryTypes.SELECT,
        },
      );

      if (!tradingData.length && !floorPriceData.length) {
        return;
      }

      // 整合數據
      const resultMap = new Map();

      // 遍歷交易數據，將其放入 resultMap 中
      tradingData.forEach((data: any) => {
        const key = `${data.contract_address}-${data.chain_id}`;
        resultMap.set(key, {
          contractAddress: data.contract_address,
          chainId: +data.chain_id,
          tradingVolume: +data.volume || 0, // 如果 volume 是 null，則設為 0
          tradingCount: +data.count || 0, // 如果 count 是 null，則設為 0
          floorPrice: 0, // 預設為 0，稍後會根據 floorPriceData 設置
          time: formattedDateStartTime,
        });
      });

      // 遍歷 floorPriceData，將其與交易數據合併
      floorPriceData.forEach((data: any) => {
        const key = `${data.contract_address}-${data.chain_id}`;
        if (resultMap.has(key)) {
          // 如果已經存在該 contract_address 和 chain_id 的交易數據，則更新 floorPrice
          const existingData = resultMap.get(key);
          existingData.floorPrice = +data.floor_price || 0; // 如果 floor_price 是 null，則設為 0
        } else {
          // 如果該 contract_address 和 chain_id 不存在於交易數據中，則新建一個項目
          resultMap.set(key, {
            contractAddress: data.contract_address,
            chainId: +data.chain_id,
            tradingVolume: 0, // 沒有交易數據，設為 0
            tradingCount: 0, // 沒有交易數據，設為 0
            floorPrice: +data.floor_price || 0, // 如果 floor_price 是 null，則設為 0
            time: formattedDateStartTime,
          });
        }
      });

      // 將結果轉換為陣列格式
      const record = Array.from(resultMap.values());

      // const record = await tradingData.map(async (data: any) => ({
      //   contractAddress: data.contract_address,
      //   chainId: +data.chain_id,
      //   tradingVolume: +data.volume,
      //   tradingCount: +data.count,
      //   floorPrice: (
      //     await this.collectionService.getCollectionBestListingFromCache(
      //       data.contract_address,
      //       data.chain_id,
      //     )
      //   )?.perPrice,
      //   time: formattedDateStartTime,
      // }));

      // 紀錄到 collection_trading_data 裡面
      const collectionTradingData =
        await this.collectionTradingDataRepository.bulkCreate(record, {});

      // 紀錄到 trading_record_log 裡面
      const recorded = await this.tradingRecordLogRepository.create({
        time: formattedDateStartTime,
      });

      console.log(recorded);
    } catch (error) {
      console.error(error);
    }
  }

  onModuleDestroy() {
    // 發出銷毀信號
    this.destroy$.next();
    this.destroy$.complete();

    // 中止所有進行中的請求
    for (const controller of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * 檢測是否為搜索引擎爬蟲訪問
   */
  private isSearchEngineBot(userAgent: string): boolean {
    if (!userAgent) return false;

    const botPatterns = [
      // Google Bot 系列
      /Googlebot/i,
      /Googlebot-Image/i,
      /Googlebot-News/i,
      /Googlebot-Video/i,
      /Googlebot-Desktop/i,
      /Googlebot-Mobile/i,
      /Google-Site-Verification/i,
      /Google-Structured-Data-Testing-Tool/i,

      // 其他搜索引擎
      /Bingbot/i,
      /Slurp/i, // Yahoo
      /DuckDuckBot/i,
      /Baiduspider/i,
      /YandexBot/i,
      /facebookexternalhit/i,
      /Twitterbot/i,
      /LinkedInBot/i,
    ];

    return botPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * 獲取爬蟲類型
   */
  private getBotType(userAgent: string): string | null {
    if (!userAgent) return null;

    const botPatterns = [
      { pattern: /Googlebot/i, type: 'Google Bot' },
      { pattern: /Googlebot-Image/i, type: 'Google Bot Image' },
      { pattern: /Googlebot-News/i, type: 'Google Bot News' },
      { pattern: /Googlebot-Video/i, type: 'Google Bot Video' },
      { pattern: /Googlebot-Desktop/i, type: 'Google Bot Desktop' },
      { pattern: /Googlebot-Mobile/i, type: 'Google Bot Mobile' },
      { pattern: /Bingbot/i, type: 'Bing Bot' },
      { pattern: /Slurp/i, type: 'Yahoo Bot' },
      { pattern: /DuckDuckBot/i, type: 'DuckDuckGo Bot' },
      { pattern: /Baiduspider/i, type: 'Baidu Bot' },
      { pattern: /YandexBot/i, type: 'Yandex Bot' },
      { pattern: /facebookexternalhit/i, type: 'Facebook Bot' },
      { pattern: /Twitterbot/i, type: 'Twitter Bot' },
      { pattern: /LinkedInBot/i, type: 'LinkedIn Bot' },
    ];

    for (const { pattern, type } of botPatterns) {
      if (pattern.test(userAgent)) {
        return type;
      }
    }

    return null;
  }

}
