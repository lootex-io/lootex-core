import { ConfigService } from '@nestjs/config';
import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  Account,
  AccountAccountFollow,
  Asset,
  AssetAsEthAccount,
  AssetExtra,
  AvatarDecoration,
  Badge,
  Collection,
  CollectionVolumeAllDays,
  Contract,
  Currency,
  Wallet,
} from '@/model/entities';
import { Op, QueryTypes, where, fn, col, QueryOptions } from 'sequelize';
import { Category } from '@/api/v3/order/order.interface';
import { ProviderTokens } from '@/model/providers';
import * as _ from 'lodash';
import { TraitService } from '@/api/v3/trait/trait.service';
import { ExploreCollectionsByOpt } from '@/api/v3/collection/collection.interface';
import {
  keywordsBaseQueryDTO,
  keywordsAssetsQueryDTO,
} from '@/api/v3/explore/explore.dto';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { Sequelize } from 'sequelize-typescript';
import { InjectModel } from '@nestjs/sequelize';

import sequelize from 'sequelize';
import { BlockStatus } from '@/model/entities/constant-model';
import { Cacheable, getCacheKey } from '@/common/decorator/cacheable.decorator';
import { OrderService } from '../order/order.service';
import { TestnetChainIds } from '@/common/libs/libs.service';
import { ExploreCoreService } from '@/api/v3/explore/explore-core.service';
import { CacheService } from '@/common/cache';

@Injectable()
export class ExploreService {
  protected logger = new Logger(ExploreService.name);

  constructor(
    @InjectModel(Asset)
    private assetRepository: typeof Asset,
    @Inject(ProviderTokens.AssetExtra)
    private assetExtraRepository: typeof AssetExtra,
    @Inject(ProviderTokens.Currency)
    private currencyRepository: typeof Currency,
    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,
    @InjectModel(AccountAccountFollow)
    private readonly accountAccountFollowRepository: typeof AccountAccountFollow,
    @InjectModel(Collection)
    private collectionRepository: typeof Collection,
    @InjectModel(Contract)
    private contractRepository: typeof Contract,
    @InjectModel(Account)
    private readonly accountRepository: typeof Account,
    @InjectModel(Wallet)
    private readonly walletRepository: typeof Wallet,
    @InjectModel(CollectionVolumeAllDays)
    private collectionVolumeAllDaysProvider: typeof CollectionVolumeAllDays,

    private exploreCoreService: ExploreCoreService,
    private traitService: TraitService,
    private collectionService: CollectionService,
    private orderService: OrderService,
    private configService: ConfigService,
    private cacheService: CacheService,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,
  ) { }

