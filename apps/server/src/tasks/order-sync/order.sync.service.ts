import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderService } from '@/api/v3/order/order.service';
import { Op, Sequelize } from 'sequelize';
import { AssetExtra, SeaportOrder, SeaportOrderAsset } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { InjectConnection } from '@nestjs/sequelize';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { UpdateAssetOrderCategory } from '@/core/dao/asset-extra-dao';
import { OrderQueueService } from '@/core/bull-queue/queue/order-queue.service';

@Injectable()
export class OrderTasksService {
  private readonly logger = new Logger(OrderTasksService.name);

  constructor(
    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,

    @InjectModel(SeaportOrder)
    private seaportOrderRepository: typeof SeaportOrder,

    @InjectModel(SeaportOrderAsset)
    private seaportOrderAssetRepository: typeof SeaportOrderAsset,

    @InjectConnection()
    private sequelize: Sequelize,

    private readonly orderService: OrderService,
    private readonly orderQueueService: OrderQueueService,
  ) { }

  @Cron('*/30 * * * * *')
  async handleCron() {
    this.logger.debug(
      `syncExpiredOrders fired at ${new Date().getTime() / 1000}`,
    );
    this._checkExtraOrder();
    await this.orderService.syncExpiredOrders();
  }

  @logRunDuration(new Logger(OrderTasksService.name))
  async _checkExtraOrder() {
    // 策略：使用子查詢直接找出引用失效訂單的資產
    // 這樣可以避免先查詢所有失效訂單(可能數萬筆),更精確且高效

    // 查詢引用了失效 listing 訂單的資產
    const extras0 = await this.assetExtraRepository.findAll({
      attributes: ['assetId'],
      where: {
        bestListingOrderId: {
          [Op.in]: this.sequelize.literal(`(
            SELECT id FROM seaport_order 
            WHERE (is_fillable = false OR is_expired = true)
            LIMIT 1000
          )`),
        },
      },
      limit: 200,
    });

    // 查詢引用了失效 offer 訂單的資產
    const extras1 = await this.assetExtraRepository.findAll({
      attributes: ['assetId'],
      where: {
        bestOfferOrderId: {
          [Op.in]: this.sequelize.literal(`(
            SELECT id FROM seaport_order 
            WHERE (is_fillable = false OR is_expired = true)
            LIMIT 1000
          )`),
        },
      },
      limit: 200,
    });

    const extras = [...extras0, ...extras1];
    this.logger.debug(`_checkExtraOrder found ${extras.length} assets to update`);

    for (const extra of extras) {
      const assetId = extra.assetId;
      await this.orderQueueService.updateAssetBestOrder(
        assetId,
        null,
        UpdateAssetOrderCategory.ListingAndOffer,
      );
    }
  }
}
