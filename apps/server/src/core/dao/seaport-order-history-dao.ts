import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@/model/entities/constant-model';
import { Op } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { SeaportOrderHistory } from '@/model/entities';
import { AssetEventCategory } from '@/api/v3/asset/asset.interface';

@Injectable()
export class SeaportOrderHistoryDao {
  constructor(
    @InjectModel(SeaportOrderHistory)
    private readonly seaportOrderHistoryRepository: typeof SeaportOrderHistory,
  ) {
    //
    // setTimeout(async () => {
    //   await this.updateOrderHistoryStatus(
    //     {
    //       orderHash:
    //         '0x7318318ec08486e55c9b125c22e35b2829754c06b6716411e8f7803b56eff0af',
    //       chainId: 137,
    //     },
    //     OrderStatus.VALIDATED,
    //   );
    // }, 5000);
  }

  /**
   * update order status for order history， default for listing|offer category
   */
  async updateOrderHistoryStatus(
    where: { orderHash: string; chainId: number; category?: [string] },
    orderStatus: OrderStatus,
  ) {
    const orderStatusConditions = {
      [OrderStatus.FULFILLED]: {},
      [OrderStatus.CANCELED]: {},
      [OrderStatus.VALIDATED]: {
        orderStatus: {
          [Op.not]: [OrderStatus.FULFILLED, OrderStatus.CANCELED],
        },
      },
      [OrderStatus.EXPIRED]: {
        orderStatus: {
          [Op.not]: [OrderStatus.FULFILLED, OrderStatus.CANCELED],
        },
      },
    };

    const condition = orderStatusConditions[orderStatus];

    const whereCondition = {
      hash: where.orderHash,
      chainId: where.chainId,
      category: {
        [Op.or]: where.category ?? [
          AssetEventCategory.LIST,
          AssetEventCategory.OFFER,
          AssetEventCategory.COLLECTION_OFFER,
        ],
      },
      ...condition, // Merge condition based on orderStatus
    };

    await this.seaportOrderHistoryRepository.update(
      { orderStatus: orderStatus },
      { where: whereCondition },
    );
  }
}
