import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderService } from '@/api/v3/order/order.service';
import { Op } from 'sequelize';
import { AssetExtra, SeaportOrder, SeaportOrderAsset } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
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

    private readonly orderService: OrderService,
    private readonly orderQueueService: OrderQueueService,
  ) {}

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
    const extras0 = await this.assetExtraRepository.findAll({
      attributes: ['assetId'],
      where: {
        [Op.or]: [
          { '$bestListingOrder.is_fillable$': false },
          { '$bestListingOrder.is_expired$': true },
        ],
        bestListingOrderId: { [Op.not]: null },
      },
      include: [
        {
          model: SeaportOrder,
          as: 'bestListingOrder',
          required: true,
          attributes: [],
        },
      ],
      limit: 200,
    });

    const extras1 = await this.assetExtraRepository.findAll({
      attributes: ['assetId'],
      where: {
        [Op.or]: [
          { '$bestOfferOrder.is_fillable$': false },
          { '$bestOfferOrder.is_expired$': true },
        ],
        bestOfferOrderId: { [Op.not]: null },
      },
      include: [
        {
          model: SeaportOrder,
          as: 'bestOfferOrder',
          required: true,
          attributes: [],
        },
      ],
      limit: 10,
    });

    const extras = [...extras0, ...extras1];
    this.logger.debug(`_checkExtraOrder extras ${JSON.stringify(extras)}`);
    for (const extra of extras) {
      const assetId = extra.assetId;
      await this.orderQueueService.updateAssetBestOrder(
        assetId,
        null,
        UpdateAssetOrderCategory.ListingAndOffer,
      );
      // await this.assetExtraDao.updateAssetExtraBestOrderByAssetId(assetId);
    }
  }
}
