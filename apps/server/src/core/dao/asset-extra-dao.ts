import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  Asset,
  AssetAsEthAccount,
  AssetExtra,
  Blockchain,
  Collection,
  Contract,
  Currency,
  SeaportOrder,
  SeaportOrderAsset,
} from '@/model/entities';
import { BlockStatus } from '@/model/entities/constant-model';
import { Category } from '@/api/v3/order/order.interface';
import { Op, QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { sleep } from 'typescript-retry-decorator/dist/utils';

@Injectable()
@Injectable()
export class AssetExtraDao {
  protected readonly logger = new Logger(AssetExtraDao.name);

  constructor(
    @InjectModel(Asset)
    private assetRepository: typeof Asset,
    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,
    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,
    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,
    @InjectModel(Collection)
    private collectionRepository: typeof Collection,
    @InjectModel(SeaportOrder)
    private seaportOrderRepository: typeof SeaportOrder,
    @InjectModel(SeaportOrderAsset)
    private seaportOrderAssetRepository: typeof SeaportOrderAsset,

    private readonly sequelizeInstance: Sequelize,
  ) {
    // this.updateAssetExtraBestOrderByAssetId(
    //   // '206ed020-ddcc-48c2-b054-3d3c30b57198',
    //   null,
    //   null,
    //   UpdateAssetOrderCategory.Listing,
    // );
  }

  async createDefaultAssetExtra(
    assetId: string,
    collectionId: string,
    isSpam: boolean = false,
  ) {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
      include: [
        {
          model: Contract,
          as: 'Contract',
        },
      ],
    });
    const assetExtra: AssetExtra = await this.assetExtraRepository.create({
      assetId: assetId,
      collectionId: collectionId,
      chainId: asset.chainId,
      contractId: asset.Contract.id,
      assetCreatedAt: asset.createdAt,
      block: isSpam === true ? BlockStatus.BLOCKED : BlockStatus.NORMAL,
    });
    return assetExtra;
  }

  async createBulkAssetExtra(
    values: {
      assetId: string;
      collectionId: string;
      chainId: number;
      contractId: string;
      assetCreatedAt: string;
    }[],
  ) {
    await this.assetExtraRepository.bulkCreate(values);
  }

  async destroy(assetIds: string[]) {
    await this.assetExtraRepository.destroy({
      where: { assetId: assetIds },
    });
  }

  /**
   *
   * @param assetId
   * @param newOrder
   * @param updateCategory 指定更新类型
   */
  async updateAssetExtraBestOrderByAssetId(
    assetId: string,
    newOrder?: SeaportOrder,
    updateCategory?: UpdateAssetOrderCategory,
  ) {
    if (!assetId) {
      return;
    }

    updateCategory = updateCategory || UpdateAssetOrderCategory.ListingAndOffer;
    const assetExtra = await this.assetExtraRepository.findOne({
      attributes: ['bestListingOrderId', 'bestOfferOrderId'],
      where: { assetId },
    });
    if (!assetExtra) {
      return;
    }

    if (
      newOrder &&
      newOrder.isFillable &&
      newOrder.category === Category.LISTING
    ) {
      const assetExtraOrder = await this.seaportOrderRepository.findOne({
        where: { id: assetExtra.bestListingOrderId },
      });

      if (
        !assetExtra.bestListingOrderId ||
        newOrder.perPrice < assetExtraOrder.perPrice ||
        (newOrder.perPrice === assetExtraOrder.perPrice &&
          newOrder.platformType < assetExtraOrder.platformType) ||
        (newOrder.perPrice === assetExtraOrder.perPrice &&
          newOrder.platformType === assetExtraOrder.platformType &&
          newOrder.endTime < assetExtraOrder.endTime)
      ) {
        await this._updateBestByOrder({
          assetId,
          orderId: newOrder.id,
          category: newOrder.category,
        });
      }
      return;
    } else if (
      updateCategory === UpdateAssetOrderCategory.Listing ||
      updateCategory === UpdateAssetOrderCategory.ListingAndOffer
    ) {
      const bestListing = await this.seaportOrderRepository.findOne({
        attributes: ['id', 'category'],
        subQuery: false,
        where: {
          isFillable: true,
          category: Category.LISTING,
        },
        include: [
          {
            attributes: ['assetId'],
            model: SeaportOrderAsset,
            where: {
              assetId,
            },
          },
        ],
        order: [
          ['per_price', 'ASC', 'nulls first'],
          ['platform_type', 'ASC'],
          ['end_time', 'ASC'],
        ],
        limit: 1,
      });
      if (bestListing && assetExtra.bestListingOrderId !== bestListing.id) {
        await this._updateBestByOrder({
          assetId,
          orderId: bestListing.id,
          category: bestListing.category,
        });
      }

      if (!bestListing) {
        await this._updateBestByOrder({
          assetId,
          orderId: null,
          category: Category.LISTING,
        });
      }
    }

    if (
      newOrder &&
      newOrder.isFillable &&
      newOrder.category === Category.OFFER
    ) {
      const assetExtraOrder = await this.seaportOrderRepository.findOne({
        where: { id: assetExtra.bestOfferOrderId },
      });

      if (
        !assetExtra.bestOfferOrderId ||
        newOrder.perPrice > assetExtraOrder.perPrice ||
        (newOrder.perPrice === assetExtraOrder.perPrice &&
          newOrder.platformType > assetExtraOrder.platformType) ||
        (newOrder.perPrice === assetExtraOrder.perPrice &&
          newOrder.platformType === assetExtraOrder.platformType &&
          newOrder.endTime > assetExtraOrder.endTime)
      ) {
        await this._updateBestByOrder({
          assetId,
          orderId: newOrder.id,
          category: newOrder.category,
        });
      }
      return;
    } else if (
      updateCategory === UpdateAssetOrderCategory.Offer ||
      updateCategory === UpdateAssetOrderCategory.ListingAndOffer
    ) {
      const bestOffer = await this.seaportOrderRepository.findOne({
        attributes: ['id', 'category'],
        subQuery: false,
        where: {
          isFillable: true,
          category: Category.OFFER,
        },
        include: [
          {
            attributes: ['assetId'],
            model: SeaportOrderAsset,
            where: {
              assetId,
            },
          },
        ],
        order: [
          ['per_price', 'DESC'],
          ['end_time', 'ASC'],
        ],
        limit: 1,
      });

      if (bestOffer && assetExtra.bestOfferOrderId !== bestOffer.id) {
        await this._updateBestByOrder({
          assetId,
          orderId: bestOffer.id,
          category: bestOffer.category,
        });
      }

      if (!bestOffer) {
        await this._updateBestByOrder({
          assetId,
          orderId: null,
          category: Category.OFFER,
        });
      }
    }
  }

  /**
   * update order data of nft
   * @param assetId
   */
  async updateBestOrder(assetIds: string[], orderId?: string): Promise<void> {
    this.logger.log(`updateBestOrder ${assetIds} orderId ${orderId}`);
    let order: SeaportOrder;
    if (orderId) {
      order = await this.seaportOrderRepository.findOne({
        where: { id: orderId },
      });
    }

    for (const assetId of assetIds) {
      if (!assetId) {
        continue;
      }
      const assetExtra = await this._checkExtraExistOrCreate(assetId);

      if (order && order.isFillable) {
        let bestOrderSql = '';
        if (order.category !== Category.OFFER) {
          // update listing
          bestOrderSql = `
            select seaport_order.id as id, seaport_order.per_price as per_price, seaport_order.platform_type as platform_type
            from seaport_order
            inner join asset_extra on asset_extra.best_listing_order_id = seaport_order.id
            where asset_extra.asset_id = :assetId
            limit 1`;
        } else {
          // update offer
          bestOrderSql = `
            select seaport_order.id as id, seaport_order.per_price as per_price
            from seaport_order
            inner join asset_extra on asset_extra.best_offer_order_id = seaport_order.id
            where asset_extra.asset_id = :assetId
            limit 1`;
        }
        // bestOrder = 舊的(DB的) bestOrder
        // order = 新的 order
        const bestOrder: any = (
          await this.sequelizeInstance.query(bestOrderSql, {
            replacements: {
              assetId: assetId,
            },
            type: QueryTypes.SELECT,
          })
        )?.find(() => true);

        // 如果沒有 bestOrder 或者 order 的價格比 bestOrder 的價格更好
        if (
          !bestOrder ||
          (order.category !== Category.OFFER &&
            bestOrder &&
            (order.perPrice < bestOrder.per_price ||
              (order.perPrice == bestOrder.per_price &&
                +order.endTime < +bestOrder.endTime))) ||
          (order.category === Category.OFFER &&
            bestOrder &&
            (order.perPrice > bestOrder.per_price ||
              (order.perPrice == bestOrder.per_price &&
                +order.endTime < +bestOrder.endTime)))
        ) {
          // 當 order 不是 OFFER 類別時，比較的是較低的價格 (order.perPrice < bestOrder.per_price)。
          // 當 order 是 OFFER 類別時，比較的是較高的價格 (order.perPrice > bestOrder.per_price)。
          await this._updateBestByOrder({
            assetId,
            orderId: order.id,
            category: order.category,
          });
        }
        ///
        if (
          order.category !== Category.OFFER &&
          bestOrder &&
          order.perPrice == bestOrder.per_price
        ) {
          //处理listing相同价格时，优先lootex订单
        }
        continue;
      }

      const bestOffer = await this.seaportOrderRepository.findOne({
        subQuery: false,
        where: {
          isFillable: true,
          category: Category.OFFER,
          endTime: {
            [Op.gt]: new Date().getTime() / 1000,
          },
        },
        include: [
          {
            model: SeaportOrderAsset,
            where: {
              assetId,
            },
          },
        ],
        order: [
          ['per_price', 'DESC'],
          ['end_time', 'ASC'],
        ],
        limit: 1,
      });
      let bestOfferCurrency;
      if (bestOffer) {
        bestOfferCurrency = await this.seaportOrderAssetRepository.findOne({
          subQuery: false,
          where: {
            seaportOrderId: bestOffer?.id,
            assetId: null,
            currencyId: {
              [Op.not]: null,
            },
          },
          include: [
            {
              model: Currency,
            },
          ],
        });
      }
      const bestListing = await this.seaportOrderRepository.findOne({
        subQuery: false,
        where: {
          isFillable: true,
          [Op.not]: [{ category: Category.OFFER }],
          endTime: {
            [Op.gt]: new Date().getTime() / 1000,
          },
        },
        include: [
          {
            model: SeaportOrderAsset,
            where: {
              assetId,
            },
          },
        ],
        order: [
          ['per_price', 'ASC', 'nulls first'],
          ['platform_type', 'ASC'],
          ['created_at', 'ASC'],
        ],
        limit: 1,
      });
      let bestListingCurrency = null;
      if (bestListing) {
        bestListingCurrency = await this.seaportOrderAssetRepository.findOne({
          where: {
            seaportOrderId: bestListing.id,
            assetId: null,
            currencyId: {
              [Op.not]: null,
            },
          },
          include: [
            {
              model: Currency,
            },
          ],
        });
      }

      const updateData: any = {
        bestOfferSymbol: bestOfferCurrency?.Currency?.symbol
          ? bestOfferCurrency.Currency.symbol
          : '',
        bestOfferOrderId: bestOffer ? bestOffer.id : null,
        bestListingOrderId: bestListing ? bestListing.id : null,
        bestListingSymbol: bestListingCurrency?.Currency?.symbol
          ? bestListingCurrency.Currency.symbol
          : '',
        bestListingPerPrice: bestListing ? bestListing.perPrice : null,
        bestListingPlatform: bestListing ? bestListing.platformType : null,
      };
      await this.assetExtraRepository.update(updateData, {
        where: { assetId: assetId },
      });
      await sleep(50);
    }
  }

  async _updateBestByOrder(data: {
    assetId: string;
    orderId?: string;
    category: Category;
  }) {
    this.logger.debug(`_updateBestByOrder ${JSON.stringify(data)}`);
    const { assetId, orderId = null, category } = data;
    let orderCurrency = null;
    if (orderId) {
      orderCurrency = await this.seaportOrderAssetRepository.findOne({
        where: {
          seaportOrderId: orderId,
          assetId: null,
          currencyId: {
            [Op.not]: null,
          },
        },
        include: [
          {
            model: Currency,
          },
          {
            model: SeaportOrder,
          },
        ],
      });
    }
    let updateData = {};
    if (category === Category.OFFER) {
      updateData = {
        bestOfferSymbol: orderCurrency?.Currency?.symbol
          ? orderCurrency.Currency.symbol
          : '',
        bestOfferOrderId: orderId,
        bestOfferPerPrice: orderCurrency?.SeaportOrder?.perPrice
          ? orderCurrency.SeaportOrder.perPrice
          : null,
        bestOfferPlatformType:
          orderCurrency?.SeaportOrder?.platformType !== undefined &&
            orderCurrency.SeaportOrder.platformType !== null
            ? orderCurrency.SeaportOrder.platformType
            : null,
      };
    } else {
      updateData = {
        bestListingOrderId: orderId,
        bestListingSymbol: orderCurrency?.Currency?.symbol
          ? orderCurrency.Currency.symbol
          : '',
        bestListingPerPrice: orderCurrency?.SeaportOrder?.perPrice
          ? orderCurrency.SeaportOrder.perPrice
          : null,
        bestListingPlatformType:
          orderCurrency?.SeaportOrder?.platformType !== undefined &&
            orderCurrency.SeaportOrder.platformType !== null
            ? orderCurrency.SeaportOrder.platformType
            : null,
      };
    }
    await this.assetExtraRepository.update(updateData, {
      where: { assetId: assetId },
    });
  }

  async _checkExtraExistOrCreate(assetId: string) {
    const extra = await this.assetExtraRepository.findOne({
      where: {
        assetId: assetId,
      },
    });
    if (extra) {
      return extra;
    } else {
      const asset = await this.assetRepository.findOne({
        where: { id: assetId },
        include: [
          {
            model: Contract,
            as: 'Contract',
          },
        ],
      });
      const existCollection = await this.collectionRepository.findOne({
        where: {
          contractAddress: asset.Contract.address,
          chainId: asset.Contract.chainId,
        },
      });
      if (existCollection) {
        await this.createDefaultAssetExtra(assetId, existCollection.id);
      }
    }
  }
}

export enum UpdateAssetOrderCategory {
  Listing = 'Listing',
  Offer = 'Offer',
  ListingAndOffer = 'ListingAndOffer',
}
