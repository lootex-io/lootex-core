import { CollectionService } from '@/api/v3/collection/collection.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Sequelize } from 'sequelize-typescript';
import { CollectionTradingData, TradingRecordLog } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { ProviderTokens } from '@/model/providers';
import { QueryTypes } from 'sequelize';
import { TimeRange } from '@/api/v3/collection/collection.interface';
import { Promise as Bluebird } from 'bluebird';

@Injectable()
export class CollectionTradingDataService {
  private readonly logger = new Logger(CollectionTradingDataService.name);

  constructor(
    private readonly collectionService: CollectionService,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelize: Sequelize,

    @InjectModel(TradingRecordLog)
    private readonly tradingRecordLogRepository: typeof TradingRecordLog,

    @InjectModel(CollectionTradingData)
    private readonly collectionTradingDataRepository: typeof CollectionTradingData,
  ) { }

  @Cron('0 */10 * * * *')
  async handleCron() {
    this.logger.debug(
      `CollectionTradingDataService at ${new Date().getTime() / 1000}`,
    );
    this._recordCollectionTradingData();
  }

  // 1 min refresh for high-frequency data
  @Cron('0 */1 * * * *')
  async handleCronOneHour() {
    this.logger.debug(
      `start refresh collection_trading_board_one_hour materialized view at ${new Date().getTime() / 1000}`,
    );
    await this._refreshMaterializedView(['collection_trading_board_one_hour']);
    this.logger.debug(
      `end refresh collection_trading_board_one_hour materialized view at ${new Date().getTime() / 1000}`,
    );
    await this.collectionService.getTradingBoard({
      timeRange: TimeRange.ONE_HOUR,
      limit: 30,
      page: 1,
    });
  }

  // 10 min refresh for daily trends
  @Cron('0 */10 * * * *')
  async handleCronDaily() {
    this.logger.debug(
      `start refresh daily collection_trading_board materialized view at ${new Date().getTime() / 1000}`,
    );
    await this._refreshMaterializedView(['collection_trading_board_one_day']);
    this.logger.debug(
      `end refresh daily collection_trading_board materialized view at ${new Date().getTime() / 1000}`,
    );
  }

  // 1 hour refresh for weekly and monthly trends
  @Cron('0 0 */1 * * *')
  async handleCronWeeklyMonthly() {
    this.logger.debug(
      `start refresh weekly/monthly collection_trading_board materialized views at ${new Date().getTime() / 1000}`,
    );
    await this._refreshMaterializedView([
      'collection_trading_board_one_week',
      'collection_trading_board_one_month',
    ]);
    this.logger.debug(
      `end refresh weekly/monthly collection_trading_board materialized views at ${new Date().getTime() / 1000}`,
    );
  }

  async _refreshMaterializedView(views: string[]) {

    for (const view of views) {
      try {
        await this.sequelize.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`, {
          type: QueryTypes.RAW,
        });
        // Stagger refreshes to avoid IO spikes
        await Bluebird.delay(5000);
      } catch (error) {
        this.logger.error(`Failed to refresh view ${view}: ${error.message}`);
        // Fallback to non-concurrent refresh if unique index is missing
        try {
          await this.sequelize.query(`REFRESH MATERIALIZED VIEW ${view}`, {
            type: QueryTypes.RAW,
          });
        } catch (e) {
          this.logger.error(
            `Failed to refresh view ${view} (fallback): ${e.message}`,
          );
        }
      }
    }
  }

  @logRunDuration(new Logger(CollectionTradingDataService.name))
  async _recordCollectionTradingData() {
    try {
      // 現在的小時
      // yyyy-MM-dd HH:mm:ss
      // 然後把 mm, ss 都設為 0
      const now = new Date();
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

      const tradingData = await this.sequelize.query(
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
          soh.created_at >= date_trunc('day', CURRENT_DATE - INTERVAL '30 days')
          AND soh.category = 'sale'::asset_event_history_category
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

      const floorPriceData = await this.sequelize.query(
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
}
