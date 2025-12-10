import { Inject, Injectable } from '@nestjs/common';
import {
  Asset,
  AssetExtra,
  Collection,
  Contract,
  SeaportOrder,
  SeaportOrderAsset,
} from '@/model/entities';
import { Op } from 'sequelize';
import { ProviderTokens } from '@/model/providers';
import { OrderService } from '@/api/v3/order/order.service';
import { CollectionService } from '../collection/collection.service';
import { CollectionDao } from '@/core/dao/collection-dao';

/**
 * 放explore相关公用的方法
 */
@Injectable()
export class ExploreCoreService {
  constructor(
    @Inject(ProviderTokens.AssetExtra)
    private assetExtraRepository: typeof AssetExtra,

    private orderService: OrderService,
    private collectionService: CollectionService,
    private collectionDao: CollectionDao,
  ) {}
  async findAssetsByIds(ids: string[]) {
    const assets = await this.assetExtraRepository.findAll({
      where: {
        assetId: ids,
      },
      include: [
        { model: Collection, as: 'Collection', required: false },
        { model: Asset, as: 'Asset', required: false },
        { model: Contract, as: 'Contract', required: false },
        {
          required: false,
          model: SeaportOrder,
          as: 'bestOfferOrder',
          include: [
            {
              attributes: ['id', 'startAmount', 'availableAmount'],
              model: SeaportOrderAsset,
              where: {
                itemType: { [Op.in]: [2, 3, 4, 5] },
              },
            },
          ],
        },
        {
          required: false,
          model: SeaportOrder,
          as: 'bestListingOrder',
          include: [
            {
              attributes: ['id', 'startAmount', 'availableAmount', 'recipient'],
              model: SeaportOrderAsset,
              // where: {
              //   itemType: { [Op.in]: [2, 3, 4, 5] },
              // },
            },
          ],
        },
      ],
    });

    // 整理出那些collection需要计算offerOrder, floorPrice
    const collections: Collection[] = [];
    for (const asset of assets) {
      if (
        !collections.find(
          (c) => c.contractAddress === asset.Collection.contractAddress,
        )
      ) {
        collections.push(asset.Collection);
      }
    }

    const collectionOrderInfos = await Promise.all(
      collections.map(async (c) => {
        try {
          // TODO: 如果有帶 slug 當查詢條件只要查一次，其他都用這次的就好
          const [
            bestCollectionOfferOrder,
            collectionFloorPrice,
            collectionAllowCurrencies,
          ] = await Promise.all([
            this.orderService.getBestCollectionOffer(c.slug),
            this.orderService.getCollectionBestListingFromCache(
              c.contractAddress,
              c.chainId.toString(),
            ),
            this.collectionDao.getAllowCurrenciesByCollectionId(c.id),
          ]);
          return {
            bestCollectionOfferOrder,
            collectionFloorPrice,
            collectionAllowCurrencies,
            cId: c.id,
          };
        } catch (error) {
          console.error(
            `Error fetching bestCollectionOfferOrder for collection ${c.chainId} ${c.contractAddress}:`,
            error,
          );
          return null;
        }
      }),
    );

    const results = await Promise.all(
      ids.map(async (id) => {
        const asset: any = assets.find((e) => e.assetId === id);
        if (!asset || !asset.Collection) return null;

        const collectionOrderInfo = collectionOrderInfos.find(
          (c) => c?.cId === asset.Collection?.id,
        );

        return {
          ...asset.toJSON(),
          bestCollectionOfferOrder:
            collectionOrderInfo?.bestCollectionOfferOrder,
          collectionFloorPrice:
            collectionOrderInfo?.collectionFloorPrice?.perPrice || 0,
          allowCurrencies: collectionOrderInfo?.collectionAllowCurrencies,
        };
      }),
    );

    const rows = results.filter((result) => result !== null);

    return rows;
  }

  async findAssetsSimpleByIds(ids: string[]) {
    const assets = await this.assetExtraRepository.findAll({
      attributes: ['id'],
      where: {
        assetId: ids,
      },
      include: [
        { attributes: ['tokenId'], model: Asset, as: 'Asset', required: false },
        {
          attributes: ['address', 'schemaName', 'chainId'],
          model: Contract,
          as: 'Contract',
          required: false,
        },
      ],
    });

    return assets;
  }
}