  async assets(filter: keywordsAssetsQueryDTO) {
    try {
      const chainId = parseInt(filter.chainId);
      const limit = filter.limit;
      const offset = (filter.page - 1) * filter.limit;

      // 1. 先組合所有過濾條件，查出 asset_id 列表
      let assetIds: string[] = [];
      // traits 條件
      if (
        filter.traits &&
        filter.traits.length > 0 &&
        filter.collectionSlugs?.length === 1
      ) {
        const assetIdsByTraits = await this.traitService.getAssetIdsByTraits({
          collectionSlug: filter.collectionSlugs[0],
          traits: filter.traits,
        });
        if (assetIdsByTraits.length > 0) {
          assetIds = assetIdsByTraits;
        } else {
          // 無符合 traits 條件，直接回傳空
          return { rows: [], count: 0 };
        }
      }

      // collectionSlugs 條件
      let collectionIds: string[] = [];
      if (filter.collectionSlugs && filter.collectionSlugs.length > 0) {
        const collections = await this.collectionRepository.findAll({
          attributes: ['id', 'contractAddress'],
          where: { slug: filter.collectionSlugs },
        });
        collectionIds = collections.map((e) => e.id);
        if (collectionIds.length === 0) return { rows: [], count: 0 };
      }

      // 關鍵字查詢
      if (filter.keywords && filter.keywords.length > 0) {
        const keywords = filter.keywords.join(' ').toLowerCase();
        if (keywords.length < 3) {
          // 如果關鍵字少於 3 個，則不進行查詢
          return { rows: [], count: 0 };
        }

        let keywordAssetIds: any[] = [];
        if (keywords.startsWith('0x')) {
          keywordAssetIds = await this.sequelizeInstance.query(
            `select asset.id from asset inner join contract on asset.contract_id = contract.id where encode(contract.address, 'escape') = :contractAddress`,
            {
              replacements: { contractAddress: keywords },
              type: QueryTypes.SELECT,
            },
          );
        } else {
          keywordAssetIds = await this.sequelizeInstance.query(
            `select asset.id from asset where lower(asset.name) like :keywordsLike`,
            {
              replacements: { keywordsLike: `%${keywords}%` },
              type: QueryTypes.SELECT,
            },
          );
        }
        assetIds =
          assetIds.length > 0
            ? assetIds.filter((id) =>
              (keywordAssetIds as any[]).map((e) => e.id).includes(id),
            )
            : (keywordAssetIds as any[]).map((e) => e.id);
        if (assetIds.length === 0) return { rows: [], count: 0 };
      }

      // 2. 主查詢 in 這些 id，帶上其他 where 條件、排序、offset 分頁
      const whereSql: string[] = [];
      if (chainId) whereSql.push('ae.chain_id = :chainId');
      if (collectionIds.length > 0)
        whereSql.push('ae.collection_id in (:collectionIds)');
      if (assetIds.length > 0) whereSql.push('ae.asset_id in (:assetIds)');
      whereSql.push('ae.block != :blockStatus');
      // TODO: 少了 collections.block = 'Normal'

      // Optimize: Use EXISTS instead of IN for walletAddress, username, excludeUsername
      if (filter.walletAddress) {
        whereSql.push(`
          EXISTS (
            SELECT 1
            FROM asset_as_eth_account aaea
            WHERE aaea.asset_id = ae.asset_id
              AND aaea.owner_address = :walletAddress
              AND aaea.quantity != '0'
          )
        `);
      }

      if (filter.username) {
        whereSql.push(`
          EXISTS (
            SELECT 1
            FROM asset_as_eth_account aaea
            INNER JOIN user_wallets uw ON aaea.owner_address = uw.address
            INNER JOIN user_accounts ua ON uw.account_id = ua.id
            WHERE aaea.asset_id = ae.asset_id
              AND ua.username = :username
              AND uw.provider != 'PRIVY_LIBRARY_SA'
              AND aaea.quantity != '0'
          )
        `);
      }

      if (filter.excludeUsername) {
        whereSql.push(`
          EXISTS (
            SELECT 1
            FROM asset_as_eth_account aaea
            LEFT JOIN user_wallets uw ON aaea.owner_address = uw.address
            LEFT JOIN user_accounts ua ON uw.account_id = ua.id
            WHERE aaea.asset_id = ae.asset_id
              AND ua.username != :excludeUsername
          )
        `);
      }

      if (filter.orderStatus) {
        // LISTING
        if (filter.orderStatus.includes(Category.LISTING)) {
          whereSql.push('ae.best_listing_order_id is not null');
          if (filter.platformType) {
            whereSql.push('ae.best_listing_platform_type = :platformType');
          }
        }

        // BID
        if (filter.orderStatus.includes(Category.OFFER)) {
          whereSql.push('ae.best_offer_order_id is not null');
          if (filter.platformType) {
            whereSql.push('ae.best_offer_platform_type = :platformType');
          }
        }
      }

      if (filter.isVerified)
        whereSql.push(`c.is_verified = ${filter.isVerified}`);
      whereSql.push(
        `c.block != :blockStatus`, // 確保 collection 沒有被封鎖
      );

      // 排序
      const orderBys: string[] = [];
      const defaultOrderBy = 'ae.asset_created_at desc';
      if (filter.sortBy && filter.sortBy.length > 0) {
        const sortBy = filter.sortBy[0];
        if (sortBy === 'bestListPrice' || sortBy === '-bestListPrice') {
          // TODO: 改用 asset_extra.best_listing_per_price
          const isDesc = sortBy.startsWith('-');
          // join seaport_order，排序用 o.price，最後補 asset_created_at DESC
          orderBys.push(
            `ae.best_listing_per_price ${isDesc ? 'DESC' : 'ASC'} NULLS LAST`,
          );
          orderBys.push('ae.asset_created_at DESC');
          // 加入價格過濾條件（只對有 listing 的資產有效）
          if (filter.priceMin) {
            whereSql.push('(ae.best_listing_per_price >= :priceMin)');
          }
          if (filter.priceMax) {
            whereSql.push('(ae.best_listing_per_price <= :priceMax)');
          }
        } else if (
          sortBy === 'bestOfferPrice' ||
          sortBy === '-bestOfferPrice'
        ) {
          // TODO: 改用 asset_extra.best_offer_per_price
          const isDesc = sortBy.startsWith('-');
          // 修正：join seaport_order，排序用 o.price
          // 只查詢有 offer 的資產，利用部分索引
          whereSql.push('ae.best_offer_order_id IS NOT NULL');
          orderBys.push(
            `ae.best_offer_per_price ${isDesc ? 'DESC' : 'ASC'} NULLS LAST`,
          );
          orderBys.push('ae.asset_created_at DESC');
        } else if (sortBy === 'lastCreatedListingAt')
          orderBys.push('ae.last_created_listing_at DESC NULLS LAST');
        else if (sortBy === 'viewCount') orderBys.push('ae.view_count desc');
        else if (sortBy === 'createdAt')
          orderBys.push('ae.asset_created_at desc');
        else orderBys.push(defaultOrderBy);
      } else {
        orderBys.push(defaultOrderBy);
      }

      // 如果排序用 o.price，SQL 需 join seaport_order
      // 改用 asset_extra.best_listing_per_price 跟 asset_extra.best_offer_per_price，就不需要 join
      let joinSql = '';
      joinSql = `inner join collections c on c.id = ae.collection_id`; // 為了 collections.block

      // TODO: 少了 order by 後

      const sql = `select ae.asset_id as id from asset_extra ae ${joinSql} where ${whereSql.join(' and ')} order by ${orderBys.join(',')} limit :limit offset :offset`;
      const sqlOption = {
        replacements: {
          chainId: chainId,
          collectionIds: collectionIds,
          assetIds: assetIds,
          blockStatus: BlockStatus.BLOCKED,
          limit: limit,
          offset: offset,
          priceMin: filter.priceMin ? Number(filter.priceMin) : undefined,
          priceMax: filter.priceMax ? Number(filter.priceMax) : undefined,
          platformType: filter.platformType,
          walletAddress: filter.walletAddress?.toLowerCase(),
          username: filter.username,
          excludeUsername: filter.excludeUsername,
        },
        type: QueryTypes.SELECT,
      };
      const assetIdsRes = await this.sequelizeInstance.query(sql, sqlOption);
      const ids = (assetIdsRes as any[]).map((e) => e.id);
      if (ids.length === 0) return { rows: [], count: 0 };

      // 3. 批次查詢詳細資料
      const rows = await this.exploreCoreService.findAssetsByIds(ids);
      // count
      let count = 10000;
      if (
        !!filter.isCount &&
        (filter.username ||
          filter.walletAddress ||
          filter.collectionSlugs?.length > 0)
      ) {
        const countSql = `select count(*) as count from asset_extra ae ${joinSql} where ${whereSql.join(' and ')}`;
        const countRes = await this.sequelizeInstance.query(
          countSql,
          sqlOption,
        );
        count = parseInt((countRes as any)[0].count, 10);
      }
      return { rows, count };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  async assetsTest(filter: keywordsAssetsQueryDTO) {
    try {
      const chainId = parseInt(filter.chainId);
      const limit = filter.limit;
      const offset = (filter.page - 1) * filter.limit;

      const idsSql: string[] = [];
      const joinsSql: string[] = [];
      const whereSql: string[] = chainId ? ['ae.chain_id = :chainId'] : [];
      // production block Mumbai testnet
      if (this.configService.get('NODE_ENV') == 'production') {
        whereSql.push(
          `NOT (ae.chain_id = ANY (ARRAY[${TestnetChainIds.join(',')}]))`,
        );
      }
      const assetIds: string[] = [];
      const collectionIds: string[] = [];
      const contractIds: string[] = [];

      // order
      const orderJoinsSql: string[] = [];
      const orderWhereSql: string[] = [];
      let orderStatusListing = false;
      let orderStatusOffer = false;
      let orderStatusCollectionOffer = false;

      const emptyRes = { rows: [], count: 0 };

      if (filter.orderStatus) {
        const orderStatus = filter.orderStatus.toString();
        const oWhere = ['is_fillable = true'];

        // LISTING
        if (filter.orderStatus.includes(Category.LISTING)) {
          orderStatusListing = true;

          if (filter.priceSymbol) {
            orderWhereSql.push(`ae.best_listing_symbol = :priceSymbol`);
          }
          if (filter.platformType) {
            orderWhereSql.push('ae.best_listing_platform_type = :platformType');
          }

          if (filter.priceMin && filter.priceMax) {
            orderWhereSql.push('ae.best_listing_per_price >= :priceMin');
            orderWhereSql.push('ae.best_listing_per_price <= :priceMax');
          } else if (filter.priceMin) {
            orderWhereSql.push('ae.best_listing_per_price >= :priceMin');
          } else if (filter.priceMax) {
            orderWhereSql.push('ae.best_listing_per_price <= :priceMax');
          }
        }

        // OFFER
        if (filter.orderStatus.includes(Category.OFFER)) {
          orderStatusOffer = true;

          if (filter.priceSymbol) {
            orderWhereSql.push(`ae.best_offer_symbol = :priceSymbol`);
          }
          if (filter.platformType) {
            orderWhereSql.push('ae.best_offer_platform_type = :platformType');
          }

          if (filter.priceMin && filter.priceMax) {
            orderWhereSql.push('ae.best_offer_per_price >= :priceMin');
            orderWhereSql.push('ae.best_offer_per_price <= :priceMax');
          } else if (filter.priceMin) {
            orderWhereSql.push('ae.best_offer_per_price >= :priceMin');
          } else if (filter.priceMax) {
            orderWhereSql.push('ae.best_offer_per_price <= :priceMax');
          }
        }

        // COLLECTION_OFFER
        if (filter.orderStatus.includes(Category.COLLECTION_OFFER)) {
          orderStatusCollectionOffer = true;

          // 確保 collections 也在 Join，因為要用 collections.best_collection_offer_order_id
          orderJoinsSql.push(
            `inner join collections collection_offer_collection on collection_offer_collection.id = ae.collection_id`,
          );
          orderJoinsSql.push(
            `inner join seaport_order collection_offer_so on collection_offer_so.id = collection_offer_collection.best_collection_offer_order_id`,
          );

          // 確保有 best_collection_offer_order_id
          // orderWhereSql.push(
          //   `collection_offer_collection.best_collection_offer_order_id IS NOT NULL`,
          // );
          orderWhereSql.push(...oWhere.map((e) => `collection_offer_so.${e}`));
        }
      }

      if (filter.collectionSlugs && filter.collectionSlugs?.length > 0) {
        const collections = await this.collectionRepository.findAll({
          attributes: ['id', 'contractAddress'],
          where: {
            slug: filter.collectionSlugs,
          },
        });
        collectionIds.push(...collections.map((e) => e.id));

        const contracts = await this.contractRepository.findAll({
          attributes: ['id'],
          where: {
            address: collections.map((e) => e.contractAddress),
          },
        });
        contractIds.push(...contracts.map((e) => e.id));

        if (collections.length === 0) {
          return emptyRes;
        }
      }

      if (filter.keywords && filter.keywords.length > 0) {
        const keywords = filter.keywords?.join(' ')?.toLowerCase();
        const unionSubSql = [];
        // let assetWhere = [];
        if (keywords.startsWith('0x')) {
          // contract address
          // assetWhere.push(`contract.address = :contractAddress`);
          whereSql.push(`encode(ae.contract_address, 'escape') = :contractAddress`);
        } else {
          // assetWhere.push(`(lower(asset.name) like :keywordsLike)`);
          whereSql.push(`(lower(ae.asset_name) like :keywordsLike)`);
        }

        // if (contractIds.length > 0) {
        //   assetWhere.push('asset.contract_id in (:contractIds)');
        //   const tokenId = parseInt(filter.keywords.join('').trim());
        //   if (!isNaN(tokenId)) {
        //     assetWhere = [];
        //     assetWhere.push('asset.contract_id in (:contractIds)');
        //     // assetWhere.push(`asset.token_id='${tokenId}'`);
        //     whereSql.push(`ae.token_id='${tokenId}'`);
        //   }
        // } else {
        // const keywords = filter.keywords.join('');
        // if (
        //   !/[\u4e00-\u9fa5]/.test(keywords) &&
        //   filter.keywords.join(' ').length < 3
        // ) {
        //   // 如果不包含中文，且字符長度小於3，直接返回空數據
        //   return emptyRes;
        // }
        // }

        // if (chainId) {
        //   whereSql.push('ae.chain_id=:chainId');
        // }

        // unionSubSql.push(
        //   `select asset.id from asset inner join contract on asset.contract_id = contract.id where ${assetWhere.join(' and ')}`,
        // );
        // idsSql.push(`(${unionSubSql.map((e) => `(${e})`).join(' union ')})`);
      }

      if (filter.walletAddress) {
        idsSql.push(
          `select asset_id as id from asset_as_eth_account where owner_address = :walletAddress`,
        );
      }
      if (filter.username) {
        idsSql.push(
          `select aea.asset_id as id from asset_as_eth_account aea left join user_wallets uw on aea.owner_address = uw.address left join user_accounts ua on uw.account_id = ua.id where ua.username = :username`,
        );
      }

      if (filter.excludeUsername) {
        idsSql.push(
          `select aea.asset_id as id from asset_as_eth_account aea left join user_wallets uw on aea.owner_address = uw.address left join user_accounts ua on uw.account_id = ua.id where ua.username != :excludeUsername`,
        );
      }

      if (
        filter.traits &&
        filter.traits.length > 0 &&
        filter.collectionSlugs?.length === 1
      ) {
        const assetIdsByTraits = await this.traitService.getAssetIdsByTraits({
          collectionSlug: filter.collectionSlugs[0],
          traits: filter.traits,
        });

        if (assetIdsByTraits.length > 0) {
          assetIds.push(...assetIdsByTraits);
        } else {
          assetIds.push('00000000-0000-0000-0000-000000000000');
        }
      }

      if (collectionIds && collectionIds.length > 0) {
        whereSql.push(`ae.collection_id in (:collectionIds)`);
      }
      if (assetIds && assetIds.length > 0) {
        whereSql.push('ae.asset_id in (:assetIds)');
      }
      whereSql.push(`ae.block != :blockStatus`);

      let cteSql = '';
      if (idsSql && idsSql.length > 0) {
        cteSql = `with ids as (${idsSql.join(' intersect ')})`;
        joinsSql.push(`inner join ids on ids.id = ae.asset_id`);
      }

      // TODO: collection_block 目前沒有放進 asset_extra
      joinsSql.push(`left join collections c on c.id = ae.collection_id`);
      whereSql.push(`c.block != :blockStatus`);

      if (filter.isVerified === true || filter.isVerified === false) {
        whereSql.push(`ae.collection_is_verified = ${filter.isVerified}`);
      }

      const createSql = (
        sorts: string[],
        option: { paging: boolean; counting: boolean } = {
          paging: true,
          counting: false,
        },
      ) => {
        const _joinSql = [...joinsSql, ...orderJoinsSql];
        const _whereSql = [...whereSql, ...orderWhereSql];
        return `${cteSql} select ${option.counting ? 'count(*) as count' : 'ae.asset_id as id'
          } from asset_extra ae ${_joinSql.join(' ')} where ${_whereSql.join(
            ' and ',
          )} ${sorts.length > 0 ? 'order by ' + sorts.join(',') : ''}${option.paging ? ' limit :limit offset :offset' : ''
          }`;
      };

      const sqlOption = {
        replacements: {
          chainId: chainId,
          contractIds: contractIds,
          collectionIds: collectionIds,
          collectionSlugs: filter.collectionSlugs,
          assetIds: assetIds,
          keywords: filter.keywords?.join(' '),
          keywordsLike: `%${filter.keywords?.join(' ')?.toLowerCase()}%`,
          contractAddress: `${filter.keywords?.join(' ')?.toLowerCase()}`,
          username: filter.username,
          excludeUsername: filter.excludeUsername,
          walletAddress: filter.walletAddress?.toLowerCase(),
          priceMin: filter.priceMin,
          priceMax: filter.priceMax,
          platformType: filter.platformType,
          priceSymbol: filter.priceSymbol,
          blockStatus: BlockStatus.BLOCKED,
          limit: limit,
          offset: offset,
        },
        type: QueryTypes.SELECT,
      };

      let orderBys: string[] = [];
      let defaultOrderBy = 'ae.asset_created_at desc';
      const assetIdOrderBY = 'ae.asset_id asc';
      if (collectionIds.length > 0) {
        defaultOrderBy = 'ae.asset_created_at desc nulls last';
      }
      if (filter.sortBy && filter.sortBy.length > 0) {
        const sortByBestListPrice = filter.sortBy.find(
          (e) => e.indexOf('bestListPrice') > -1,
        );
        const sortByBestOfferPrice = filter.sortBy.find(
          (e) => e.indexOf('bestOfferPrice') > -1,
        );
        const sortByBestCollectionOfferPrice = filter.sortBy.find(
          (e) => e.indexOf('bestCollectionOfferPrice') > -1,
        );
        const sortByLikeCount = filter.sortBy.find(
          (e) => e.indexOf('likeCount') > -1,
        );
        const sortByViewCount = filter.sortBy.find(
          (e) => e.indexOf('viewCount') > -1,
        );
        const sortByCreatedAt = filter.sortBy.find(
          (e) => e.indexOf('createdAt') > -1,
        );
        const sortByLastCreatedListingAt = filter.sortBy.find(
          (e) => e.indexOf('lastCreatedListingAt') > -1,
        );
        const sortByRarityRanking = filter.sortBy.find(
          (e) => e.indexOf('rarityRanking') > -1,
        );

        let sortByCreatedAtOrder = defaultOrderBy;
        if (sortByCreatedAt && sortByCreatedAt === 'createdAt') {
          sortByCreatedAtOrder = 'ae.asset_created_at ASC';
        }

        if (sortByLastCreatedListingAt) {
          sortByCreatedAtOrder = 'ae.last_created_listing_at DESC NULLS LAST';
        }

        if (sortByBestListPrice) {
          orderBys = [
            `ae.best_listing_per_price ${sortByBestListPrice.startsWith('-') ? 'DESC NULLS LAST' : 'ASC'}`,
            sortByCreatedAtOrder,
          ];
          if (!orderStatusListing) {
            whereSql.push('ae.best_listing_order_id is null');
            const sql1 = createSql([sortByCreatedAtOrder, assetIdOrderBY], {
              paging: false,
              counting: false,
            });
            const sql1Count = createSql([], {
              paging: false,
              counting: true,
            });
            whereSql.pop();
            orderBys.push(assetIdOrderBY);
            const sql0 = createSql(orderBys, {
              paging: false,
              counting: false,
            });
            const sql0Count = createSql([], {
              paging: false,
              counting: true,
            });
            const ids = await this._unionFindAssets(
              sql0,
              sql0Count,
              sql1,
              offset,
              limit,
              sqlOption,
            );

            let count = 10000;
            if (
              !!filter.isCount &&
              (filter.username ||
                filter.walletAddress ||
                filter.collectionSlugs?.length > 0)
            ) {
              const count0 = await this.getSqlCount(sql0Count, sqlOption);
              // const count0Res = await this.sequelizeInstance.query(
              //   sql0Count,
              //   sqlOption,
              // );
              // const count0 = parseInt((count0Res as any)[0].count, 10);
              const count1 = await this.getSqlCount(sql1Count, sqlOption);
              // const count1Res = await this.sequelizeInstance.query(
              //   sql1Count,
              //   sqlOption,
              // );
              // const count1 = parseInt((count1Res as any)[0].count, 10);
              count = count1 + count0;
            }

            return {
              rows: await this.exploreCoreService.findAssetsByIds(ids),
              count,
            };
          }
        } else if (sortByBestOfferPrice) {
          // 簡化邏輯：直接用 NULLS LAST 排序，不需要複雜的 union 查詢
          // 有 best_offer_per_price 的會排在前面，NULL 的會排在後面
          orderBys = [
            `ae.best_offer_per_price ${sortByBestOfferPrice.startsWith('-') ? 'DESC NULLS LAST' : 'ASC NULLS LAST'}`,
            sortByCreatedAtOrder,
          ];
          // 不需要特殊處理 orderStatusOffer，NULLS LAST 會自動處理
        } else if (sortByBestCollectionOfferPrice) {
          orderBys = [
            `collection_offer_so.price ${sortByBestCollectionOfferPrice.startsWith('-') ? 'DESC' : 'ASC'}`,
            sortByCreatedAtOrder,
          ];

          if (!orderStatusCollectionOffer) {
            whereSql.push(
              'collection_offer_collection.best_collection_offer_order_id is null',
            );
            const sql1 = createSql([sortByCreatedAtOrder, assetIdOrderBY], {
              paging: false,
              counting: false,
            });
            const sql1Count = createSql([], {
              paging: false,
              counting: true,
            });

            whereSql.pop();
            orderJoinsSql.push(
              'inner join collections collection_offer_collection on collection_offer_collection.id = ae.collection_id',
            );
            orderJoinsSql.push(
              'inner join seaport_order collection_offer_so on collection_offer_so.id = collection_offer_collection.best_collection_offer_order_id and collection_offer_collection.best_collection_offer_order_id is not null',
            );
            orderBys.push(assetIdOrderBY);
            const sql0 = createSql(orderBys, {
              paging: false,
              counting: false,
            });
            const sql0Count = createSql([], {
              paging: false,
              counting: true,
            });
            const ids = await this._unionFindAssets(
              sql0,
              sql0Count,
              sql1,
              offset,
              limit,
              sqlOption,
            );

            let count = 10000;
            if (
              !!filter.isCount &&
              (filter.username ||
                filter.walletAddress ||
                filter.collectionSlugs?.length > 0)
            ) {
              const count0 = await this.getSqlCount(sql0Count, sqlOption);
              // const count0Res = await this.sequelizeInstance.query(
              //   sql0Count,
              //   sqlOption,
              // );
              // const count0 = parseInt((count0Res as any)[0].count, 10);
              const count1 = await this.getSqlCount(sql1Count, sqlOption);
              // const count1Res = await this.sequelizeInstance.query(
              //   sql1Count,
              //   sqlOption,
              // );
              // const count1 = parseInt((count1Res as any)[0].count, 10);
              count = count1 + count0;
            }

            return {
              rows: await this.exploreCoreService.findAssetsByIds(ids),
              count,
            };
          }
        } else if (sortByLikeCount) {
          orderBys.push(
            `ae.like_count ${sortByLikeCount.startsWith('-') ? 'DESC' : 'ASC'}`,
          );
          orderBys.push(sortByCreatedAtOrder);
        } else if (sortByViewCount) {
          orderBys.push(
            `ae.view_count ${sortByViewCount.startsWith('-') ? 'DESC' : 'ASC'}`,
          );
          orderBys.push(sortByCreatedAtOrder);
        } else if (sortByRarityRanking) {
          orderBys.push(
            `ae.rarity_ranking ${sortByRarityRanking.startsWith('-') ? 'DESC' : 'ASC'
            }`,
          );
          orderBys.push(sortByCreatedAtOrder);
        } else {
          orderBys.push(sortByCreatedAtOrder);
        }
      } else {
        orderBys = [defaultOrderBy];
      }

      if (filter.keywords && filter.keywords.length > 0) {
        orderBys = [];
      } else {
        orderBys.push(assetIdOrderBY);
      }

      const sql = createSql(orderBys);
      const countSql = createSql([], { paging: false, counting: true });
      const assetIdsRes = await this.sequelizeInstance.query(sql, sqlOption);

      let count = 10000;
      if (
        !!filter.isCount &&
        (filter.username ||
          filter.walletAddress ||
          filter.collectionSlugs?.length > 0)
      ) {
        // const countRes = await this.sequelizeInstance.query(countSql, sqlOption);
        // count = parseInt((countRes as any)[0].count, 10);
        // 缓存
        count = await this.getSqlCount(countSql, sqlOption);
      }

      return {
        rows: await this.exploreCoreService.findAssetsByIds(
          assetIdsRes.map((e: any) => e.id),
        ),
        count: count,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  async getSqlCount(countSql: string, sqlOption?: QueryOptions) {
    const cacheKey = getCacheKey(
      'ExploreService',
      'getSqlCount',
      [countSql, sqlOption],
      true,
    );
    const cacheValue = await this.cacheService.getCache(cacheKey);
    if (cacheValue) {
      // console.log(`使用缓存 ✅ getSqlCount ${cacheValue}`);
      if (+cacheValue > 0) {
        return +cacheValue;
      }
    }
    const countRes = await this.sequelizeInstance.query(countSql, sqlOption);
    const count = parseInt((countRes as any)[0].count, 10);
    if (count > 500) {
      // console.log(`开始缓存 ✅ getSqlCount ${count}`);
      await this.cacheService.setCache(cacheKey, count, 300);
    }
    return count;
  }

  async _unionFindAssets(
    sql0: string,
    sql0Count: string,
    sql1: string,
    offset: number,
    limit: number,
    option,
  ): Promise<string[]> {
    const addPageParametersToSql = (sql) =>
      `${sql} limit :limit offset :offset`;

    const rows: any = await this.sequelizeInstance.query(
      addPageParametersToSql(sql0),

      {
        ...option,
      },
    );
    // this.logger.debug(`count ${count}, rows ${JSON.stringify(rows)}`);
    const leftLimit = limit - rows.length;
    if (leftLimit === 0) {
      return rows.map((e) => e.id);
    } else {
      const countRes: any = await this.sequelizeInstance.query(sql0Count, {
        ...option,
        plain: true,
      });
      const count = parseInt(countRes.count);
      const leftOffset = offset - count + rows.length;
      option.replacements.limit = leftLimit;
      option.replacements.offset = leftOffset;
      const rows1: any = await this.sequelizeInstance.query(
        addPageParametersToSql(sql1),

        {
          ...option,
        },
      );
      return [...rows, ...rows1].map((e) => e.id);
    }
  }
  async assetsSimple(filter: keywordsAssetsQueryDTO) {
    const chainId = parseInt(filter.chainId);
    const limit = filter.limit;
    const offset = (filter.page - 1) * filter.limit;

    const idsSql: string[] = [];
    const joinsSql: string[] = [];
    const whereSql: string[] = chainId ? ['ae.chain_id = :chainId'] : [];
    // production block Mumbai testnet
    // if (this.configService.get('NODE_ENV') == 'production') {
    //   whereSql.push(
    //     `NOT (ae.chain_id = ANY (ARRAY[${TestnetChainIds.join(',')}]))`,
    //   );
    // }
    const assetIds: string[] = [];
    const collectionIds: string[] = [];
    const contractIds: string[] = [];

    // order
    const orderJoinsSql: string[] = [];
    const orderWhereSql: string[] = [];
    const orderStatusListing = false;
    const orderStatusOffer = false;

    const emptyRes = { rows: [], count: 0 };

    if (filter.collectionSlugs && filter.collectionSlugs?.length > 0) {
      const collections = await this.collectionRepository.findAll({
        attributes: ['id', 'contractAddress'],
        where: {
          slug: filter.collectionSlugs,
        },
      });
      collectionIds.push(...collections.map((e) => e.id));

      const contracts = await this.contractRepository.findAll({
        attributes: ['id'],
        where: {
          address: collections.map((e) => e.contractAddress),
        },
      });
      contractIds.push(...contracts.map((e) => e.id));

      if (collections.length === 0) {
        return emptyRes;
      }
    }

    if (filter.walletAddress) {
      idsSql.push(
        `select asset_id as id from asset_as_eth_account where owner_address = :walletAddress`,
      );
    }
    if (filter.username) {
      idsSql.push(
        `select aea.asset_id as id from asset_as_eth_account aea left join user_wallets uw on aea.owner_address = uw.address left join user_accounts ua on uw.account_id = ua.id where ua.username = :username`,
      );
    }

    if (filter.excludeUsername) {
      idsSql.push(
        `select aea.asset_id as id from asset_as_eth_account aea left join user_wallets uw on aea.owner_address = uw.address left join user_accounts ua on uw.account_id = ua.id where ua.username != :excludeUsername`,
      );
    }

    if (collectionIds && collectionIds.length > 0) {
      whereSql.push(`ae.collection_id in (:collectionIds)`);
    }
    if (assetIds && assetIds.length > 0) {
      whereSql.push('ae.asset_id in (:assetIds)');
    }

    let cteSql = '';
    if (idsSql && idsSql.length > 0) {
      cteSql = `with ids as (${idsSql.join(' intersect ')})`;
      joinsSql.push(`inner join ids on ids.id = ae.asset_id`);
    }

    if (filter.collectionSlugs && filter.collectionSlugs?.length > 0) {
      joinsSql.push(`left join collections c on c.id = ae.collection_id`);
    }
    // joinsSql.push('inner join asset a on a.id = ae.asset_id');

    if (filter.isVerified === true || filter.isVerified === false) {
      whereSql.push(`c.is_verified = ${filter.isVerified}`);
    }

    const createSql = (
      sorts: string[],
      option: { paging: boolean; counting: boolean } = {
        paging: true,
        counting: false,
      },
    ) => {
      const _joinSql = [...joinsSql];
      const _whereSql = [...whereSql];
      return `${cteSql} select ${option.counting ? 'count(*) as count' : 'ae.asset_id as id'
        } from asset_extra ae ${_joinSql.join(' ')} where ${_whereSql.join(
          ' and ',
        )}${option.paging ? ' limit :limit offset :offset' : ''}`;
    };

    const sqlOption = {
      replacements: {
        chainId: chainId,
        contractIds: contractIds,
        collectionIds: collectionIds,
        assetIds: assetIds,
        // keywords: filter.keywords?.join(' '),
        // keywordsLike: `%${filter.keywords?.join(' ')?.toLowerCase()}%`,
        contractAddress: `${filter.keywords?.join(' ')?.toLowerCase()}` || null,
        username: filter.username || null,
        // excludeUsername: filter.excludeUsername,
        walletAddress: filter.walletAddress?.toLowerCase(),
        // priceMin: filter.priceMin,
        // priceMax: filter.priceMax,
        // platformType: filter.platformType,
        // priceSymbol: filter.priceSymbol,
        // blockStatus: BlockStatus.BLOCKED,
        limit: limit,
        offset: offset,
      },
      type: QueryTypes.SELECT,
    };

    let orderBys: string[] = [];
    let defaultOrderBy = 'ae.asset_created_at desc';
    const assetIdOrderBY = 'ae.asset_id asc';
    if (collectionIds.length > 0) {
      defaultOrderBy = 'ae.asset_created_at desc nulls last';
    }
    if (filter.sortBy && filter.sortBy.length > 0) {
      const sortByBestListPrice = filter.sortBy.find(
        (e) => e.indexOf('bestListPrice') > -1,
      );
      const sortByBestOfferPrice = filter.sortBy.find(
        (e) => e.indexOf('bestOfferPrice') > -1,
      );
      const sortByLikeCount = filter.sortBy.find(
        (e) => e.indexOf('likeCount') > -1,
      );
      const sortByViewCount = filter.sortBy.find(
        (e) => e.indexOf('viewCount') > -1,
      );
      const sortByCreatedAt = filter.sortBy.find(
        (e) => e.indexOf('createdAt') > -1,
      );
      const sortByLastCreatedListingAt = filter.sortBy.find(
        (e) => e.indexOf('lastCreatedListingAt') > -1,
      );
      const sortByRarityRanking = filter.sortBy.find(
        (e) => e.indexOf('rarityRanking') > -1,
      );

      let sortByCreatedAtOrder = defaultOrderBy;
      if (sortByCreatedAt && sortByCreatedAt === 'createdAt') {
        sortByCreatedAtOrder = 'ae.asset_created_at ASC';
      }

      if (sortByLastCreatedListingAt) {
        sortByCreatedAtOrder = 'ae.last_created_listing_at DESC NULLS LAST';
      }

      if (sortByBestListPrice) {
        orderBys = [
          `l_so.price ${sortByBestListPrice.startsWith('-') ? 'DESC' : 'ASC'}`,
          sortByCreatedAtOrder,
        ];
        if (!orderStatusListing) {
          whereSql.push('ae.best_listing_order_id is null');
          const sql1 = createSql([sortByCreatedAtOrder, assetIdOrderBY], {
            paging: false,
            counting: false,
          });
          const sql1Count = createSql([], {
            paging: false,
            counting: true,
          });
          whereSql.pop();
          orderJoinsSql.push(
            `inner join seaport_order l_so on l_so.id = ae.best_listing_order_id${chainId ? ' and ae.best_listing_order_id is not null' : ''}`,
          );
          orderBys.push(assetIdOrderBY);
          const sql0 = createSql(orderBys, { paging: false, counting: false });
          const sql0Count = createSql([], {
            paging: false,
            counting: true,
          });
          const ids = await this._unionFindAssets(
            sql0,
            sql0Count,
            sql1,
            offset,
            limit,
            sqlOption,
          );

          let count = 10000;
          if (
            !!filter.isCount &&
            (filter.username ||
              filter.walletAddress ||
              filter.collectionSlugs?.length > 0)
          ) {
            const count0Res = await this.sequelizeInstance.query(
              sql0Count,
              sqlOption,
            );
            const count0 = parseInt((count0Res as any)[0].count, 10);
            const count1Res = await this.sequelizeInstance.query(
              sql1Count,
              sqlOption,
            );
            const count1 = parseInt((count1Res as any)[0].count, 10);
            count = count1 + count0;
          }

          return {
            rows: await this.exploreCoreService.findAssetsByIds(ids),
            count,
          };
        }
      } else if (sortByBestOfferPrice) {
        orderBys = [
          `o_so.price ${sortByBestOfferPrice.startsWith('-') ? 'DESC' : 'ASC'}`,
          sortByCreatedAtOrder,
        ];

        if (!orderStatusOffer) {
          whereSql.push('ae.best_offer_order_id is null');
          const sql1 = createSql([sortByCreatedAtOrder, assetIdOrderBY], {
            paging: false,
            counting: false,
          });
          const sql1Count = createSql([], {
            paging: false,
            counting: true,
          });

          whereSql.pop();
          orderJoinsSql.push(
            'inner join seaport_order o_so on o_so.id = ae.best_offer_order_id and ae.best_offer_order_id is not null',
          );
          orderBys.push(assetIdOrderBY);
          const sql0 = createSql(orderBys, { paging: false, counting: false });
          const sql0Count = createSql([], {
            paging: false,
            counting: true,
          });
          const ids = await this._unionFindAssets(
            sql0,
            sql0Count,
            sql1,
            offset,
            limit,
            sqlOption,
          );

          let count = 10000;
          if (
            !!filter.isCount &&
            (filter.username ||
              filter.walletAddress ||
              filter.collectionSlugs?.length > 0)
          ) {
            const count0Res = await this.sequelizeInstance.query(
              sql0Count,
              sqlOption,
            );
            const count0 = parseInt((count0Res as any)[0].count, 10);
            const count1Res = await this.sequelizeInstance.query(
              sql1Count,
              sqlOption,
            );
            const count1 = parseInt((count1Res as any)[0].count, 10);
            count = count1 + count0;
          }

          return {
            rows: await this.exploreCoreService.findAssetsByIds(ids),
            count,
          };
        }
      } else if (sortByLikeCount) {
        orderBys.push(
          `ae.like_count ${sortByLikeCount.startsWith('-') ? 'DESC' : 'ASC'}`,
        );
        orderBys.push(sortByCreatedAtOrder);
      } else if (sortByViewCount) {
        orderBys.push(
          `ae.view_count ${sortByViewCount.startsWith('-') ? 'DESC' : 'ASC'}`,
        );
        orderBys.push(sortByCreatedAtOrder);
      } else if (sortByRarityRanking) {
        orderBys.push(
          `ae.rarity_ranking ${sortByRarityRanking.startsWith('-') ? 'DESC' : 'ASC'
          }`,
        );
        orderBys.push(sortByCreatedAtOrder);
      } else {
        // orderBys.push(sortByCreatedAtOrder);
      }
    } else {
      // orderBys = [defaultOrderBy];
    }

    if (filter.keywords && filter.keywords.length > 0) {
      orderBys = [];
    } else {
      // orderBys.push(assetIdOrderBY);
    }

    const sql = createSql(orderBys);
    const countSql = createSql([], { paging: false, counting: false });
    const assetIdsRes = await this.sequelizeInstance.query(sql, sqlOption);

    let count = 10000;
    if (
      !!filter.isCount &&
      (filter.username ||
        filter.walletAddress ||
        filter.collectionSlugs?.length > 0)
    ) {
      const countRes = await this.sequelizeInstance.query(countSql, sqlOption);
      count = parseInt((countRes as any)[0].count, 10);
    }

    return {
      rows: await this.exploreCoreService.findAssetsSimpleByIds(
        assetIdsRes.map((e: any) => e.id),
      ),
      count: count,
    };
  }

  async collections(filter: ExploreCollectionsByOpt, searchAccount: Account) {
    return await this.collectionService.exploreCollectionsByOpts(
      filter,
      searchAccount,
    );
  }

  @Cacheable({ key: 'explore-users', seconds: 5 })
  async users(user: Account, filter: keywordsBaseQueryDTO) {
    filter.limit = filter.limit > 16 ? 16 : filter.limit;

    // 根據用戶身份返回帶有isFollowing數據
    const wrapAccounts = async (user, accounts: Account[]) => {
      const res = await Promise.all(
        accounts.map(async (account) => {
          if (user) {
            const accountAccountFollow =
              await this.accountAccountFollowRepository.findOne({
                where: {
                  followerId: user.id,
                  followingId: account.id,
                  isFollow: true,
                },
              });
            return {
              ...account.toJSON(),
              isFollowing: accountAccountFollow ? true : false,
            };
          }
          return account;
        }),
      );
      return res;
    };

    // 如果keywords為空的情況，返回推薦用戶（根據follower倒序）
    if (filter.keywords === undefined) {
      if (filter.page > 20) {
        filter.page = 20;
      }
      const { rows, count } = await this.accountRepository.findAndCountAll({
        where: { block: { [Op.not]: BlockStatus.BLOCKED } },
        include: [{ model: AvatarDecoration }, { model: Badge }],
        limit: filter.limit,
        offset: (filter.page - 1) * filter.limit,
        order: [['follower', 'desc']],
      });
      const accounts = await wrapAccounts(user, rows);
      return { rows: accounts, count };
    }

    let keywords = [];
    if (filter.keywords && filter.keywords.length > 0) {
      keywords = filter.keywords.filter((e) => e != null && e.length > 0);
    }
    if (keywords.findIndex((e) => e.length >= 3) === -1) {
      return { rows: [], count: 0 };
    }

    // 取得 username 模糊比對結果
    const iLikeAssetUsernameQuery = this.getKeywordsQuery(
      'Account.username',
      keywords,
    );
    // 搜索用户名不考虑多个关键词
    const usernameKeywords = filter.keywords.join(' ');
    const accountList = await this.sequelizeInstance.query(
      'select id from user_accounts where username =% :usernameKeywords',
      {
        replacements: {
          usernameKeywords: usernameKeywords,
        },
        type: QueryTypes.SELECT,
      },
    );
    const accountIdsByUsername = accountList.map((e: any) => e.id);

    // 取得 wallet address 結果
    const ilikeWalletsAddressQuery = keywords.map((keyword) => {
      return {
        address: keyword.toLowerCase(),
      };
    });
    const walletListByAddress = await this.walletRepository.findAll({
      where: {
        [Op.or]: ilikeWalletsAddressQuery,
      },
    });
    const accountIdsByWallets = await _.map(walletListByAddress, (wallet) => {
      return wallet.accountId;
    });

    // 合併 account id
    const accountIds = _.concat(accountIdsByUsername, accountIdsByWallets);

    const keywordOrderQuery = keywords
      .map((keyword) => `"Account"."username" ILIKE '%${keyword}%'`)
      .join(' OR ');
    const accountOrder = [];
    accountOrder.push([
      sequelize.fn('similarity', sequelize.col('username'), usernameKeywords),
      'DESC',
    ]);
    const { rows, count } = await this.accountRepository.findAndCountAll({
      where: {
        id: accountIds,
        block: { [Op.not]: BlockStatus.BLOCKED },
      },
      include: [
        {
          model: AvatarDecoration,
        },
        {
          model: Badge,
        },
      ],
      limit: filter.limit,
      offset: (filter.page - 1) * filter.limit,
      order: accountOrder,
    });

    const accounts = await wrapAccounts(user, rows);
    return {
      rows: accounts,
      count,
    };
  }

  getKeywordsQuery(columnName, keywords) {
    return keywords.map((keyword) => {
      return {
        [Op.or]: [
          {
            [`$${columnName}$`]: {
              [Op.iLike]: `%${keyword}%`,
            },
          },
          where(fn('similarity', col(columnName), keyword), '>', '0.2'),
        ],
      };
    });
  }
}
