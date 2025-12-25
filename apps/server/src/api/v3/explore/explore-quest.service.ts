import { Inject, Injectable } from '@nestjs/common';
import { Chain, ChainMap } from '@/common/libs/libs.service';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { AssetExtra } from '@/model/entities';
import * as moment from 'moment';
import { ExploreCoreService } from '@/api/v3/explore/explore-core.service';
import { CacheService } from '@/common/cache';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize/dist/common/sequelize.decorators';

@Injectable()
export class ExploreQuestService {
  private chainIds = [Chain.BASE, Chain.POLYGON, Chain.MANTLE].map(
    (e) => ChainMap[e].id,
  );
  constructor(
    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly exploreCoreService: ExploreCoreService,
  ) {
    if (configService.get<string>('GP_DAILY_NFT_CHAINS')) {
      this.chainIds = configService
        .get<string>('GP_DAILY_NFT_CHAINS')
        .split('#');
    }
  }

  /**
   * 每日新发现
   */
  async dailyAssets(username: string) {
    const cacheKey = `explore:dailyAssets:${username}`;
    let res = await this.cacheService.getCache(cacheKey);
    if (res) {
      return res;
    }

    const cIdsSql = `
      select id from (
          select distinct c.id
            from collections c
            inner join asset_extra ae on c.id = ae.collection_id
            inner join seaport_order o on ae.best_listing_order_id = o.id
            where c.is_verified = true and ae.best_listing_order_id is not null and c.chain_id in (:chainIds)
      ) t
      order by random()
      limit 5;
    `;
    let cIds: any[] = await this.sequelizeInstance.query(cIdsSql, {
      replacements: { chainIds: this.chainIds },
      type: QueryTypes.SELECT,
    });
    cIds = cIds.map((e) => e.id);
    // console.log('cIds ', cIds);
    const assetIds = [];
    for (const cId of cIds) {
      const assetIdSql = `
      SELECT asset_id FROM (
          SELECT ae.asset_id
          FROM asset_extra ae inner join seaport_order o on ae.best_listing_order_id = o.id
          where ae.collection_id = :cId
          ORDER BY o.price asc
          LIMIT 30
      ) AS t
      ORDER BY RANDOM()
      LIMIT 1;
    `;
      const assetId: any[] = await this.sequelizeInstance.query(assetIdSql, {
        replacements: { cId: cId },
        type: QueryTypes.SELECT,
      });
      console.log('assetId ', assetId);
      if (assetId && assetId.length > 0) {
        assetIds.push(assetId[0].asset_id);
      }
    }

    // console.log('assetIds ', assetIds);
    res = {
      rows: await this.exploreCoreService.findAssetsByIds(assetIds),
      count: 5,
    };

    // 计算当天的还剩多少秒 utc + 8 为标准
    const startOfDay = moment().utcOffset(8).startOf('day');
    const now = moment().utcOffset(8);
    const leftSeconds = 86400 - now.diff(startOfDay, 'seconds');
    await this.cacheService.setCache(cacheKey, res, leftSeconds);
    return res;
  }
}
