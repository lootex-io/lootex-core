import { AccountService } from '@/api/v3/account/account.service';
import { GatewayService } from 'core/third-party-api/gateway/gateway.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { CurrencyService } from '@/core/third-party-api/currency/currency.service';
import { AssetEventCategory } from '@/api/v3/asset/asset.interface';
import { TraitService } from '@/api/v3/trait/trait.service';
import {
  BestCollectionOfferOrder,
  CacheBestListing,
  Category,
  OfferOrConsiderationItem,
  OfferType,
  OrderCancelledResponse,
  OrderCertification,
  OrderCurrency,
  OrderFulfilledResponse,
  OrderHistoryListResponse,
  OrderResponse,
  ReceivedItem,
  SpentItem,
} from './order.interface';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Account,
  Asset,
  AssetAsEthAccount,
  AssetExtra,
  Blockchain,
  Collection,
  Contract,
  Currency,
  PollerProgress,
  SeaportOrder,
  SeaportOrderAsset,
  SeaportOrderHistory,
  Wallet,
} from '@/model/entities';
import BigNumber from 'bignumber.js';
import {
  ConsiderationDTO,
  CreateOrderDTO,
  DisableOrdersDTO,
  GetAccountOrderReceiveDTO,
  GetOrderDTO,
  GetOrderHistoryDTO,
  OfferDTO,
  SyncOrderDTO,
  SyncTransactionDto,
} from './order.dto';
import * as promise from 'bluebird';
import { Promise } from 'bluebird';
import { ethers } from 'ethers';
import { Op, QueryTypes, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  COLLECTION_BEST_LISTING_KEY,
  COLLECTION_BEST_OFFER_KEY,
  EIP_712_BULK_ORDER_TYPE,
  EIP_712_ORDER_TYPE,
  ERC1155_TRANSFER_SINGLE_TOPIC0,
  ERC721_TRANSFER_TOPIC0,
  FUSIONX_V3_FRENS_WMNT_POOL_ADDRESS,
  FUSIONX_V3_SWAP_ABI,
  FUSIONX_V3_SWAP_TOPIC0,
  LOOTEX_SEAPORT_CANCEL_ORDER_TOPIC0,
  LOOTEX_SEAPORT_FULFILL_ORDER_TOPIC0,
  OpenseaSeaportAddresses,
  Seaport_ABI,
} from './constants';
import { BlockchainService } from '@/external/blockchain';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { InjectModel } from '@nestjs/sequelize';
import { ProviderTokens } from '@/model/providers';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { ConfigService } from '@nestjs/config';
import {
  chainBlocktime,
  POLLER_CONVERSION_RATE,
  PollingBatch,
  PollingInterval,
  SEAPORT_ABI,
  SeaportAddress,
  SupportedChains,
} from '@/microservice/event-poller/constants';
import { ChainMap, ChainPerBlockTime } from '@/common/libs/libs.service';
import { ChainId } from '@/common/utils/types';
import { BlockStatus, OrderStatus } from '@/model/entities/constant-model';

import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { ERC1271ABI } from '@/external/smart-contracts/eth/erc1271';
import { ERC1271_MATCH_VALUE } from '../auth/auth.interface';
import { SeaportOrderHistoryDao } from '@/core/dao/seaport-order-history-dao';
import { CacheService } from '@/common/cache';
import { ContractType } from '@/common/utils';
import { withTimeout } from '@/common/utils/utils.pure';
import * as serialize from 'serialize-javascript';
import { createHash } from 'crypto';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import { LOG_TYPE, LogService } from '@/core/log/log.service';
import { AssetExtraDao } from '@/core/dao/asset-extra-dao';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import { OrderDao } from '@/core/dao/order-dao';
const ORDER_PLATFORM_TYPE = {
  OPENSEA: 'opensea',
  LOOKSRARE: 'looksrare',
  X2Y2: 'x2y2',
  BLUR: 'blur',
  DEFAULT: 'default',
};
import { getAddress } from 'ethers/lib/utils';
import { SimpleException } from '@/common/utils/simple.util';
import {
  createPublicClient,
  defineChain,
  encodeFunctionData,
  http,
} from 'viem';
import { CollectionDao } from '@/core/dao/collection-dao';

@Injectable()
export class OrderService {
  protected readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    @InjectModel(Asset)
    private assetRepository: typeof Asset,

    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,

    @InjectModel(Account)
    private accountRepository: typeof Account,

    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,

    @InjectModel(SeaportOrder)
    private seaportOrderRepository: typeof SeaportOrder,

    @InjectModel(SeaportOrderAsset)
    private seaportOrderAssetRepository: typeof SeaportOrderAsset,

    @InjectModel(SeaportOrderHistory)
    private seaportOrderHistoryRepository: typeof SeaportOrderHistory,

    @InjectModel(Collection)
    private collectionRepository: typeof Collection,

    @InjectModel(Currency)
    private currencyRepository: typeof Currency,

    @InjectModel(PollerProgress)
    private pollerProgressRepository: typeof PollerProgress,

    private readonly configService: ConfigService,

    private readonly blockchainService: BlockchainService,

    private readonly assetService: AssetService,

    private readonly assetExtraService: AssetExtraService,

    private readonly accountService: AccountService,

    private readonly gatewayService: GatewayService,

    private traitService: TraitService,

    private assetExtraDao: AssetExtraDao,

    private seaportOrderHistoryDao: SeaportOrderHistoryDao,

    private currencyService: CurrencyService,

    private orderDao: OrderDao,
    private collectionDao: CollectionDao,

    private collectionService: CollectionService,

    private readonly rpcHandlerService: RpcHandlerService,

    private readonly cacheService: CacheService,

    private readonly logService: LogService,
  ) { }

  /**
   * @async
   * @function createOrder
   * @param {CreateOrderDTO} seaportOrder
   * @param {boolean} isBulk
   * @param {any[]} allOrders
   * @returns {Promise<boolean>}
   * @description Create order, allOrders for bulk order validation use
   */
  async createOrder(
    order: CreateOrderDTO,
    options?: {
      apiKey?: string;
    },
  ) {
    const isVerifyOrder =
      this.configService.get('IS_VERIFY_ORDER') == null
        ? true
        : this.configService.get('IS_VERIFY_ORDER') === 'true';

    // TODO: remove this code after campaign 202411 end
    // if (
    //   order.offer[0].token.toLowerCase() ==
    //     CAMPAIGN_202411_LOTTERY_NFT_ADDRESS.toLowerCase() &&
    //   !order.consideration
    //     .map((c) => c.recipient.toLowerCase())
    //     .includes(OFFICIAL_OFFERER_ADDRESS.toLowerCase())
    // ) {
    //   isVerifyOrder = false;
    // }

    if (isVerifyOrder) {
      // if (!(await this.isAccountEqualOfferer(userId, order.offerer))) {
      //   throw new HttpException(
      //     'account walletAddresses not match offerer',
      //     400,
      //   );
      // }

      // use seaport contract to check order hash is valid
      const validatedHash = await this.getOrderHash(order);
      this.logger.debug('order hash:     ' + order.hash);
      this.logger.debug('validated hash: ' + validatedHash);
      if (order.hash !== validatedHash) {
        throw new HttpException('Invalid order hash', 400);
      }

      if (order.message) {
        const isSignatureValid = await this.verifySignature(
          order.message,
          order.signature,
          order.offerer,
          +order.chainId,
        );
        if (!isSignatureValid) {
          throw new HttpException('Invalid signature', 400);
        }
      }
    }

    // check hash is unique
    const exitsOrder = await this.seaportOrderRepository.findOne({
      where: { hash: order.hash },
    });
    this.logger.debug('exitsOrder: ' + exitsOrder);
    if (exitsOrder) {
      throw new HttpException('This order already exists', 400);
    }

    const price = await this.calculateSeaportOrderPrice(order);
    this.logger.debug('order price: ' + price);
    if (price === '0') {
      throw SimpleException.fail({ debug: 'order price is 0' });
    }

    let perPrice = price;
    // partial order 使用
    if (order.orderType === 1 || order.orderType === 3) {
      // find nft amount
      let nftAmount = [];
      nftAmount = order.offer.filter((o) => o.itemType >= 2);
      if (nftAmount.length === 0) {
        nftAmount = order.consideration.filter((c) => c.itemType >= 2);
      }
      if (nftAmount.length === 0 || nftAmount.length > 1) {
        //TODO: if bundle order, cannot use partial order
        throw new HttpException(
          'partial order consideration nft amount error',
          400,
        );
      }
      perPrice = new BigNumber(price)
        .dividedBy(nftAmount[0].startAmount)
        .toString();
      this.logger.debug('order per price: ' + perPrice);
    }

    // 定義相關 asset
    let assetIds: string[] = null;
    let isCollectionOffer = false;
    const nftContractAddress = [];
    const createdOrders: {
      hash: string;
      chainId: ChainId;
      exchangeAddress: string;
    } = { hash: null, chainId: null, exchangeAddress: null };
    const seaportOrder = await this.sequelizeInstance.transaction(
      async (t: Transaction) => {
        // define offerType
        let offerType: OfferType;
        if (order.category === Category.OFFER && order.offer.length === 1) {
          offerType = OfferType.NORMAL;
          if (order.consideration[0].itemType >= 4) {
            if (order.consideration[0].identifierOrCriteria === '0') {
              offerType = OfferType.COLLECTION;
            }
            // TODO: specify offer
          }
        }

        // add seaport_order
        const dbOrder = await this.seaportOrderRepository.create(
          {
            offerer: order.offerer.toLowerCase(),
            signature: order.signature,
            hash: order.hash,
            category: order.category,
            orderType: order.orderType,
            offerType,
            startTime: order.startTime,
            endTime: order.endTime,
            isFillable: true,
            isCancelled: false,
            isExpired: false,
            isValidated: false,
            totalOriginalConsiderationItems:
              order.totalOriginalConsiderationItems,
            zone: order.zone,
            zoneHash: order.zoneHash,
            counter: order.counter,
            conduitKey: order.conduitKey,
            exchangeAddress: order.exchangeAddress?.toLowerCase(),
            chainId: order.chainId,
            salt: order.salt,
            price: +price,
            perPrice: +perPrice,
          },
          { transaction: t },
        );
        createdOrders.hash = order.hash;
        createdOrders.chainId = order.chainId;
        createdOrders.exchangeAddress = order.exchangeAddress;

        // add seaport_order_asset
        type OfferAndConsideration = OfferOrConsiderationItem & {
          side: number;
        };
        const offer = order.offer.map((o) => {
          return { ...o, side: 0 };
        });
        const consideration = order.consideration.map((o) => {
          return { ...o, side: 1 };
        });
        const offerAndConsiderations: OfferAndConsideration[] = [
          ...offer,
          ...consideration,
        ];
        const assets = [];
        let mainCurrency: Currency = null;
        const seaportOrderAsset = await Promise.map(
          offerAndConsiderations,
          async (offerAndConsideration: OfferAndConsideration) => {
            let asset: Asset = null;
            let currency: Currency = null;
            if (
              offerAndConsideration.itemType === 0 ||
              offerAndConsideration.itemType === 1
            ) {
              // native or ERC20
              try {
                currency = await this.currencyRepository.findOne({
                  where: {
                    address: Buffer.from(ethers.utils.getAddress(offerAndConsideration.token)),
                  },
                  include: {
                    model: Blockchain,
                    where: { chain_id: order.chainId },
                  },
                });
                if (!mainCurrency) {
                  mainCurrency = currency;
                }
                this.logger.debug('currency: ' + currency.id);
              } catch (e) {
                throw new HttpException(
                  'offer or consideration Currency not found',
                  400,
                );
              }
            } else if (
              offerAndConsideration.itemType === 2 ||
              offerAndConsideration.itemType === 3
            ) {
              // erc721 or erc1155
              try {
                asset = await this.assetRepository.findOne({
                  where: {
                    token_id: offerAndConsideration.identifierOrCriteria,
                    chain_id: order.chainId,
                  },
                  include: {
                    model: Contract,
                    where: {
                      address: Buffer.from(
                        ethers.utils.getAddress(offerAndConsideration.token),
                      ),
                    },
                  },
                });
                this.logger.debug('asset: ' + asset.id);
                assets.push({
                  contractAddress: offerAndConsideration.token.toLowerCase(),
                  tokenId: offerAndConsideration.identifierOrCriteria,
                  amount: offerAndConsideration.startAmount,
                });
                nftContractAddress.push(
                  offerAndConsideration.token.toLowerCase(),
                );
              } catch (e) {
                throw new HttpException(
                  'offer or consideration Asset not found',
                  400,
                );
              }
            } else if (
              offerAndConsideration.itemType === 4 ||
              offerAndConsideration.itemType === 5
            ) {
              // erc721/erc1155 collection/specify offer
              try {
                assets.push({
                  contractAddress: offerAndConsideration.token.toLowerCase(),
                  tokenId: offerAndConsideration.identifierOrCriteria,
                  amount: offerAndConsideration.startAmount,
                });
                isCollectionOffer = true;
                nftContractAddress.push(
                  offerAndConsideration.token.toLowerCase(),
                );
              } catch (e) {
                throw new HttpException(
                  'offer or consideration Asset not found',
                  400,
                );
              }
            }
            const newSeaportOrderAsset = {
              seaportOrderId: dbOrder.id,
              side: offerAndConsideration.side,
              itemType: offerAndConsideration.itemType,
              assetId: asset ? asset.id : null,
              currencyId: currency ? currency.id : null,
              token: offerAndConsideration.token,
              identifierOrCriteria: offerAndConsideration.identifierOrCriteria,
              startAmount: offerAndConsideration.startAmount,
              endAmount: offerAndConsideration.endAmount,
              availableAmount: offerAndConsideration.startAmount,
              recipient: offerAndConsideration.recipient,
            };
            return newSeaportOrderAsset;
          },
        );

        // add seaport_order_asset
        await this.seaportOrderAssetRepository.bulkCreate(seaportOrderAsset, {
          transaction: t,
        });

        // add seaport_order_history
        const seaportOrderHistory = [];
        let eventCategory: AssetEventCategory;
        if (order.category === Category.OFFER) {
          eventCategory = AssetEventCategory.OFFER;
          if (offerType === OfferType.COLLECTION) {
            eventCategory = AssetEventCategory.COLLECTION_OFFER;
          }
        } else {
          eventCategory = AssetEventCategory.LIST;
        }
        const orderSymbolPrice = +(await price);
        const symbolPriceCache = await this.currencyService.getSymbolPrice(
          mainCurrency.symbol.replace(/^W/i, '') + 'USD',
        );
        const symbolUsdPrice = symbolPriceCache ? +symbolPriceCache.price : 0;

        assets.map((asset) => {
          seaportOrderHistory.push({
            contractAddress: asset.contractAddress,
            tokenId: asset.tokenId,
            chainId: +order.chainId,
            amount: asset.amount,
            category: eventCategory,
            startTime: new Date(order.startTime * 1000),
            endTime: new Date(order.endTime * 1000),
            price: orderSymbolPrice,
            currencySymbol: mainCurrency.symbol,
            usdPrice: orderSymbolPrice * symbolUsdPrice,
            fromAddress: order.offerer.toLowerCase(),
            hash: order.hash,
          });
        });

        await this.seaportOrderHistoryRepository.bulkCreate(
          seaportOrderHistory,
          {
            transaction: t,
          },
        );

        assetIds = seaportOrderAsset
          .map((e) => e.assetId)
          .filter((e) => e != null);

        return dbOrder;
      },
    );

    // 因為創建訂單是用 transaction，所以要等 transaction 完成後才能更新 best order（需要去 DB 查詢）
    if (assetIds && assetIds.length > 0) {
      assetIds.map((assetId) => {
        this.assetExtraDao.updateAssetExtraBestOrderByAssetId(
          assetId,
          seaportOrder,
        );
      });
    } else {
      this.logger.error(
        `createOrder: can not sync asset_extra best order info. assetIds: ${assetIds}, order: ${JSON.stringify(
          order,
        )}`,
      );
    }

    if (order.category === Category.LISTING) {
      assetIds.map(async (assetId) => {
        await this.assetExtraRepository.update(
          {
            lastCreatedListingAt: new Date(),
          },
          {
            where: {
              assetId,
            },
          },
        );
      });
    }

    // update best collection offer
    if (isCollectionOffer) {
      // collection offer
      nftContractAddress.map(async (contractAddress) => {
        const collection = await this.collectionRepository.findOne({
          attributes: ['id', 'slug'],
          where: {
            contractAddress,
            chainId: order.chainId,
          },
        });
        if (collection) {
          // TODO: 需優化更新時機，不用每次有新的 collection offer 就更新
          await this.getBestCollectionOffer(collection.slug, true);
        } else {
          throw new HttpException('collection not found', 400);
        }
      });
    }

    if (order.category === Category.LISTING) {
      nftContractAddress.map(async (contractAddress) => {
        await this.updateCollectionBestListingToCache(
          contractAddress,
          order.chainId,
          {
            newListing: seaportOrder,
          },
        );
      });
    } else if (order.category === Category.OFFER) {
      nftContractAddress.map(async (contractAddress) => {
        await this.updateCollectionBestOfferToCache(
          contractAddress,
          order.chainId,
          {
            newOffer: seaportOrder,
          },
        );
      });
    }

    this.collectionDao.updateCollectionTotalByAssets(assetIds, order.category);

    const reloadedOrder = await this.seaportOrderRepository.findOne({
      where: { id: seaportOrder.id },
      include: [
        {
          model: SeaportOrderAsset,
          as: 'SeaportOrderAssets',
          include: [
            { model: Currency, include: [{ model: Blockchain }] },
            { model: Asset, include: [{ model: Contract }] },
          ],
        },
      ],
    });

    return await this.parseOrderResponse(reloadedOrder);
  }

  async parseOrderResponse(orderAsset: SeaportOrder): Promise<OrderResponse> {
    // for fulfill seaport order object
    const offer = orderAsset.SeaportOrderAssets.filter(
      (asset) => asset.side === 0,
    )
      .map((asset) => {
        return {
          token: asset.token,
          identifierOrCriteria: asset.identifierOrCriteria,
          startAmount: asset.startAmount,
          endAmount: asset.endAmount,
          availableAmount: asset.availableAmount,
          itemType: asset.itemType,
        };
      })
      .sort((a, b) => {
        // 先按照 itemType 大到小排序
        if (a.itemType > b.itemType) {
          return -1;
        } else if (a.itemType < b.itemType) {
          return 1;
        }

        // 如果 itemType 相等，再按照 startAmount 大到小排序
        if (
          new BigNumber(a.startAmount).comparedTo(new BigNumber(b.startAmount)) ===
          1
        ) {
          return -1;
        } else if (
          new BigNumber(a.startAmount).comparedTo(new BigNumber(b.startAmount)) ===
          -1
        ) {
          return 1;
        }

        // 如果 startAmount 相等，就不需要再排序了
        return 0;
      });

    const consideration = orderAsset.SeaportOrderAssets.filter(
      (asset) => asset.side === 1,
    )
      .map((asset) => {
        return {
          token: asset.token,
          identifierOrCriteria: asset.identifierOrCriteria,
          startAmount: asset.startAmount,
          endAmount: asset.endAmount,
          availableAmount: asset.availableAmount,
          itemType: asset.itemType,
          recipient: asset.recipient,
        };
      })
      .sort((a, b) => {
        // 先按照 itemType 大到小排序
        if (a.itemType > b.itemType) {
          return -1;
        } else if (a.itemType < b.itemType) {
          return 1;
        }

        // 如果 itemType 相等，再按照 startAmount 大到小排序
        if (
          new BigNumber(a.startAmount).comparedTo(new BigNumber(b.startAmount)) ===
          1
        ) {
          return -1;
        } else if (
          new BigNumber(a.startAmount).comparedTo(new BigNumber(b.startAmount)) ===
          -1
        ) {
          return 1;
        }

        // 如果 startAmount 相等，就不需要再排序了
        return 0;
      });

    const seaportOrder = {
      parameters: {
        offerer: orderAsset.offerer,
        offer,
        consideration,
        zone: orderAsset.zone,
        zoneHash: orderAsset.zoneHash,
        salt: orderAsset.salt,
        conduitKey: orderAsset.conduitKey,
        totalOriginalConsiderationItems: orderAsset.totalOriginalConsiderationItems,
        counter: orderAsset.counter,
        orderType: orderAsset.orderType,
        startTime: orderAsset.startTime,
        endTime: orderAsset.endTime,
      },
      signature: orderAsset.signature,
    };
    // native currency and ERC20
    const currencies: OrderCurrency[] = orderAsset.SeaportOrderAssets.filter(
      (asset) => asset.itemType === 0 || asset.itemType === 1,
    ).map((asset) => {
      return {
        startAmount: new BigNumber(asset.startAmount)
          .shiftedBy(-asset.Currency.decimals)
          .toString(),
        endAmount: new BigNumber(asset.startAmount)
          .shiftedBy(-asset.Currency.decimals)
          .toString(),
        address: asset.Currency.address,
        name: asset.Currency.name,
        symbol: asset.Currency.symbol,
        decimals: asset.Currency.decimals,
        isNative: asset.Currency.isNative,
        isWrapped: asset.Currency.isWrapped,
        chainId: asset.Currency.Blockchain.chainId,
      };
    });
    // ERC721 and ERC1155
    const assetIds = orderAsset.SeaportOrderAssets.filter(
      (asset) => asset.itemType >= 2,
    ).map((asset) => asset.assetId);

    const assets = [];
    this.logger.debug(`parseOrderResponse: assetIds = ${JSON.stringify(assetIds)}`);
    for (const assetId of assetIds) {
      if (assetId) {
        try {
          // Check if already included
          const includedAsset = orderAsset.SeaportOrderAssets.find(soa => soa.assetId === assetId)?.Asset;
          if (includedAsset) {
            this.logger.debug(`parseOrderResponse: asset ${assetId} found in includes`);
            assets.push(includedAsset);
          } else {
            this.logger.debug(`parseOrderResponse: fetching asset ${assetId} via findById`);
            const asset = await this.assetService.findById(assetId);
            assets.push(asset);
          }
        } catch (error) {
          this.logger.error(`parseOrderResponse: error fetching asset ${assetId}: ${error.message}`);
          // collection offer will not have asset
        }
      }
    }
    this.logger.debug(`parseOrderResponse: assets count = ${assets.length}`);

    const formattedAssets = assets.map((asset) => {
      return this.assetService.parseAsset(asset);
    });

    const collections = [];
    for (const asset of orderAsset.SeaportOrderAssets) {
      if (asset.itemType >= 2) {
        try {
          const collection =
            await this.collectionService.getCollectionSimpleByAddressAndChainId(
              asset.token.toLowerCase(),
              orderAsset.chainId.toString() as ChainId,
            );

          collections.push(collection);
        } catch (error) {
          // if collection been ban or delete, will not have collection
        }
      }
    }

    const account = await this.accountService.getSimpleAccountByQuery({
      walletAddress: orderAsset.offerer,
    });

    const order = {
      id: orderAsset.id,
      category: orderAsset.category,
      offerType: orderAsset.offerType,
      hash: orderAsset.hash,
      orderType: orderAsset.orderType,
      chainId: orderAsset.chainId,
      offerer: orderAsset.offerer,
      startTime: orderAsset.startTime,
      endTime: orderAsset.endTime,
      price: orderAsset.price,
      perPrice: orderAsset.perPrice,
      priceSymbol: currencies?.[0]?.symbol || 'ETH',
      isFillable: orderAsset.isFillable,
      isCancelled: orderAsset.isCancelled,
      isExpired: orderAsset.isExpired,
      isValidated: orderAsset.isValidated,
      assets: formattedAssets,
      collections,
      currencies,
      seaportOrder,
      exchangeAddress: orderAsset.exchangeAddress,
      account,
      platformType: orderAsset.platformType,
      createdAt: orderAsset.createdAt,
      updatedAt: orderAsset.updatedAt,
    };
    return order;
  }

  @Cacheable({
    seconds: 10,
  })
  async isAccountEqualOfferer(
    accountId: string,
    offerer: string,
  ): Promise<boolean> {
    const account = await this.accountRepository.findOne({
      attributes: ['id'],
      where: { id: accountId },
      include: {
        attributes: ['address'],
        model: Wallet,
      },
    });

    let isEqual = false;
    account.wallets.map((wallet) => {
      if (wallet.address.toLowerCase() === offerer.toLowerCase()) {
        isEqual = true;
      }
    });

    return isEqual;
  }

  public getSeaportOrderStructureByCreateOrderDTO(
    createOrderDTO: CreateOrderDTO,
  ) {
    return {
      parameters: {
        offerer: createOrderDTO.offerer,
        zone: createOrderDTO.zone,
        zoneHash: createOrderDTO.zoneHash,
        startTime: createOrderDTO.startTime,
        endTime: createOrderDTO.endTime,
        orderType: createOrderDTO.orderType,
        offer: createOrderDTO.offer,
        consideration: createOrderDTO.consideration,
        totalOriginalConsiderationItems:
          createOrderDTO.totalOriginalConsiderationItems,
        salt: createOrderDTO.salt,
        conduitKey: createOrderDTO.conduitKey,
        counter: createOrderDTO.counter,
      },
      signature: createOrderDTO.signature,
    };
  }

  // TODO: deprecated
  public async validateOrdersSignatures(
    createOrderDTOs: CreateOrderDTO[],
  ): Promise<boolean> {
    if (!createOrderDTOs.length) return false;

    const chainId = Number(createOrderDTOs[0].chainId);
    const exchangeAddress = createOrderDTOs[0].exchangeAddress;

    // 使用 Viem 建立 RPC 連線

    // 定義完整的自定義鏈
    const customChain = defineChain({
      id: chainId,
      name: 'CustomChain',
      nativeCurrency: { name: 'Custom', symbol: 'Custom', decimals: 18 },
      rpcUrls: {
        default: {
          http: [this.rpcHandlerService.getRpcUrl(chainId)],
        },
      },
    });

    const client = createPublicClient({
      chain: customChain, // 使用完整的 chain
      transport: http(),
    });

    try {
      // 轉換成 Seaport 需要的 Order 結構

      const seaportOrders = createOrderDTOs.map((order) => {
        return {
          parameters: {
            offerer: order.offerer,
            zone: order.zone,
            zoneHash: order.zoneHash,
            startTime: order.startTime,
            endTime: order.endTime,
            orderType: order.orderType,
            offer: order.offer,
            consideration: order.consideration,
            totalOriginalConsiderationItems:
              order.totalOriginalConsiderationItems,
            salt: order.salt,
            conduitKey: order.conduitKey,
            counter: order.counter,
          },
          signature: order.signature,
        };
      });

      // ABI 編碼 Seaport `validate` 方法
      const encodedData = encodeFunctionData({
        abi: Seaport_ABI,
        functionName: 'validate',
        args: [seaportOrders],
      });
      // 發送 call 請求
      const result = await client.call({
        to: exchangeAddress as `0x${string}`,
        data: encodedData,
      });
      return true;
    } catch (error) {
      console.error('Seaport Order Validation Failed:', error);
      return false;
    }
  }
  public async isValidateSeaportOrdersSignature(
    chainId: number,
    exchangeAddress: string,
    seaportOrders: {
      parameters: {
        offerer: string;
        zone: string;
        zoneHash: string;
        startTime: number;
        endTime: number;
        orderType: number;
        offer: OfferDTO[];
        consideration: ConsiderationDTO[];
        totalOriginalConsiderationItems: number;
        salt: string;
        conduitKey: string;
        counter: string;
      };
      signature: string;
    }[],
  ): Promise<boolean> {
    // 1. Try Local Validation (EOA)
    try {
      const domainData = {
        name: 'Seaport',
        version: '1.4',
        chainId,
        verifyingContract: exchangeAddress,
      };

      let allValidLocally = true;
      for (const order of seaportOrders) {
        const seaportOrder = {
          offerer: order.parameters.offerer,
          zone: order.parameters.zone,
          offer: order.parameters.offer,
          consideration: order.parameters.consideration,
          orderType: order.parameters.orderType,
          startTime: order.parameters.startTime,
          endTime: order.parameters.endTime,
          zoneHash: order.parameters.zoneHash,
          salt: order.parameters.salt,
          conduitKey: order.parameters.conduitKey,
          counter: order.parameters.counter,
          totalOriginalConsiderationItems:
            order.parameters.totalOriginalConsiderationItems,
        };

        try {
          const signer = ethers.utils.verifyTypedData(
            domainData,
            EIP_712_ORDER_TYPE,
            seaportOrder,
            order.signature,
          );
          if (signer.toLowerCase() !== order.parameters.offerer.toLowerCase()) {
            allValidLocally = false;
            break;
          }
        } catch (e) {
          // verifyTypedData failed (e.g. smart contract signature or bulk signature)
          allValidLocally = false;
          break;
        }
      }

      if (allValidLocally) {
        return true;
      }
    } catch (e) {
      this.logger.warn(`Local validation failed: ${e.message}`);
      // Fallback to RPC
    }

    // 2. Fallback to RPC Validation (Smart Account / Bulk Order)
    // 建立 RPC 連線
    const customChain = defineChain({
      id: chainId,
      name: 'CustomChain',
      nativeCurrency: { name: 'Custom', symbol: 'Custom', decimals: 18 },
      rpcUrls: {
        default: { http: [this.rpcHandlerService.getRpcUrl(chainId)] },
      },
    });

    const client = createPublicClient({
      chain: customChain,
      transport: http(),
    });

    try {
      // ABI 編碼 Seaport `validate` 方法 (Batch)
      const encodedData = encodeFunctionData({
        abi: Seaport_ABI,
        functionName: 'validate',
        args: [seaportOrders], // **批次驗證**
      });

      // 發送 call 請求
      // Seaport validate returns true if valid, or reverts if invalid
      await client.call({
        to: exchangeAddress as `0x${string}`,
        data: encodedData,
      });

      return true;
    } catch (error) {
      console.error('Seaport Order Validation Failed:', error);
      return false;
    }
  }

  /**
   * @async
   * @function calculateSeaportOrderPrice
   * @param {CreateOrderDTO} seaportOrder
   * @returns {Promise<string>} price
   * @example consideration currency += 8,700,000,000,000,000,000(ETH) well return '8.7'
   */
  async calculateSeaportOrderPrice(order: CreateOrderDTO) {
    let amount = new BigNumber(0);
    let decimals = -1;
    if (order.offer.length === 1) {
      let offerOrConsiderations: OfferDTO[] | ConsiderationDTO[];
      if (order.offer[0].itemType === 0 || order.offer[0].itemType === 1) {
        // if it's a buy order (offer currency)
        offerOrConsiderations = order.offer;
      } else {
        // if it's a listing order (offer asset)
        offerOrConsiderations = order.consideration;
      }
      await Promise.map(offerOrConsiderations, async (offerOrConsideration) => {
        if (
          offerOrConsideration.itemType === 0 ||
          offerOrConsideration.itemType === 1
        ) {
          amount = amount.plus(offerOrConsideration.startAmount);
          if (decimals === -1) {
            try {
              const currency = await this.currencyRepository.findOne({
                where: {
                  address: offerOrConsideration.token.toLowerCase(),
                },
                include: {
                  model: Blockchain,
                  where: { chain_id: order.chainId },
                },
              });
              decimals = currency.decimals;
            } catch (e) {
              throw new Error('Currency not found');
            }
          }
        }
      });
      return amount.shiftedBy(-decimals).toString();
    } else {
      // if it's a bundle order
      // use first currency as the base currency of price
      let currencyAddress = '';
      await Promise.map(order.consideration, async (c) => {
        if (c.itemType === 0 || c.itemType === 1) {
          if (currencyAddress === '') {
            currencyAddress = c.token;
          }
          if (currencyAddress != c.token) {
            // skip if currency is different
            return false;
          }
          amount = amount.plus(c.startAmount);
          if (decimals === -1) {
            try {
              const currency = await this.currencyRepository.findOne({
                where: {
                  address: c.token.toLowerCase(),
                },
                include: {
                  model: Blockchain,
                  where: { chain_id: order.chainId },
                },
              });
              decimals = currency.decimals;
            } catch (e) {
              throw new Error('Currency not found');
            }
          }
        }
      });
      return amount.shiftedBy(-decimals).toString();
    }
  }

  /**
   * @async
   * @function getOrderHash
   * @param {CreateOrderDTO} seaportOrder
   * @returns {Promise<string>} orderHash
   * @description Get order hash from exchange seaport contract
   */
  @RpcCall({
    chainIdFn: (args) => args[0].chainId,
  })
  async getOrderHash(order: CreateOrderDTO): Promise<string> {
    const seaportOrder = {
      offerer: order.offerer,
      offer: order.offer,
      consideration: order.consideration,
      startTime: order.startTime,
      endTime: order.endTime,
      orderType: order.orderType,
      zone: order.zone,
      zoneHash: order.zoneHash,
      salt: order.salt,
      conduitKey: order.conduitKey,
      totalOriginalConsiderationItems: order.totalOriginalConsiderationItems,
      counter: order.counter,
    };
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      Number(order.chainId),
    );
    const seaportContract = new ethers.Contract(
      order.exchangeAddress,
      Seaport_ABI,
      provider,
    );
    const orderHash: string = await seaportContract.getOrderHash(seaportOrder);
    return orderHash;
  }

  // TODO: no support bulk order, so delete this function
  /**
   * @param {CreateOrderDTO} seaportOrder
   * @returns {Promise<boolean>}
   * @description Get the order signer is offerer or not
   * @notice
   */
  async isOrderSignerEqualOfferer(
    order: CreateOrderDTO,
    allOrders?: any,
  ): Promise<boolean> {
    const signature = order.signature;

    const verifyingContract = order.exchangeAddress;
    const chainId = order.chainId;
    const domainData = {
      name: 'Seaport',
      version: '1.4',
      verifyingContract,
      chainId,
    };
    const seaportOrder = allOrders ?? {
      offerer: order.offerer,
      zone: order.zone,
      offer: order.offer,
      consideration: order.consideration,
      orderType: order.orderType,
      startTime: order.startTime,
      endTime: order.endTime,
      zoneHash: order.zoneHash,
      salt: order.salt,
      conduitKey: order.conduitKey,
      counter: order.counter,
      totalOriginalConsiderationItems: order.totalOriginalConsiderationItems,
    };

    try {
      const signer = ethers.utils.verifyTypedData(
        domainData,
        allOrders ? EIP_712_BULK_ORDER_TYPE : EIP_712_ORDER_TYPE,
        seaportOrder,
        signature,
      );

      return signer.toLowerCase() === order.offerer.toLowerCase();
    } catch (e) {
      try {
        return await this.getSAIsValidSignatureByRpc(
          order.chainId,
          order.offerer,
          domainData,
          seaportOrder,
          signature,
        );
      } catch (e) {
        this.logger.error(e);
        throw new HttpException('isOrderSignerEqualOfferer wrong', 400);
      }
    }
  }

  async verifySignature(
    message: string,
    signature: string,
    address: string,
    chainId: number,
  ): Promise<boolean> {
    // 用 viem 驗證 message 跟 signature 是不是 wallet 簽的
    const client = createPublicClient({
      transport: http(this.rpcHandlerService.getRpcUrl(chainId)),
    });

    const valid = await client.verifyMessage({
      address: address as any,
      message: message,
      signature: signature as any,
    });

    return valid;
  }

  @RpcCall()
  async getSAIsValidSignatureByRpc(
    chainId: ChainId,
    offerer: string,
    domainData: any,
    order: any,
    signature: string,
  ): Promise<boolean> {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      Number(chainId),
    );
    const smartAccountContract: ethers.Contract = new ethers.Contract(
      offerer,
      ERC1271ABI,
      provider,
    );

    const isValidSignature =
      (await smartAccountContract.isValidSignature(
        ethers.utils._TypedDataEncoder.hash(
          domainData,
          EIP_712_ORDER_TYPE,
          order,
        ),
        signature,
      )) === ERC1271_MATCH_VALUE;

    return isValidSignature;
  }

  /**
   * @async
   * @function getSeaportOrder
   * @param {GetOrderDTO} seaportOrder
   * @returns {Promise<string>}
   */
  async getOrder(options: GetOrderDTO) {
    this.logger.debug(options);
    const orderWhereCondition = { isFillable: true };
    if (options.hash) {
      orderWhereCondition['hash'] = Buffer.from(options.hash);
    }
    if (options.hashes) {
      orderWhereCondition['hash'] = options.hashes.map((h) => Buffer.from(h));
    }
    if (options.chainId) {
      orderWhereCondition['chainId'] = options.chainId;
    }
    if (options.offerer) {
      orderWhereCondition['offerer'] = Buffer.from(
        options.offerer.toLowerCase(),
      );
    }
    if (options.offererUsername) {
      const account = await this.accountRepository.findOne({
        attributes: ['id'],
        where: { username: options.offererUsername },
        include: {
          attributes: ['address'],
          model: Wallet,
        },
      });
      orderWhereCondition['offerer'] = account.wallets.map((wallet) =>
        Buffer.from(wallet.address.toLowerCase()),
      );
    }
    if (options.orderType) {
      orderWhereCondition['orderType'] = options.orderType;
    }
    if (options.exchangeAddress) {
      orderWhereCondition['exchangeAddress'] = Buffer.from(
        options.exchangeAddress.toLowerCase(),
      );
    }
    if (options.category) {
      orderWhereCondition['category'] = options.category;
    }
    if (options.category == Category.OFFER && options.offerType) {
      orderWhereCondition['offerType'] = options.offerType;
    }

    // time filter
    if (options.startTimeGt) {
      orderWhereCondition['startTime'] = {
        [Op.gt]: options.startTimeGt,
      };
    }
    if (options.startTimeLt) {
      orderWhereCondition['startTime'] = {
        [Op.lt]: options.startTimeLt,
      };
    }
    if (options.endTimeGt) {
      orderWhereCondition['endTime'] = {
        [Op.gt]: options.endTimeGt,
      };
    }
    if (options.endTimeLt) {
      orderWhereCondition['endTime'] = {
        [Op.lt]: options.endTimeLt,
      };
    }

    // price filter
    if (options.priceGt) {
      orderWhereCondition['per_price'] = { [Op.gt]: options.priceGt };
    }
    if (options.priceGte) {
      orderWhereCondition['per_price'] = { [Op.gte]: options.priceGte };
    }
    if (options.priceLt) {
      orderWhereCondition['per_price'] = { [Op.lt]: options.priceLt };
    }
    if (options.priceLte) {
      orderWhereCondition['per_price'] = { [Op.lte]: options.priceLte };
    }
    if (options.priceBetween) {
      const [low, high] = options.priceBetween.split(',');
      orderWhereCondition['per_price'] = {
        [Op.between]: [low, high],
      };
    }
    if (options.priceNotBetween) {
      const [low, high] = options.priceBetween.split(',');
      orderWhereCondition['per_price'] = {
        [Op.notBetween]: [low, high],
      };
    }

    if (options.isFillable) {
      orderWhereCondition['isFillable'] = options.isFillable;
    }
    if (options.isCancelled) {
      orderWhereCondition['isCancelled'] = options.isCancelled;
    }
    if (options.isExpired) {
      orderWhereCondition['isExpired'] = options.isExpired;
    }
    if (options.isFulfilled) {
      orderWhereCondition['isFullyFilled'] = options.isFulfilled;
    }

    // contract (and tokenId) filter
    if (options.contractAddress) {
      let orderAssetsWhereCondition = {};

      // offer 的情況要包含 collection offer
      if (options.category === Category.OFFER) {
        orderAssetsWhereCondition = {
          [Op.or]: [
            {
              // ERC721, ERC1155
              token: Buffer.from(ethers.utils.getAddress(options.contractAddress)),
              itemType: {
                [Op.between]: [2, 3],
              },
              identifierOrCriteria: options.tokenId
                ? Buffer.from(options.tokenId)
                : options.tokenIds
                  ? options.tokenIds.map((id) => Buffer.from(id))
                  : null,
            },
            {
              // ERC721_WITH_CRITERIA, ERC1155_WITH_CRITERIA
              itemType: {
                [Op.between]: [4, 5],
              },
              token: Buffer.from(ethers.utils.getAddress(options.contractAddress)),
            },
          ],
        };
      } else {
        orderAssetsWhereCondition = {
          // ERC721, ERC1155
          token: Buffer.from(ethers.utils.getAddress(options.contractAddress)),
          itemType: {
            [Op.between]: [2, 5],
          },
          identifierOrCriteria: options.tokenId
            ? Buffer.from(options.tokenId)
            : null,
        };
      }

      const eligibleOrders = await this.seaportOrderRepository.findAll({
        attributes: ['id'],
        include: [
          {
            attributes: ['id'],
            model: SeaportOrderAsset,
            where: orderAssetsWhereCondition,
          },
        ],
      });

      const eligibleOrderIds = eligibleOrders.map((order) => order.id);
      if (orderWhereCondition['id']) {
        orderWhereCondition['id'] = {
          [Op.and]: [
            { [Op.in]: orderWhereCondition['id'] },
            { [Op.in]: eligibleOrderIds },
          ],
        };
      } else {
        orderWhereCondition['id'] = { [Op.in]: eligibleOrderIds };
      }
    }

    // currency filter
    if (options.currencySymbol) {
      const eligibleOrders = await this.seaportOrderRepository.findAll({
        attributes: ['id'],
        include: [
          {
            attributes: ['id'],
            model: SeaportOrderAsset,
            include: [
              {
                attributes: ['id'],
                model: Currency,
              },
            ],
          },
        ],
        where: {
          '$SeaportOrderAsset->Currency"."symbol$': options.currencySymbol,
        },
      });
      const eligibleOrderIds = eligibleOrders.map((order) => order.id);
      if (orderWhereCondition['id']) {
        orderWhereCondition['id'] = orderWhereCondition['id'].filter((id) =>
          eligibleOrderIds.includes(id),
        );
      } else {
        orderWhereCondition['id'] = eligibleOrderIds;
      }
    }

    // query order by condition
    const seaportOrders = await this.seaportOrderRepository.findAll({
      where: orderWhereCondition,
      include: [
        {
          model: SeaportOrderAsset,
          include: [{ model: Currency, include: [{ model: Blockchain }] }],
        },
      ],
      order: options.sortBy,
      limit: options.limit,
      offset: (options.page - 1) * options.limit,
    });

    const count = await this.seaportOrderRepository.count({
      where: orderWhereCondition,
    });

    // tidy up the result
    const orders = await Promise.map(
      seaportOrders,
      async (orderAsset) => {
        return this.parseOrderResponse(orderAsset);
      },
      { concurrency: 10 },
    );

    return { orders, count };
  }

  async getCollectionBestOffer(contractAddress: string, chainId: string) {
    const result = (await this.sequelizeInstance.query(
      `
      SELECT
          seaport_order.id,
          seaport_order.price,
          seaport_order.per_price,
          seaport_order.start_time,
          seaport_order.end_time,
          seaport_order.category,
          seaport_order.is_fillable,
          seaport_order.hash,
          seaport_order.chain_id,
          seaport_order.exchange_address,
          seaport_order.platform_type
      FROM seaport_order
      JOIN asset_extra
        ON asset_extra.best_listing_order_id = seaport_order.id
      JOIN collections
        ON asset_extra.collection_id = collections.id
      WHERE
          seaport_order.is_fillable = true
          AND seaport_order.category = 'offer'
          AND asset_extra.chain_id = :chain_id
          AND collections.chain_id = :chain_id
          AND collections.contract_address = :contract_address
      ORDER BY per_price DESC, platform_type, end_time
      LIMIT 1
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          chain_id: chainId,
          contract_address: contractAddress.toLowerCase(),
        },
      },
    )) as any;

    if (result.length == 0) {
      return null;
    }

    const order = {
      id: result[0].id,
      price: result[0].price,
      perPrice: result[0].per_price,
      startTime: result[0].start_time,
      endTime: result[0].end_time,
      category: result[0].category,
      isFillable: result[0].is_fillable,
      hash: result[0].hash,
      chainId: result[0].chain_id,
      exchangeAddress: result[0].exchange_address,
      platformType: result[0].platform_type,
    };

    return order;
  }

  async getCollectionTotalOffer(contractAddress: string, chainId: string) {
    return await this.seaportOrderRepository.count({
      where: {
        chainId,
        category: Category.OFFER,
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

  async getCollectionTotalListing(contractAddress: string, chainId: string) {
    return await this.seaportOrderRepository.count({
      where: {
        chainId,
        category: Category.LISTING,
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

  async getCollectionCurrentOffer(contractAddress: string, chainId: string) {
    return await this.seaportOrderRepository.count({
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
    });
  }

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

  async getCollectionTotalVolume(collectionId) {
    void collectionId;
    return 0;
  }

  // 跟上面的 getCollectionOrderStatistic 一樣，這個理論上在大量訂單的 collection 會有比較好的效能，
  // 但是在小量訂單的 collection 會比較慢，目前沒必要用
  // async getCollectionOrderStatus(contractAddress: string, chainId: string) {
  //   const collection = await this.collectionRepository.findOne({
  //     attributes: ['id', 'slug'],
  //     where: {
  //       contractAddress: contractAddress,
  //       chainId: chainId,
  //     },
  //   });
  //
  //   if (!collection) {
  //     return {
  //       floorPrice: 0,
  //       bestOffer: 0,
  //       currentOffer: 0,
  //       currentListing: 0,
  //       totalOffer: 0,
  //       totalListing: 0,
  //       totalVolume: 0,
  //     };
  //   }
  //
  //   const [
  //     bestListing,
  //     bestOffer,
  //     // totalOffer,
  //     // totalListing,
  //     // currentOffer,
  //     // currentListing,
  //     totalVolume,
  //   ] = await Promise.all([
  //     this.getCollectionBestListingFromCache(contractAddress, chainId),
  //     this.getCollectionBestOfferFromCache(contractAddress, chainId),
  //     // this.getCollectionTotalOffer(contractAddress, chainId),
  //     // this.getCollectionTotalListing(contractAddress, chainId),
  //     // this.getCollectionCurrentOffer(contractAddress, chainId),
  //     // this.getCollectionCurrentListing(contractAddress, chainId),
  //     this.getCollectionTotalVolume(collection.id),
  //   ]);
  //
  //   return {
  //     floorPrice: bestListing?.perPrice || 0,
  //     bestOffer: bestOffer?.perPrice || 0,
  //     // currentOffer: currentOffer,
  //     // currentListing: currentListing,
  //     // totalOffer: totalOffer,
  //     // totalListing: totalListing,
  //     totalVolume,
  //   };
  // }

  async getCollectionBestListingFromCache(
    contractAddress: string,
    chainId: string,
  ): Promise<CacheBestListing> {
    const key = `${COLLECTION_BEST_LISTING_KEY}:${contractAddress}:${chainId}`;
    const bestListing = await this.cacheService.getCache(key);

    if (!bestListing) {
      const bestListing = await this.updateCollectionBestListingToCache(
        contractAddress,
        chainId,
        {
          force: true,
        },
      );

      return bestListing;
    }
    return await this.cacheService.getCache(key);
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

  async getCollectionBestOfferFromCache(
    contractAddress: string,
    chainId: string,
  ): Promise<CacheBestListing> {
    const key = `${COLLECTION_BEST_OFFER_KEY}:${contractAddress}:${chainId}`;
    const bestOffer = await this.cacheService.getCache(key);

    if (!bestOffer) {
      const bestOffer = await this.updateCollectionBestOfferToCache(
        contractAddress,
        chainId,
        {
          force: true,
        },
      );

      return bestOffer;
    }

    return bestOffer;
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

  @logRunDuration(new Logger(OrderService.name))
  async syncExpiredOrders(): Promise<boolean> {
    try {
      const orderWhere = {
        endTime: {
          [Op.lt]: new Date().getTime() / 1000,
        },
        isExpired: false,
        isFillable: true,
      };
      // 找出所有過期訂單
      const orders = await this.seaportOrderRepository.findAll({
        where: orderWhere,
        limit: 200,
      });

      // 更新過期訂單狀態
      await this.seaportOrderRepository.update(
        {
          isFillable: false,
          isExpired: true,
        },
        {
          where: orderWhere,
        },
      );

      if (orders) {
        for (const order of orders) {
          // 把對應訂單的歷史紀錄更新為過期
          await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
            { orderHash: order.hash, chainId: order.chainId },
            OrderStatus.EXPIRED,
          );

          // update best collection offer
          if (
            order.category === Category.OFFER &&
            order.offerType === OfferType.COLLECTION
          ) {
            const asset = await this.seaportOrderAssetRepository.findOne({
              attributes: ['id', 'token'],
              where: {
                seaportOrderId: order.id,
                side: 1,
                itemType: { [Op.in]: [4, 5] },
              },
            });
            const collection = await this.collectionRepository.findOne({
              attributes: ['id', 'slug'],
              where: {
                contractAddress: asset.token.toLowerCase(),
                chainId: order.chainId,
              },
            });
            if (collection) {
              const bestCollectionOffer: BestCollectionOfferOrder =
                await this.getBestCollectionOffer(collection.slug);

              // force update best collection offer
              if (
                bestCollectionOffer.hasBestCollectionOrder &&
                bestCollectionOffer.bestSeaportOrder.hash === order.hash
              ) {
                await this.getBestCollectionOffer(collection.slug, true);
              }
            } else {
              throw new HttpException('collection not found', 400);
            }
          }
        }
      }

      return true;
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

  async getAccountOrderReceived(options: GetAccountOrderReceiveDTO) {
    let wallets = [];
    if (options.userAddress) {
      wallets = options.userAddress;
    } else if (options.username) {
      wallets = (
        await this.accountRepository.findAll({
          attributes: ['id', 'username'],
          where: {
            username: options.username,
          },
          include: {
            attributes: ['address'],
            model: Wallet,
          },
        })
      ).map((account) => account.wallets.map((wallet) => wallet.address))[0];
    }

    if (wallets.length === 0) {
      return { orders: [], count: 0 };
    }

    const assetIds = (
      await this.assetAsEthAccountRepository.findAll({
        attributes: ['assetId'],
        where: {
          ownerAddress: { [Op.in]: wallets },
        },
        include: options.chainId
          ? [
            {
              attributes: [],
              model: Asset,
              where: {
                chainId: options.chainId,
              },
            },
          ]
          : [],
      })
    ).map((asset) => asset.assetId);

    if (assetIds.length === 0) {
      return { orders: [], count: 0 };
    }

    const assetExtra = await this.assetExtraRepository.findAndCountAll({
      where: {
        assetId: assetIds,
      },
      include: [
        {
          required: true,
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
              required: false,
              attributes: ['id', 'startAmount', 'availableAmount'],
              model: SeaportOrderAsset,
              where: {
                itemType: { [Op.in]: [2, 3, 4, 5] },
              },
            },
          ],
        },
        {
          model: Asset,
        },
        {
          model: Collection,
        },
        {
          model: Contract,
        },
      ],
      limit: options.limit,
      offset: (options.page - 1) * options.limit,
    });

    return assetExtra;
  }

  @Cacheable({ seconds: 30 })
  async getOrderHistory(
    options: GetOrderHistoryDTO,
  ): Promise<OrderHistoryListResponse> {
    const category =
      options.category?.map((cat) => `${cat.toLowerCase()}`) || null;
    const toAddress = options.toAddress || null;
    const fromAddress = options.fromAddress || null;
    const userAddress = options.userAddress || null;
    const contractAddress = options.contractAddress || null;
    const tokenId = options.tokenId || null;
    const chainId = options.chainId || null;
    const recentDays =
      new Date(new Date().setDate(new Date().getDate() - options.recentDays)) ||
      null;

    const startTimeGt = options.startTimeGt || null;
    const startTimeLt = options.startTimeLt || null;
    const platformType = options.platformType || null;
    const limit = options.limit || null;
    const offset = (options.page - 1) * options.limit || null;

    const ordersHistory = await this.sequelizeInstance.query(
      `
      SELECT
        seaport_order_history.contract_address AS "contractAddress",
        seaport_order_history.from_address AS "fromAddress",
        seaport_order_history.to_address AS "toAddress",
        seaport_order_history.hash AS "hash",
        seaport_order_history.tx_hash AS "txHash",
        seaport_order_history.id AS "id",
        seaport_order_history.token_id AS "tokenId",
        seaport_order_history.amount AS "amount",
        seaport_order_history.chain_id AS "chainId",
        seaport_order_history.category AS "category",
        seaport_order_history.start_time AS "startTime",
        seaport_order_history.end_time AS "endTime",
        seaport_order_history.price AS "price",
        REGEXP_REPLACE(
            TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM
                (seaport_order_history.price::NUMERIC(78, 17) / seaport_order_history.amount::NUMERIC(78, 17))::TEXT
            )),
            '^$', '0'
          ) AS "perPrice",
        seaport_order_history.currency_symbol AS "currencySymbol",
        seaport_order_history.usd_price AS "usdPrice",
        seaport_order_history.created_at AS "createdAt",
        seaport_order_history.updated_at AS "updatedAt",
        seaport_order_history.deleted_at AS "deletedAt",
        seaport_order_history.order_status AS "orderStatus",
        seaport_order_history.platform_type AS "platformType",
        asset.name AS "assetName",
        asset.image_url AS "assetImageUrl",
        asset.image_preview_url AS "assetImagePreviewUrl",
        collections.id AS "collectionId",
        collections.chain_short_name AS "collectionChainShortName",
        collections.slug AS "collectionSlug",
        collections.name AS "collectionName",
        collections.contract_address AS "collectionContractAddress",
        collections.service_fee AS "collectionServiceFee",
        collections.creator_fee AS "collectionCreatorFee",
        collections.owner_address AS "collectionOwnerAddress",
        collections.logo_image_url AS "collectionLogoImageUrl",
        collections.external_links AS "collectionExternalLinks",
        collections.is_verified AS "collectionIsVerified"
      FROM seaport_order_history
      LEFT JOIN collections
        ON collections.contract_address = encode(seaport_order_history.contract_address, 'escape')
          AND collections.chain_id = seaport_order_history.chain_id
      LEFT JOIN contract
        ON contract.address = seaport_order_history.contract_address
          AND contract.chain_id = seaport_order_history.chain_id
      LEFT JOIN asset
        ON asset.token_id = seaport_order_history.token_id
          AND contract.id = asset.contract_id
          AND seaport_order_history.category != 'collection_offer'
      LEFT JOIN asset_extra
        ON asset.id = asset_extra.asset_id
      WHERE (
          collections.block != 'Blocked'
          OR asset_extra.block != 'Blocked'
        )
        ${options.category ? `AND seaport_order_history.category IN (:category)` : ''}
        ${options.toAddress ? 'AND seaport_order_history.to_address = :toAddress' : ''}
        ${options.fromAddress ? 'AND seaport_order_history.from_address = :fromAddress' : ''}
        ${options.userAddress
        ? 'AND (seaport_order_history.to_address = :userAddress OR seaport_order_history.from_address = :userAddress)'
        : ''
      }
        ${options.contractAddress
        ? 'AND seaport_order_history.contract_address = :contractAddress'
        : ''
      }
        ${options.tokenId
        ? `AND seaport_order_history.token_id = :tokenId AND seaport_order_history.category != 'collection_offer'`
        : ''
      }
        ${options.chainId ? 'AND seaport_order_history.chain_id = :chainId' : ''}
        ${options.recentDays
        ? 'AND seaport_order_history.start_time >= :recentDays'
        : ''
      }
        ${options.startTimeGt
        ? 'AND seaport_order_history.start_time > :startTimeGt'
        : ''
      }
        ${options.startTimeLt
        ? 'AND seaport_order_history.start_time < :startTimeLt'
        : ''
      }
        ${options.platformType
        ? 'AND seaport_order_history.platform_type = :platformType'
        : ''
      }
      ORDER BY seaport_order_history.created_at DESC
      LIMIT :limit
      OFFSET :offset
    `,
      {
        replacements: {
          category,
          toAddress,
          fromAddress,
          userAddress,
          contractAddress,
          tokenId,
          chainId,
          recentDays,
          startTimeGt,
          startTimeLt,
          platformType,
          limit,
          offset,
        },
        type: QueryTypes.SELECT,
      },
    );

    // convert buffer to string
    ordersHistory.map((e: any) => {
      e.contractAddress = e.contractAddress?.toString('utf8');
      e.fromAddress = e.fromAddress?.toString('utf8');
      e.toAddress = e.toAddress?.toString('utf8');
      e.hash = e.hash?.toString('utf8');
      e.txHash = e.txHash?.toString('utf8');
    });

    if (!options.contractAddress && !options.userAddress) {
      return { ordersHistory, count: 9999 };
    }

    const serializedRequestKey = serialize(options);
    // enHash
    const requestCountKey = `req:getOrderHistory:${createHash('md5')
      .update(serializedRequestKey)
      .digest('hex')}:count`;
    const cacheRequestCount =
      await this.cacheService.getCache<number>(requestCountKey);
    // this.logger.debug(`cacheRequestCount ${cacheRequestCount}`);
    if (cacheRequestCount != null) {
      return { ordersHistory, count: cacheRequestCount };
    }

    const countPromise = this.sequelizeInstance.query(
      `
      SELECT count(*)
      FROM seaport_order_history
      LEFT JOIN collections
        ON collections.contract_address = encode(seaport_order_history.contract_address, 'escape')
          AND collections.chain_id = seaport_order_history.chain_id
      LEFT JOIN contract
        ON contract.address = seaport_order_history.contract_address
          AND contract.chain_id = seaport_order_history.chain_id
      LEFT JOIN asset
        ON asset.token_id = seaport_order_history.token_id
          AND contract.id = asset.contract_id
          AND seaport_order_history.category != 'collection_offer'
      LEFT JOIN asset_extra
        ON asset.id = asset_extra.asset_id
      WHERE
        (
          collections.block != 'Blocked'
          OR asset_extra.block != 'Blocked'
        )
        ${options.category ? `AND seaport_order_history.category IN (:category)` : ''}
        ${options.toAddress ? 'AND to_address = :toAddress' : ''}
        ${options.fromAddress ? 'AND from_address = :fromAddress' : ''}
        ${options.userAddress
        ? 'AND (to_address = :userAddress OR from_address = :userAddress)'
        : ''
      }
        ${options.contractAddress
        ? 'AND seaport_order_history.contract_address = :contractAddress'
        : ''
      }
        ${options.tokenId
        ? `AND seaport_order_history.token_id = :tokenId AND seaport_order_history.category != 'collection_offer'`
        : ''
      }
        ${options.chainId ? 'AND seaport_order_history.chain_id = :chainId' : ''
      }
        ${options.recentDays
        ? 'AND seaport_order_history.created_at >= :recentDays'
        : ''
      }
    `,
      {
        replacements: {
          category,
          toAddress,
          fromAddress,
          userAddress,
          contractAddress,
          tokenId,
          chainId,
          recentDays,
        },
        type: QueryTypes.SELECT,
      },
    );
    let count = 0;
    try {
      const countRes = await withTimeout(countPromise, 800);
      count = +(countRes as [{ count: string }])[0].count;
    } catch (e) {
      count = 9999;
      countPromise.then((r) => {
        console.log('r ', r);
        const count = +(r as [{ count: string }])[0].count;
        // 缓存大的count， 时间 3600s
        this.cacheService.setCache<number>(requestCountKey, count, 3600);
      });
    }

    return { ordersHistory, count };
  }

  async syncOrderByHash(
    hash: string,
    chainId: ChainId,
    exchangeAddress: string,
  ): Promise<AssetEventCategory> {
    const dbOrder = await this.seaportOrderRepository.findOne({
      where: {
        hash,
        chainId,
      },
      include: [
        {
          model: SeaportOrderAsset,
          // where: {
          //   side: 0,
          // },
          include: [
            // {
            //   model: Currency,
            // },
            {
              attributes: ['id', 'tokenId'],
              model: Asset,
              include: [
                {
                  attributes: ['id', 'address', 'schemaName'],
                  model: Contract,
                },
              ],
            },
          ],
        },
      ],
    });

    if (!dbOrder) {
      throw new Error(
        `[syncOrderByHash] Order not found in db hash: ${hash}, chainId: ${chainId}, exchangeAddress: ${exchangeAddress}`,
      );
    }

    const seaportOrderStatus = await this.orderDao.getSeaportOrderStatusOnChain(
      hash,
      chainId,
      exchangeAddress,
    );
    const onchainOffererAmounts = await this.getOrderOffererAmount(dbOrder);
    console.log('onchainOffererAmounts', onchainOffererAmounts);
    const debugMessage = [];
    let isFillable = true;
    let isPartialFilled = false;
    // check offerer have enough amount
    for (const asset of dbOrder.SeaportOrderAssets) {
      // update available amount
      // totalSize = 0 代表還沒 verify 過
      if (!ethers.BigNumber.from(seaportOrderStatus.totalSize).isZero()) {
        const startAmount = ethers.BigNumber.from(asset.startAmount);
        const availableAmount = startAmount.sub(
          startAmount
            .mul(seaportOrderStatus.totalFilled)
            .div(seaportOrderStatus.totalSize),
        );
        // 確保僅在 availableAmount 小於 startAmount 時進行更新
        if (availableAmount.lt(startAmount)) {
          this.seaportOrderAssetRepository.update(
            {
              availableAmount: availableAmount.toString(),
            },
            {
              where: {
                id: asset.id,
              },
            },
          );
          isPartialFilled = true;
        }
      }

      if (asset.side == 1) {
        // 只看 offer item
        continue;
      }

      const offererAmount = onchainOffererAmounts.find(
        (onchainOffererAmount) =>
          onchainOffererAmount.seaportOrderAssetId === asset.id,
      );

      debugMessage.push(
        `assetId: ${asset.assetId} / currencyId: ${asset.currencyId} availableAmount: ${asset.availableAmount} offererAmount: ${offererAmount.amount}`,
      );
      if (
        ethers.BigNumber.from(offererAmount.amount).lt(asset.availableAmount)
      ) {
        isFillable = false;
        debugMessage.push(`offerer amount not enough`);
      }
    }
    if (isPartialFilled) {
      debugMessage.push(
        `order is partial filled and update available amount totalFilled: ${seaportOrderStatus.totalFilled} totalSize: ${seaportOrderStatus.totalSize}`,
      );
    }

    let isSignatureValid = true;
    const seaportOrder = this.getSeaportOrderByDbOrder(dbOrder);
    const isValidated = await this.isValidateSeaportOrdersSignature(
      dbOrder.chainId,
      dbOrder.exchangeAddress,
      [seaportOrder],
    );
    // check signature
    if (!isValidated) {
      isFillable = false;
      isSignatureValid = false;
      debugMessage.push(`order signature is invalid`);
    }

    // check no expired
    let isExpired = dbOrder.isExpired;
    if (dbOrder.endTime < new Date().getTime() / 1000) {
      isFillable = false;
      isExpired = true;
      debugMessage.push(`order is expired`);
    }

    // check no cancelled
    if (seaportOrderStatus.isCancelled) {
      isFillable = false;
      debugMessage.push(`order is cancelled`);
    }

    // check no filled
    if (
      seaportOrderStatus.totalFilled === seaportOrderStatus.totalSize &&
      seaportOrderStatus.totalFilled > 0
    ) {
      isFillable = false;
      debugMessage.push(`order is filled`);
    }

    // check offerer have approved offer item
    for (const asset of dbOrder.SeaportOrderAssets) {
      if (asset.side == 1) {
        // 只看 offer item
        continue;
      }

      if (asset.itemType == 1) {
        // ERC20
        const balance = await this.gatewayService.nativeGetERC20Allowance(
          chainId,
          asset.token,
          dbOrder.offerer,
          exchangeAddress,
        );
        if (new BigNumber(balance).lt(asset.startAmount)) {
          isFillable = false;
          debugMessage.push(
            `offerer not approved ERC20 token ${asset.token} to exchange contract ${exchangeAddress}`,
          );
        }
      }

      if (
        asset.itemType > 1 &&
        (dbOrder.platformType as any) == ORDER_PLATFORM_TYPE.DEFAULT
      ) {
        // NFT
        // item type 2: ERC721
        // item type 3: ERC1155
        const isApprovedForAll =
          asset.itemType == 2
            ? await this.gatewayService.nativeGetERC721IsApprovedForAll(
              chainId,
              asset.token,
              dbOrder.offerer,
              exchangeAddress,
            )
            : await this.gatewayService.nativeGetERC1155IsApprovedForAll(
              chainId,
              asset.token,
              dbOrder.offerer,
              exchangeAddress,
            );
        if (!isApprovedForAll) {
          isFillable = false;
          debugMessage.push(
            `offerer not approved NFT token ${asset.token} to exchange contract ${exchangeAddress}`,
          );
        }
      } else if (
        asset.itemType > 1 &&
        dbOrder.platformType == 1 &&
        dbOrder.conduitKey ==
        '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000'
      ) {
        // NFT
        // item type 2: ERC721
        // item type 3: ERC1155
        const isApprovedForAll =
          asset.itemType == 2
            ? await this.gatewayService.nativeGetERC721IsApprovedForAll(
              chainId,
              asset.token,
              dbOrder.offerer,
              '0x1e0049783f008a0085193e00003d00cd54003c71',
            )
            : await this.gatewayService.nativeGetERC1155IsApprovedForAll(
              chainId,
              asset.token,
              dbOrder.offerer,
              '0x1e0049783f008a0085193e00003d00cd54003c71',
            );
        if (!isApprovedForAll) {
          isFillable = false;
          debugMessage.push(
            `offerer not approved NFT token ${asset.token} to exchange contract ${'0x1e0049783f008a0085193e00003d00cd54003c71'}`,
          );
        }
      }
    }

    // update order status
    await this.seaportOrderRepository.update(
      {
        isFillable,
        isExpired,
        isCancelled: seaportOrderStatus.isCancelled,
        isValidated: seaportOrderStatus.isValidated,
      },
      {
        where: {
          hash,
          chainId,
        },
      },
    );
    this.logger.log(
      `[syncOrderByHash] Order updated chain: ${chainId}, hash: ${hash}, exchangeContract: ${exchangeAddress} isFillable: ${dbOrder.isFillable}->${isFillable} isCancelled: ${dbOrder.isCancelled}->${seaportOrderStatus.isCancelled} isExpired: ${dbOrder.isExpired}->${isExpired} isValidated: ${dbOrder.isValidated}->${seaportOrderStatus.isValidated}`,
    );

    debugMessage.push(
      `[syncOrderByHash] Order updated chain: ${chainId}, hash: ${hash}, exchangeContract: ${exchangeAddress} isFillable: ${dbOrder.isFillable}->${isFillable} isCancelled: ${dbOrder.isCancelled}->${seaportOrderStatus.isCancelled} isExpired: ${dbOrder.isExpired}->${isExpired} isValidated: ${dbOrder.isValidated}->${seaportOrderStatus.isValidated}`,
    );

    dbOrder.SeaportOrderAssets.map((asset) => {
      if (asset.assetId && asset.side == 0) {
        this.assetExtraDao.updateAssetExtraBestOrderByAssetId(asset.assetId);
      }
    });

    return debugMessage;
  }

  getSeaportOrderByDbOrder(order: SeaportOrder): Promise<SeaportOrder | null> {
    // tidy up the result
    const offer = order.SeaportOrderAssets.filter((asset) => asset.side === 0)
      .map((asset) => {
        return {
          token: asset.token,
          identifierOrCriteria: asset.identifierOrCriteria,
          startAmount: asset.startAmount,
          endAmount: asset.endAmount,
          availableAmount: asset.availableAmount,
          itemType: asset.itemType,
        };
      })
      .sort((a, b) => {
        // 先按照 itemType 大到小排序
        if (a.itemType > b.itemType) {
          return -1;
        } else if (a.itemType < b.itemType) {
          return 1;
        }

        // 如果 itemType 相等，再按照 startAmount 大到小排序
        if (
          new BigNumber(a.startAmount).comparedTo(
            new BigNumber(b.startAmount),
          ) === 1
        ) {
          return -1;
        } else if (
          new BigNumber(a.startAmount).comparedTo(
            new BigNumber(b.startAmount),
          ) === -1
        ) {
          return 1;
        }

        // 如果 startAmount 相等，就不需要再排序了
        return 0;
      });

    const consideration = order.SeaportOrderAssets.filter(
      (asset) => asset.side === 1,
    )
      .map((asset) => {
        return {
          token: asset.token,
          identifierOrCriteria: asset.identifierOrCriteria,
          startAmount: asset.startAmount,
          endAmount: asset.endAmount,
          availableAmount: asset.availableAmount,
          itemType: asset.itemType,
          recipient: asset.recipient,
        };
      })
      .sort((a, b) => {
        // 先按照 itemType 大到小排序
        if (a.itemType > b.itemType) {
          return -1;
        } else if (a.itemType < b.itemType) {
          return 1;
        }

        // 如果 itemType 相等，再按照 startAmount 大到小排序
        if (
          new BigNumber(a.startAmount).comparedTo(
            new BigNumber(b.startAmount),
          ) === 1
        ) {
          return -1;
        } else if (
          new BigNumber(a.startAmount).comparedTo(
            new BigNumber(b.startAmount),
          ) === -1
        ) {
          return 1;
        }

        // 如果 startAmount 相等，就不需要再排序了
        return 0;
      });

    const seaportOrder = {
      parameters: {
        offerer: order.offerer,
        offer,
        consideration,
        zone: order.zone,
        zoneHash: order.zoneHash,
        salt: order.salt,
        conduitKey: order.conduitKey,
        totalOriginalConsiderationItems: order.totalOriginalConsiderationItems,
        counter: order.counter,
        orderType: order.orderType,
        startTime: order.startTime,
        endTime: order.endTime,
      },
      signature: order.signature,
    };

    return seaportOrder;
  }

  async getOrderOffererAmount(dbOrder: SeaportOrder) {
    const offererAmount: {
      seaportOrderAssetId: string;
      amount: string;
    }[] = [];
    for (const asset of dbOrder.SeaportOrderAssets) {
      // only offerer amount
      if (asset.side == 1) {
        continue;
      }

      // nft
      //   erc721.balanceOf(address)
      //   erc1155.balanceOf(address, tokenId)
      // currency
      //   erc20.balanceOf(address)
      //   (no native, because offer cannot be native token)
      const chainId = dbOrder.chainId.toString() as any as ChainId;
      const contractAddress = asset.token.toLowerCase();
      if (asset.assetId) {
        if (asset.Asset.Contract.schemaName === ContractType.ERC1155) {
          const amount = await this.gatewayService.nativeGetBalanceOf(
            chainId,
            contractAddress,
            dbOrder.offerer,
            asset.Asset.tokenId,
          );
          offererAmount.push({
            seaportOrderAssetId: asset.id,
            amount: amount.toString(),
          });
        } else if (asset.Asset.Contract.schemaName === ContractType.ERC721) {
          const owner =
            (await this.gatewayService.nativeGetOwnerOf(
              chainId,
              contractAddress,
              asset.Asset.tokenId,
            )) ?? '0x0000000000000000000000000000000000000000';
          if (owner.toLowerCase() === dbOrder.offerer.toLowerCase()) {
            offererAmount.push({ seaportOrderAssetId: asset.id, amount: '1' });
          } else {
            offererAmount.push({ seaportOrderAssetId: asset.id, amount: '0' });
          }
        }
      }
      if (asset.currencyId) {
        const amount = await this.gatewayService.nativeGetBalanceOf(
          chainId,
          contractAddress,
          dbOrder.offerer,
        );
        offererAmount.push({
          seaportOrderAssetId: asset.id,
          amount: amount.toString(),
        });
      }
    }

    return offererAmount;
  }

  async getEventPollerStatus() {
    const chainNames = Object.values(SupportedChains);
    const result = [];
    for (const chainName of chainNames) {
      try {
        const rpcName = ChainMap[chainName].RPC;
        const chainId = ChainMap[chainName].id;
        const seaportAddress = SeaportAddress[chainName];
        const blocktime = chainBlocktime[chainName];
        const chainPerBlockTime = ChainPerBlockTime[chainId];
        const conversionRate = POLLER_CONVERSION_RATE;
        let pollingBatch = PollingBatch[chainName];
        const pollingInterval = PollingInterval[chainName];

        const block = await this.gatewayService.getBlock(+chainId, 'latest');
        const latestBlock = block.number;

        const polledBlock = (
          await this.pollerProgressRepository.findOne({
            attributes: ['lastPolledBlock'],
            where: {
              chainId: chainId,
            },
          })
        ).lastPolledBlock;
        // {
        //   "chainName": "mantle",
        //   "seaportAddress": "0x37507a230Cd7b2180842b46F536410493a923DAB",
        //   "latestBlock": 15912063, //最新區塊高度
        //   "polledBlock": 15912058, //event-poller最後拉取高度
        //   "pollingInterval": 0.8, //event-poller每次拉取間隔（秒）
        //   "pollingBatch": 10, //event-poller每次拉取區塊
        //   "pollingPerBlockTime": 0.08, //event-poller平均每block拉取速度（秒）
        //   "chainPerBlockTime": 0.35, //該區塊平均出塊速度（秒）
        //   "catchupLatestBlockSeconds": 0.13999999999999999 //需要多久能追到最新塊（秒）
        // }
        if (latestBlock - polledBlock > 2000) {
          pollingBatch = +this.configService.get(
            'EVENT_POLLER_MAX_CATCH_BLOCK_NUMBER',
          );
        }
        result.push({
          chainName,
          seaportAddress,
          latestBlock,
          polledBlock,
          pollingInterval: pollingInterval / 1000,
          pollingBatch,
          pollingPerBlockTime: pollingInterval / 1000 / pollingBatch,
          chainPerBlockTime,
          catchupLatestBlockSeconds:
            ((latestBlock - polledBlock) *
              pollingInterval *
              chainPerBlockTime) /
            (1000 * pollingBatch),
        });
      } catch (e) {
        result.push({
          chainName,
          error: e,
        });
      }
    }
    return result;
  }

  async syncSeaportOrderByTxHash(
    chainId: ChainId,
    txHash: string,
    dto: SyncTransactionDto,
  ) {
    const tx = await this.gatewayService.waitForTransaction(
      +chainId,
      txHash,
      RpcEnd.default,
      this.gatewayService.getConfirmsToWaitBlock(+chainId, 4),
    );

    // log transaction to cloudwatch
    let transactionAction = 'Unknown',
      logArgs = null;
    const txData = await this.gatewayService.getTransaction(
      +chainId,
      txHash,
      RpcEnd.default,
    );
    if (txData?.data === '0x') {
      transactionAction = 'Transfer';
      logArgs = { transactionAction, ip: dto.ip, chainId, txHash };
    } else {
      if (dto.type === 'swap') {
        transactionAction = 'Swap';
        logArgs = {
          transactionAction,
          ip: dto.ip,
          chainId,
          txHash,
          tokenIn: dto.data?.tokenIn,
          tokenOut: dto.data?.tokenOut,
          amountIn: dto.data?.amountIn,
          amountOut: dto.data?.amountOut,
        };
      } else {
        transactionAction = 'Buy';
        logArgs = { transactionAction, ip: dto.ip, chainId, txHash };
      }
    }
    this.logService.log(LOG_TYPE.COMMON, 'syncSeaportOrderByTxHash', logArgs);

    if (transactionAction !== 'Swap') {
      // 非 Swap: 存入 Seaport-order-history
      const [affectedCount] = await this.seaportOrderHistoryRepository.update(
        { ip: dto.ip, area: dto.ipCountry, blockHeight: txData.blockNumber },
        { where: { chainId: +chainId, txHash: txHash } },
      );
      if (affectedCount === 0) {
        this.logger.log(
          `Not found seaport histories By chainId ${chainId} txHash ${txHash}`,
        );
      }
    }

    const transaction = await this.gatewayService.getTransactionReceipt(
      +chainId,
      txHash,
      RpcEnd.default,
    );
    const transactionLogs = transaction.logs;

    const debugLogs = await promise.map(transactionLogs, async (log) => {
      try {
        // TODO:
        if (log.topics[0] == LOOTEX_SEAPORT_FULFILL_ORDER_TOPIC0) {
          const seaportInterface = new ethers.utils.Interface(SEAPORT_ABI);
          const seaportParsedData = seaportInterface.parseLog(log);
          const orderFulfilledResponse: OrderFulfilledResponse = {
            orderHash: seaportParsedData.args.orderHash,
            offerer: seaportParsedData.args.offerer,
            zone: seaportParsedData.args.zone,
            recipient: seaportParsedData.args.recipient,
            offer: seaportParsedData.args.offer,
            consideration: seaportParsedData.args.consideration,
          };
          const block = await this.gatewayService.getBlock(
            +chainId,
            transaction.blockHash,
          );
          const blockTime = new Date(block.timestamp * 1000);

          this.handleOrderFulfilledEvent(
            txHash,
            log.address.toLowerCase(),
            orderFulfilledResponse,
            +chainId,
            blockTime,
            dto.ip,
            dto.ipCountry,
          );

          if (
            OpenseaSeaportAddresses.map((address) =>
              address.toLowerCase(),
            ).includes(log.address.toLowerCase())
          ) {
            const seaportInterface = new ethers.utils.Interface(SEAPORT_ABI);
            const seaportParsedData = seaportInterface.parseLog(log);
            const orderFulfilledResponse: OrderFulfilledResponse = {
              orderHash: seaportParsedData.args.orderHash,
              offerer: seaportParsedData.args.offerer,
              zone: seaportParsedData.args.zone,
              recipient: seaportParsedData.args.recipient,
              offer: seaportParsedData.args.offer,
              consideration: seaportParsedData.args.consideration,
            };

            // use blockHash to get block info and get fulfillStamp
            const blockInfo = await this.gatewayService.getBlock(
              +chainId,
              txData.blockHash,
            );
            const fulfillStamp = blockInfo.timestamp;

            const assets: {
              chainId: number;
              contractAddress: string;
              tokenId: string;
              fulfillStamp: number;
            }[] = [];
            orderFulfilledResponse.offer.forEach((offer) => {
              if (offer.itemType >= 2) {
                assets.push({
                  chainId: +chainId,
                  contractAddress: offer.token.toLowerCase(),
                  tokenId: offer.identifier.toString(),
                  fulfillStamp,
                });
              }
            });
            orderFulfilledResponse.consideration.forEach((offer) => {
              if (offer.itemType >= 2) {
                assets.push({
                  chainId: +chainId,
                  contractAddress: offer.token.toLowerCase(),
                  tokenId: offer.identifier.toString(),
                  fulfillStamp,
                });
              }
            });
            //   AggregatorCoreDao.sendFulfillEventSqs(nfts: [{
            //     chainId: number;
            //     contractAddress: string;
            //     tokenId: string;
            //     fulfillStamp: number;
            // }]): Promise<void>
          }

          return `[seaport:fulfilled] orderHash: ${orderFulfilledResponse.orderHash} offerer: ${orderFulfilledResponse.offerer} zone: ${orderFulfilledResponse.zone} recipient: ${orderFulfilledResponse.recipient} offer: ${orderFulfilledResponse.offer} consideration: ${orderFulfilledResponse.consideration}`;
        }

        if (log.topics[0] == LOOTEX_SEAPORT_CANCEL_ORDER_TOPIC0) {
          const orderHash = log.data;
          const orderCancelledResponse: OrderCancelledResponse = {
            orderHash,
            offerer: '0x' + log.topics[1].slice(26),
            zone: '0x' + log.topics[2].slice(26),
          };
          const block = await this.gatewayService.getBlock(
            +chainId,
            transaction.blockHash,
          );
          const blockTime = new Date(block.timestamp * 1000);

          const seaportInterface = new ethers.utils.Interface(SEAPORT_ABI);
          const parsedEvent = seaportInterface.parseLog(log);

          this.handleOrderCancelledEvent(
            txHash,
            blockTime,
            orderCancelledResponse,
            +chainId,
            dto.ip,
            dto.ipCountry,
          );

          return `[seaport:cancel] orderHash: ${orderCancelledResponse.orderHash} offerer: ${orderCancelledResponse.offerer} zone: ${orderCancelledResponse.zone}`;
        }

        if (log.topics[0] == FUSIONX_V3_SWAP_TOPIC0) {
          if (
            log.address.toLowerCase() !==
            FUSIONX_V3_FRENS_WMNT_POOL_ADDRESS.toLowerCase() &&
            dto.data.type !== 'swap'
          ) {
            return `unsupported FusionX v3 swap`;
          }

          const swapInterface = new ethers.utils.Interface(FUSIONX_V3_SWAP_ABI);
          const swapEvent = swapInterface.parseLog(log);
          // address indexed sender,
          // address indexed recipient,
          // int256 amount0, (WMNT)
          // int256 amount1, (FRENS)
          // uint160 sqrtPriceX96,
          // uint128 liquidity,
          // int24 tick,
          // uint128 protocolFeesToken0,
          // uint128 protocolFeesToken1

          // dto.data
          // {
          //   type: 'swap',
          //   data: {
          //     tokenIn: 'MNT',
          //     tokenOut: 'FRENS',
          //     amountIn: '0.1',
          //     amountOut: '0.2',
          //     slippage: '5',
          //   }
          // }
          const inToken: string = dto.data.tokenIn;
          const outToken: string = dto.data.tokenOut;
          const inPerUsdInfo = await this.currencyService.getSymbolPrice(
            inToken + 'USD',
          );
          const inPerUsd = inPerUsdInfo?.price || '0';
          const outPerUsdInfo = await this.currencyService.getSymbolPrice(
            outToken + 'USD',
          );
          const outPerUsd = outPerUsdInfo?.price || '0';
          const userInPrice = ethers.BigNumber.from(
            ethers.utils.parseUnits(dto.data.amountIn, 18),
          );
          const userOutPrice = ethers.BigNumber.from(
            ethers.utils.parseUnits(dto.data.amountOut, 18),
          );
          const realInPrice = swapEvent.args.amount0.gt(0)
            ? ethers.BigNumber.from(swapEvent.args.amount0).abs()
            : ethers.BigNumber.from(swapEvent.args.amount1).abs();

          const realOutPrice = swapEvent.args.amount0.gt(0)
            ? ethers.BigNumber.from(swapEvent.args.amount1).abs()
            : ethers.BigNumber.from(swapEvent.args.amount0).abs();

          const recordData: {
            inToken: string;
            outToken: string;
            userInPrice: string;
            userOutPrice: string;
            realInPrice: string;
            realOutPrice: string;
            slippageTolerance: string;
            inPerUsd: string;
            outPerUsd: string;
            poolAddress: string;
            chainId: number;
            txHash: string;
            block: number;
            ip: string;
            area: string;
          } = {
            inToken: dto.data.tokenIn as string,
            outToken: dto.data.tokenOut as string,
            userInPrice: ethers.utils.formatUnits(userInPrice, 18),
            userOutPrice: ethers.utils.formatUnits(userOutPrice, 18),
            realInPrice: ethers.utils.formatUnits(realInPrice, 18),
            realOutPrice: ethers.utils.formatUnits(realOutPrice, 18),
            slippageTolerance: (parseFloat(dto.data.slippage) / 100).toString(),
            inPerUsd: inPerUsd,
            outPerUsd: outPerUsd,
            poolAddress: FUSIONX_V3_FRENS_WMNT_POOL_ADDRESS.toLowerCase(),
            chainId: +chainId,
            txHash: transaction.transactionHash,
            block: transaction.blockNumber,
            ip: dto.ip,
            area: dto.ipCountry,
          };

          return `FusionX v3 swap inToken: ${inToken} outToken: ${outToken} realInPrice: ${realInPrice} realOutPrice: ${realOutPrice}`;
        }

        if (log.topics[0] == ERC721_TRANSFER_TOPIC0 && log.data != '0x') {
          const fromAddress = ethers.utils
            .hexZeroPad(ethers.utils.hexStripZeros(log.topics[1]), 20)
            .toLowerCase();
          const toAddress = ethers.utils
            .hexZeroPad(ethers.utils.hexStripZeros(log.topics[2]), 20)
            .toLowerCase();
          const amount = new BigNumber(log.data).toFixed();
          return `[ERC20:transfer] contractAddress: ${log.address.toLowerCase()} from: ${fromAddress} to: ${toAddress} amount: ${amount}`;
        }

        // 注意: ERC20 跟 ERC721 的 Transfer event 是相同 TOPIC0, 這裡處理 ERC721 transfer
        if (log.topics[0] == ERC721_TRANSFER_TOPIC0 && log.data == '0x') {
          const contractAddress = log.address.toLowerCase();
          const fromAddress = ethers.utils
            .hexZeroPad(ethers.utils.hexStripZeros(log.topics[1]), 20)
            .toLowerCase();
          const toAddress = ethers.utils
            .hexZeroPad(ethers.utils.hexStripZeros(log.topics[2]), 20)
            .toLowerCase();
          // tokenId hex to dec
          const tokenId = new BigNumber(log.topics[3]).toFixed();

          this.logger.debug(
            `[syncSeaportOrderByTxHash] ERC721 contractAddress: ${contractAddress} from: ${fromAddress} to: ${toAddress} tokenId: ${tokenId}`,
          );
          if (tokenId === 'NaN') {
            return `unknown log`;
          }
          // this function will verify the asset is ERC721
          const result = await this.assetService.transferAssetOwnershipOnchain(
            {
              contractAddress,
              tokenId,
              fromAddress,
              toAddress,
              chainId,
            },
            { rpcEnd: RpcEnd.default },
          );

          if (result) {
            return `[ERC721:transfer] contractAddress: ${contractAddress} from: ${fromAddress} to: ${toAddress} tokenId: ${tokenId}`;
          }
        }

        if (log.topics[0] == ERC1155_TRANSFER_SINGLE_TOPIC0) {
          const contractAddress = log.address.toLowerCase();
          const fromAddress = ethers.utils
            .hexZeroPad(ethers.utils.hexStripZeros(log.topics[2]), 20)
            .toLowerCase();
          const toAddress = ethers.utils
            .hexZeroPad(ethers.utils.hexStripZeros(log.topics[3]), 20)
            .toLowerCase();
          // tokenId hex to dec
          const tokenId = new BigNumber(log.data.slice(0, 66)).toFixed();
          const amount = new BigNumber(log.data.slice(66)).toFixed();

          this.logger.debug(
            `[syncSeaportOrderByTxHash] ERC1155 contractAddress: ${contractAddress} from: ${fromAddress} to: ${toAddress} tokenId: ${tokenId} amount: ${amount}`,
          );

          if (tokenId === 'NaN') {
            return `unknown log`;
          }

          const result = await this.assetService.transferAssetOwnershipOnchain(
            {
              contractAddress,
              tokenId,
              fromAddress,
              toAddress,
              chainId,
            },
            { rpcEnd: RpcEnd.default },
          );

          if (result) {
            return `[ERC1155:transfer] contractAddress: ${contractAddress} from: ${fromAddress} to: ${toAddress} tokenId: ${tokenId}`;
          }
        }

        return `unknown log`;
      } catch (e) {
        return `parse log error ${log} ${e}`;
      }
    });

    return debugLogs;
  }

  async getOrdersCertification(orders: SyncOrderDTO[]) {
    this.logger.debug(`[getOrdersCertification] ${JSON.stringify(orders)}`);
    const result: OrderCertification[] = await promise.map(
      orders,
      async (order: SyncOrderDTO) => {
        return {
          certification: await this.getOrderCertification(order),
          orderStatus: await this.getDbOrderStatus(order),
        };
      },
    );

    return result;
  }

  async getDbOrderStatus(orders: SyncOrderDTO) {
    return await this.seaportOrderRepository.findOne({
      attributes: [
        'id',
        'isFillable',
        'isCancelled',
        'isExpired',
        'isValidated',
      ],
      where: {
        hash: orders.hash,
        chainId: orders.chainId,
        exchangeAddress: orders.exchangeAddress,
      },
    });
  }

  @Cacheable({
    key: 'orderCertification',
    seconds: 60 * 60, // 1 min
  })
  async getOrderCertification(
    order: SyncOrderDTO,
  ): Promise<OrderCertification> {
    const result = {
      chainId: order.chainId,
      orderHash: order.hash,
      exchangeAddress: order.exchangeAddress,
      offererUsername: null,
      offererWalletAddress: null,
      isOrderFind: false,
      isOffererFind: false,
      isOffererBlocked: false,
      isAssetFind: false,
      isAssetBlocked: false,
      isCollectionFind: false,
      isCollectionBlocked: false,
      debug: '',
    };

    try {
      const seaportOrderId = (
        await this.seaportOrderRepository.findOne({
          attributes: ['id'],
          where: {
            hash: order.hash.toLowerCase(),
            exchangeAddress: order.exchangeAddress.toLowerCase(),
            chainId: order.chainId,
          },
        })
      )?.id;
      if (!seaportOrderId) {
        result.debug += 'order not find, ';
        return result;
      }
      const seaportOrder = await this.seaportOrderRepository.findOne({
        where: {
          id: seaportOrderId,
        },
        include: [
          {
            model: SeaportOrderAsset,
            include: [
              {
                model: Asset,
                attributes: ['id'],
                required: true,
                include: [
                  {
                    model: AssetExtra,
                    attributes: ['id', 'block'],
                    include: [
                      {
                        model: Collection,
                        attributes: ['id', 'block'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!seaportOrder) {
        result.debug += 'order not find, ';
        return result;
      }
      result.isOrderFind = true;

      if (!seaportOrder.SeaportOrderAssets[0]) {
        result.debug += 'asset not find, ';
        return result;
      }
      result.isAssetFind = true;

      if (!seaportOrder.SeaportOrderAssets[0].Asset.AssetExtra) {
        result.debug += 'asset extra not find, ';
        return result;
      }
      result.isAssetBlocked =
        seaportOrder.SeaportOrderAssets[0].Asset.AssetExtra.block ===
        BlockStatus.BLOCKED;

      if (!seaportOrder.SeaportOrderAssets[0].Asset.AssetExtra.Collection) {
        result.debug += 'collection not find, ';
        return result;
      }
      result.isCollectionFind = true;
      result.isCollectionBlocked =
        seaportOrder.SeaportOrderAssets[0].Asset.AssetExtra.Collection.block ===
        BlockStatus.BLOCKED;

      const accountId =
        (
          await this.walletRepository.findOne({
            attributes: ['accountId'],
            where: {
              address: seaportOrder.offerer.toLowerCase(),
            },
          })
        )?.accountId ?? '';
      const offerer = await this.accountRepository.findOne({
        attributes: ['id', 'username', 'block'],
        where: {
          id: accountId,
        },
      });
      result.isOffererFind = !!offerer;

      if (!offerer) {
        result.debug += 'offerer not find, ';
        return result;
      }
      result.offererUsername = offerer.username;
      result.offererWalletAddress = seaportOrder.offerer.toLowerCase();
      result.isOffererBlocked = offerer.block === BlockStatus.BLOCKED;

      return result;
    } catch (e) {
      result.debug = e;
      return result;
    }
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
        attributes: [
          'id',
          'slug',
          'contractAddress',
          'chainId',
          'bestCollectionOfferOrderId',
        ],
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

        collection.bestCollectionOfferOrderId = null;
        collection.save();

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
              required: true,
              model: SeaportOrderAsset,
              include: [
                {
                  required: true,
                  attributes: ['id', 'symbol'],
                  model: Currency,
                },
              ],
            },
          ],
        })
      ).SeaportOrderAssets[0]?.Currency?.symbol;

      const cacheValue = {
        hasBestCollectionOrder: true,
        bestSeaportOrder: seaportOrder,
        priceSymbol: currencySymbol,
      };

      await this.cacheService.setCache(cacheKey, cacheValue, 60 * 60 * 24 * 7);

      collection.bestCollectionOfferOrderId = seaportOrder.id;
      collection.save();

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

  // ====================================================
  // ================== Order Fulfill ===================
  // ====================================================
  async handleOrderFulfilledEvent(
    txHash: string,
    exchangeAddress: string,
    orderFulfilledResponse: OrderFulfilledResponse,
    chainId: number,
    blockTime: Date,
    ip = null,
    area = null,
  ) {
    await this.createFulfilledOrderHistory(
      txHash,
      exchangeAddress,
      orderFulfilledResponse,
      chainId,
      blockTime,
      ip,
      area,
    );

    await this.updateOrderAssetExtra(
      orderFulfilledResponse.orderHash,
      orderFulfilledResponse.offerer,
      chainId,
    );
  }

  async createFulfilledOrderHistory(
    txHash: string,
    exchangeAddress: string,
    orderFulfilledResponse: OrderFulfilledResponse,
    chainId: number,
    blockTime: Date,
    ip = null,
    area = null,
  ) {
    const dbOrderHistory = await this.seaportOrderHistoryRepository.findOne({
      where: {
        hash: orderFulfilledResponse.orderHash,
        txHash,
        chainId: chainId,
      },
    });
    // check if order history IS exist, skip
    //確保不會記錄重複的 order history
    if (dbOrderHistory) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderFulfilled event ${txHash} orderHash ${orderFulfilledResponse.orderHash} is exist in database order history`,
      );
      return;
    }

    const dbOrder = await this.seaportOrderRepository.findOne({
      where: {
        hash: orderFulfilledResponse.orderHash,
        chainId: chainId,
      },
      include: [
        {
          attributes: ['id'],
          model: SeaportOrderAsset,
        },
      ],
    });

    // check if order IS NOT exist, skip
    // 確保不會記錄不是我們這邊的訂單的 history
    if (!dbOrder) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderFulfilled event ${txHash} orderHash ${orderFulfilledResponse.orderHash} is not exist in database order`,
      );
      return;
    }

    // 把訂單的 asset 跟 currency 分開
    const orderAssets: {
      contractAddress: string;
      tokenId: ethers.BigNumber;
      amount: ethers.BigNumber;
    }[] = [];
    const orderCurrencies: {
      contractAddress: string;
      amount: ethers.BigNumber;
    }[] = [];
    if (dbOrder.category == Category.LISTING) {
      // SpentItem
      // - NFT
      // ReceivedItem
      // - Seller payment
      // - Participation 1
      // - Participation ...
      orderFulfilledResponse.offer.forEach((item: SpentItem) => {
        if (item.itemType > 1) {
          orderAssets.push({
            contractAddress: item.token,
            tokenId: item.identifier,
            amount: item.amount,
          });
        }
      });
      orderFulfilledResponse.consideration.forEach((item: ReceivedItem) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.token,
            amount: item.amount,
          });
        }
      });
    } else if (dbOrder.category == Category.OFFER) {
      // SpentItem
      // - Full payment
      // ReceivedItem
      // - NFT (to fulfiller)
      // - Participation 1
      // - Participation ...
      orderFulfilledResponse.offer.forEach((item: SpentItem) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.token,
            amount: item.amount,
          });
        }
      });
      orderFulfilledResponse.consideration.forEach((item: ReceivedItem) => {
        if (item.itemType > 1) {
          orderAssets.push({
            contractAddress: item.token,
            tokenId: item.identifier,
            amount: item.amount,
          });
        }
      });
    } else {
      orderFulfilledResponse.offer.forEach((item: SpentItem) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.token,
            amount: item.amount,
          });
        } else {
          orderAssets.push({
            contractAddress: item.token,
            tokenId: item.identifier,
            amount: item.amount,
          });
        }
      });
      orderFulfilledResponse.consideration.forEach((item: ReceivedItem) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.token,
            amount: item.amount,
          });
        } else {
          orderAssets.push({
            contractAddress: item.token,
            tokenId: item.identifier,
            amount: item.amount,
          });
        }
      });
    }

    // calculate order price
    // e.g., seller get 0.9 ETH
    // + platform fee 0.025 ETH
    // +  creator fee 0.075 ETH
    // =      order price 1 ETH
    let orderPrice = new BigNumber(0);
    let currencySymbol = '';
    let currencyDecimals = 0;
    await Promise.map(orderCurrencies, async (orderCurrency) => {
      if (currencySymbol === '') {
        const currency = await this.currencyRepository.findOne({
          where: {
            address: orderCurrency.contractAddress.toLowerCase(),
          },
          include: [
            {
              model: Blockchain,
              where: { chainId: chainId },
            },
          ],
        });
        // if use not in DB currency will be null
        if (currency) {
          currencySymbol = currency.symbol;
          currencyDecimals = currency.decimals;
        }
      }
      orderPrice = orderPrice.plus(orderCurrency.amount.toString());
    });
    orderPrice = orderPrice.shiftedBy(-currencyDecimals);

    // if WETH need to replace to ETH, because CurrencyService don't have warped token price
    const symbolUsd = currencySymbol
      ? await this.currencyService.getSymbolPrice(
        currencySymbol.replace(/^W/i, '') + 'USD',
      )
      : null;
    const symbolUsdPrice = symbolUsd ? symbolUsd.price : 0;
    const orderUsdPrice = orderPrice.multipliedBy(symbolUsdPrice);

    const orderHistories = [];
    const chainSeaportAddress = this.configService.get('CHAIN_SEAPORT_ADDRESS');

    // Check if the exchange address matches the configured chain's Seaport address
    const platformType =
      chainSeaportAddress &&
        exchangeAddress.toLowerCase() === chainSeaportAddress.toLowerCase()
        ? ORDER_PLATFORM_TYPE.DEFAULT
        : ORDER_PLATFORM_TYPE.OPENSEA;

    // offer items
    // 代表成交 list
    for (const item of orderFulfilledResponse.offer) {
      if (item.itemType > 1) {
        console.log(item);
        orderHistories.push({
          contractAddress: item.token.toLowerCase(),
          tokenId: item.identifier.toString(),
          amount: item.amount.toString(),
          chainId: chainId,
          category: AssetEventCategory.SALE,
          startTime: blockTime,
          price: orderPrice.toNumber(),
          currencySymbol: currencySymbol,
          usdPrice: orderUsdPrice.toNumber(),
          fromAddress: orderFulfilledResponse.offerer.toLowerCase(),
          toAddress: orderFulfilledResponse.recipient.toLowerCase(),
          hash: orderFulfilledResponse.orderHash,
          txHash: txHash,
          exchangeAddress: exchangeAddress.toLowerCase(),
          platformType,
          ip,
          area,
        });
      }
    }

    // consideration items
    // 代表成交 offer
    // 事先在檔案開頭確保有這常數（ERC721/1155 Transfer topic0）
    const TRANSFER_TOPIC0 =
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    // …中略…

    // 代表成交 offer（NFT 在 consideration）
    for (const item of orderFulfilledResponse.consideration) {
      if (item.itemType > 1) {
        // 直接從 tx receipt 的 Transfer log 判斷真正 from（賣家）
        let fromAddress: string | undefined;

        // 你已經有 chainId / txHash，可以共用一次 receipt
        const transactionReceipt =
          await this.gatewayService.getTransactionReceipt(chainId, txHash);

        // 找出符合該 NFT 的 Transfer
        const transferLog = transactionReceipt.logs.find((log: any) => {
          if (log.topics?.[0] !== TRANSFER_TOPIC0) return false;
          if (log.address.toLowerCase() !== item.token.toLowerCase())
            return false;

          // ERC721/1155 的 tokenId 在 topics[3]（ERC1155 也會出現在單筆事件裡，批次另有 TransferBatch，但 Seaport 成交一般是單筆）
          const topicTokenId = log.topics?.[3]
            ? ethers.BigNumber.from(log.topics[3]).toString()
            : null;
          if (!topicTokenId) return false;

          return ethers.BigNumber.from(topicTokenId).eq(item.identifier);
        });

        if (transferLog) {
          // from = topic[1] 後 20 bytes
          fromAddress = '0x' + transferLog.topics[1].slice(26).toLowerCase();
        }

        // fallback：若極端案例找不到 log，就退回原本邏輯（但理論上 Seaport 成交一定會有 Transfer）
        if (!fromAddress) {
          fromAddress = orderFulfilledResponse.recipient?.toLowerCase();
        }

        orderHistories.push({
          contractAddress: item.token.toLowerCase(),
          tokenId: item.identifier.toString(),
          amount: item.amount.toString(),
          chainId,
          category: AssetEventCategory.SALE,
          startTime: blockTime,
          price: orderPrice.toNumber(),
          currencySymbol,
          usdPrice: orderUsdPrice.toNumber(),
          fromAddress, // ✅ 真正的賣家位址
          toAddress: orderFulfilledResponse.offerer.toLowerCase(), // 買家
          hash: orderFulfilledResponse.orderHash,
          txHash,
          exchangeAddress: exchangeAddress.toLowerCase(),
          platformType,
          ip,
          area,
        });
      }
    }

    let updatedCount;
    try {
      updatedCount = await this.seaportOrderHistoryRepository.bulkCreate(
        orderHistories,
        {
          ignoreDuplicates: true,
        },
      );
    } catch (error) {
      this.logger.error(
        `createFulfilledOrderHistory bulkCreate error: ${JSON.stringify(
          orderHistories,
        )}`,
      );
      throw error;
    }

    await promise.map(orderHistories, async (orderHistory) => {
      await this.assetService.transferAssetOwnershipOnchain({
        contractAddress: orderHistory.contractAddress,
        tokenId: orderHistory.tokenId,
        chainId: chainId.toString() as ChainId,
        fromAddress: orderHistory.fromAddress,
        toAddress: orderHistory.toAddress,
      });
    });

    // 更新 availableAmount
    // available_amount = offer.endAmount * (numerator / denominator)

    // 跟 seaport 合約取得 numerator, denominator
    const orderStatus: {
      isValidated: boolean;
      isCancelled: boolean;
      totalFilled: ethers.BigNumber;
      totalSize: ethers.BigNumber;
    } = await this.orderDao.getSeaportOrderStatusOnChain(
      dbOrder.hash,
      chainId,
      dbOrder.exchangeAddress,
    );

    let isFullyFilled = false;
    if (orderStatus.isValidated) {
      await Promise.all(
        dbOrder.SeaportOrderAssets.map(async (orderAssetId) => {
          const orderAsset = await this.seaportOrderAssetRepository.findOne({
            where: {
              id: orderAssetId.id,
            },
          });

          // availableAmount = startAmount - startAmount * (totalFilled / totalSize);
          // use ethers.BigNumber to avoid overflow
          const startAmount = ethers.BigNumber.from(orderAsset.startAmount);
          const availableAmount = startAmount.sub(
            startAmount.mul(orderStatus.totalFilled).div(orderStatus.totalSize),
          );
          // fully filled
          if (availableAmount.isZero()) {
            isFullyFilled = true;
            const updatedCount = await this.seaportOrderRepository.update(
              {
                isFillable: false,
              },
              {
                where: {
                  hash: orderFulfilledResponse.orderHash,
                  offerer: orderFulfilledResponse.offerer.toLowerCase(),
                  chainId: chainId,
                },
              },
            );
          }

          await this.seaportOrderAssetRepository.update(
            {
              availableAmount: availableAmount.toString(),
            },
            {
              where: {
                id: orderAssetId.id,
              },
            },
          );
        }),
      );
    }

    if (isFullyFilled) {
      await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
        { orderHash: orderFulfilledResponse.orderHash, chainId: chainId },
        OrderStatus.FULFILLED,
      );
    }

    if (
      dbOrder.category === Category.OFFER &&
      dbOrder.offerType === OfferType.COLLECTION &&
      isFullyFilled
    ) {
      const collection = await this.collectionRepository.findOne({
        attributes: ['id', 'slug'],
        where: {
          contractAddress: orderAssets[0].contractAddress.toLowerCase(),
          chainId: chainId,
        },
      });
      if (collection) {
        const bestCollectionOffer = await this.getBestCollectionOffer(
          collection.slug,
        );
        if (
          bestCollectionOffer.hasBestCollectionOrder &&
          bestCollectionOffer.bestSeaportOrder?.hash?.toLowerCase() ===
          orderFulfilledResponse.orderHash?.toLowerCase()
        ) {
          const newBestCollectionOffer = await this.getBestCollectionOffer(
            collection.slug,
            true,
          );
          this.logger.debug(
            `chainId ${chainId} poll: update best collection offer orderId ${newBestCollectionOffer.bestCollectionOfferOrder.id} orderHash ${newBestCollectionOffer.bestCollectionOfferOrder.id}`,
          );
        }
      }
    }

    this.logger.debug(
      `chainId: ${chainId} order hash: ${orderFulfilledResponse.orderHash} fulfilled order history created, order category: ${dbOrder.category} isFullyFilled: ${isFullyFilled}`,
    );

    const assets = await Promise.map(orderAssets, async (e) => {
      const asset = await this.assetRepository.findOne({
        where: {
          token_id: e.tokenId?.toString(),
          chain_id: chainId,
        },
        include: {
          model: Contract,
          where: {
            address: e.contractAddress.toLowerCase(),
          },
        },
      });
      return {
        contractAddress: e.contractAddress,
        tokenId: e.tokenId?.toString(),
        chainId: chainId,
        contractType: asset.Contract.schemaName,
      };
    });
    await this.orderDao.disableOrderByAssets(assets);

    return updatedCount;
  }

  /**
   * // update extra of assets
   * @param orderHash
   * @param offerer
   * @param chainId
   */
  async updateOrderAssetExtra(
    orderHash: string,
    offerer: string,
    chainId: number,
  ) {
    this.logger.log(`updateOrderAssetExtra ${orderHash} ${offerer} ${chainId}`);
    // update extra of assets
    const seaportOrder = await this.seaportOrderRepository.findAll({
      attributes: ['id'],
      where: {
        hash: orderHash,
        offerer: offerer.toLowerCase(),
        chainId: chainId,
      },
    });
    const seaportOrderIds = seaportOrder.map((e) => e.id);
    if (seaportOrderIds && seaportOrderIds.length > 0) {
      const orderAssetIds = (
        await this.seaportOrderAssetRepository.findAll({
          attributes: ['assetId'],
          where: {
            seaportOrderId: seaportOrderIds,
          },
        })
      ).map((e) => e.assetId);
      // execute async
      if (orderAssetIds) {
        const ids = orderAssetIds.filter(
          (e) => e != null && e.trim().length !== 0,
        );
        ids.map((id) => {
          this.assetExtraDao.updateAssetExtraBestOrderByAssetId(id);
        });
      }
    }
  }

  // ====================================================
  // ================== Order Cancel ====================
  // ====================================================

  async handleOrderCancelledEvent(
    txHash: string,
    blockTime: Date,
    orderCancelledResponse: OrderCancelledResponse,
    chainId: number,
    ip = null,
    area = null,
  ) {
    await this.updateCancelledOrder(
      orderCancelledResponse.orderHash,
      orderCancelledResponse.offerer,
      chainId,
    );

    await this.createCancelledOrderHistory(
      txHash,
      blockTime,
      orderCancelledResponse,
      chainId,
      ip,
      area,
    );

    await this.updateOrderAssetExtra(
      orderCancelledResponse.orderHash,
      orderCancelledResponse.offerer,
      chainId,
    );
  }

  async updateCancelledOrder(
    orderHash: string,
    offerer: string,
    chainId: number,
  ) {
    const updatedCount = await this.seaportOrderRepository.update(
      {
        isFillable: false,
        isCancelled: true,
      },
      {
        where: {
          hash: orderHash,
          offerer: offerer.toLowerCase(),
          chainId: chainId,
        },
      },
    );

    const dbOrder = await this.seaportOrderRepository.findOne({
      where: {
        hash: orderHash,
        offerer: offerer.toLowerCase(),
        chainId: chainId,
      },
      include: [
        {
          model: SeaportOrderAsset,
          where: {
            side: 1,
            itemType: { [Op.in]: [4, 5] },
          },
        },
      ],
    });

    if (!dbOrder) {
      this.logger.debug(
        `chainId ${chainId} poll: orderHash ${orderHash} is not exist in database order`,
      );
      return;
    }

    if (
      dbOrder.category === Category.OFFER &&
      dbOrder.offerType === OfferType.COLLECTION
    ) {
      const collection = await this.collectionRepository.findOne({
        attributes: ['id', 'slug'],
        where: {
          contractAddress: dbOrder.SeaportOrderAssets[0].token.toLowerCase(),
          chainId: chainId,
        },
      });
      if (collection) {
        const bestCollectionOffer = await this.getBestCollectionOffer(
          collection.slug,
        );
        if (
          bestCollectionOffer.hasBestCollectionOrder &&
          bestCollectionOffer.bestSeaportOrder.hash?.toLowerCase() ===
          orderHash?.toLowerCase()
        ) {
          const newBestCollectionOffer = await this.getBestCollectionOffer(
            collection.slug,
            true,
          );
          this.logger.debug(
            `chainId ${chainId} poll: update best collection offer orderId ${newBestCollectionOffer.bestCollectionOfferOrder.id} orderHash ${newBestCollectionOffer.bestCollectionOfferOrder.id}`,
          );
        }
      }
    }

    return updatedCount;
  }

  async createCancelledOrderHistory(
    txHash: string,
    blockTime: Date,
    orderCancelledResponse: OrderCancelledResponse,
    chainId: number,
    ip = null,
    area = null,
  ) {
    const dbCancelHistory = await this.seaportOrderHistoryRepository.findOne({
      attributes: ['id'],
      where: {
        hash: orderCancelledResponse.orderHash,
        txHash: txHash,
        chainId: chainId,
      },
    });
    if (dbCancelHistory) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderCancelled event ${txHash} orderHash ${orderCancelledResponse.orderHash} is exist in database seaport_order_history`,
      );
      return;
    }

    const orderCurrency = await this.seaportOrderAssetRepository.findOne({
      attributes: ['id'],
      where: {
        assetId: null,
      },
      include: [
        {
          attributes: ['id'],
          model: SeaportOrder,
          where: {
            hash: orderCancelledResponse.orderHash,
          },
        },
        {
          attributes: ['symbol'],
          required: true,
          model: Currency,
        },
      ],
    });
    if (!orderCurrency) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderCancelled event ${txHash} orderHash ${orderCancelledResponse.orderHash} currency not found in database currency`,
      );
      return;
    }

    const orderAssets = await this.seaportOrderAssetRepository.findAll({
      where: { assetId: { [Op.not]: null } },
      include: [
        {
          model: SeaportOrder,
          where: {
            chainId: chainId,
            hash: orderCancelledResponse.orderHash,
          },
        },
        {
          attributes: ['tokenId'],
          model: Asset,
          include: [
            {
              attributes: ['address'],
              model: Contract,
            },
          ],
        },
      ],
    });

    if (orderAssets.length === 0) {
      // try to find collection offer
      const dbOrder = await this.seaportOrderRepository.findOne({
        attributes: ['category', 'offerType', 'price'],
        where: {
          hash: orderCancelledResponse.orderHash,
          chainId: chainId,
        },
        include: [
          {
            model: SeaportOrderAsset,
            where: {
              side: 1,
              itemType: { [Op.in]: [4, 5] },
            },
          },
        ],
      });

      if (
        dbOrder.category === Category.OFFER &&
        dbOrder.offerType === OfferType.COLLECTION
      ) {
        const cancelHistory = {
          contractAddress: dbOrder.SeaportOrderAssets[0].token.toLowerCase(),
          tokenId: '',
          amount: dbOrder.SeaportOrderAssets[0].availableAmount,
          chainId: chainId,
          category: AssetEventCategory.CANCEL,
          startTime: blockTime,
          price: dbOrder.price,
          currencySymbol: orderCurrency.Currency.symbol,
          fromAddress: orderCancelledResponse.offerer?.toLowerCase(),
          hash: orderCancelledResponse.orderHash,
          txHash: txHash,
          ip,
          area,
        };

        await this.seaportOrderHistoryRepository.create(cancelHistory);

        await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
          {
            orderHash: orderCancelledResponse.orderHash,
            chainId: chainId,
          },
          OrderStatus.CANCELED,
        );

        return;
      }

      this.logger.debug(
        `chainId ${chainId} poll: OrderCancelled event ${txHash} orderHash ${orderCancelledResponse.orderHash} is not exist in database seaport_order_asset`,
      );
      return;
    }
    if (orderAssets[0].Asset.tokenId === null) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderCancelled event ${txHash} orderHash ${orderCancelledResponse.orderHash} asset not found in database asset`,
      );
      return;
    }

    const cancelHistories = (await Promise.all(
      orderAssets.map(async (orderAsset) => {
        return {
          contractAddress: orderAsset.Asset.Contract.address,
          tokenId: orderAsset.Asset.tokenId,
          amount: orderAsset.startAmount,
          chainId: chainId,
          category: AssetEventCategory.CANCEL,
          startTime: blockTime,
          price: orderAsset.SeaportOrder.price,
          currencySymbol: orderCurrency.Currency.symbol,
          fromAddress: orderCancelledResponse.offerer?.toLowerCase(),
          hash: orderCancelledResponse.orderHash,
          txHash: txHash,
          ip,
          area,
        };
      }),
    )) as {
      contractAddress: string;
      tokenId: string;
      amount: string;
      chainId: number;
      category: AssetEventCategory;
      startTime: Date;
      price: string;
      currencySymbol: string;
      fromAddress: string;
      hash: string;
      txHash: string;
    }[];

    await this.seaportOrderHistoryRepository.bulkCreate(cancelHistories);

    await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
      {
        orderHash: orderCancelledResponse.orderHash,
        chainId: chainId,
      },
      OrderStatus.CANCELED,
    );

    orderAssets.forEach((orderAsset) => {
      if (orderAsset.SeaportOrder.category === Category.LISTING) {
        this.updateCollectionBestListingToCache(
          orderAsset.Asset.Contract.address,
          chainId.toString(),
          {
            force: true,
          },
        );
      } else if (orderAsset.SeaportOrder.category === Category.OFFER) {
        this.updateCollectionBestOfferToCache(
          orderAsset.Asset.Contract.address,
          chainId.toString(),
          {
            force: true,
          },
        );
      }
    });

    return cancelHistories;
  }

  async disableOrder(accountId: string, options: DisableOrdersDTO) {
    const wallets = await this.walletRepository.findAll({
      attributes: ['address'],
      where: {
        accountId,
      },
    });
    const walletAddresses = wallets.map((e) => e.address);
    let orders = [];

    // 沒有 options 就 disable 所有的 order
    if (!options.contractAddress && !options.chainId && !options.ids) {
      orders = await this.seaportOrderRepository.findAll({
        attributes: ['id', 'hash', 'exchangeAddress', 'perPrice', 'chainId'],
        where: {
          isFillable: true,
          offerer: walletAddresses,
        },
        include: [
          {
            attributes: ['id', 'assetId'],
            model: SeaportOrderAsset,
          },
        ],
      });
    }

    if (options.contractAddress && !options.chainId) {
      orders = await this.seaportOrderRepository.findAll({
        attributes: ['id', 'hash', 'exchangeAddress', 'perPrice', 'chainId'],
        where: {
          isFillable: true,
          offerer: walletAddresses,
        },
        include: [
          {
            attributes: ['id', 'assetId'],
            model: SeaportOrderAsset,
            where: {
              token: getAddress(options.contractAddress.toLowerCase()),
            },
          },
        ],
      });
    }

    if (!options.contractAddress && options.chainId) {
      orders = await this.seaportOrderRepository.findAll({
        attributes: ['id', 'hash', 'exchangeAddress', 'perPrice', 'chainId'],
        where: {
          isFillable: true,
          offerer: walletAddresses,
          chainId: options.chainId,
        },
        include: [
          {
            attributes: ['id', 'assetId'],
            model: SeaportOrderAsset,
          },
        ],
      });
    }

    // 有 options 就 disable 符合條件的 order
    if (options.contractAddress && options.chainId) {
      orders = await this.seaportOrderRepository.findAll({
        attributes: ['id', 'hash', 'exchangeAddress', 'perPrice', 'chainId'],
        where: {
          isFillable: true,
          offerer: walletAddresses,
          chainId: options.chainId,
        },
        include: [
          {
            attributes: ['id', 'assetId'],
            model: SeaportOrderAsset,
            where: {
              token: getAddress(options.contractAddress.toLowerCase()),
            },
            // include: [
            //   {
            //     model: Asset,
            //     where: {
            //       contractAddress: options.contractAddress.toLowerCase(),
            //       chainId: options.chainId,
            //     },
            //   },
            // ],
          },
        ],
      });
    }
    if (orders.length === 0) {
      return [];
    }

    await Promise.all(
      orders.map(async (order) => {
        await this.seaportOrderRepository.update(
          { isFillable: false },
          {
            where: {
              id: order.id,
            },
          },
        );
      }),
    );

    orders.map((order) => {
      this.assetExtraDao.updateAssetExtraBestOrderByAssetId(
        order.SeaportOrderAssets[0].assetId,
      );
    });

    return orders.map((order) => {
      return {
        id: order.id,
        hash: order.hash,
        exchangeAddress: order.exchangeAddress,
        perPrice: order.perPrice,
        chainId: order.chainId,
      };
    });
  }

  @Cacheable({
    key: 'platformFee',
    seconds: 60, // 1 min
  })
  async getPlatformFee() {
    const [platformFee, platformFeeAddress] = [
      '0',
      '0x0000000000000000000000000000000000000000',
    ];

    return {
      platformFee,
      platformFeeAddress,
    };
  }

  getSeaportOrderForFulfill(order: SeaportOrder) {
    // for fulfill seaport order object
    const offer = order.SeaportOrderAssets.filter((asset) => asset.side === 0)
      .map((asset) => {
        return {
          token: asset.token,
          identifierOrCriteria: asset.identifierOrCriteria,
          startAmount: asset.startAmount,
          endAmount: asset.endAmount,
          availableAmount: asset.availableAmount,
          itemType: asset.itemType,
        };
      })
      .sort((a, b) => {
        // 先按照 itemType 大到小排序
        if (a.itemType > b.itemType) {
          return -1;
        } else if (a.itemType < b.itemType) {
          return 1;
        }

        // 如果 itemType 相等，再按照 startAmount 大到小排序
        if (
          new BigNumber(a.startAmount).comparedTo(
            new BigNumber(b.startAmount),
          ) === 1
        ) {
          return -1;
        } else if (
          new BigNumber(a.startAmount).comparedTo(
            new BigNumber(b.startAmount),
          ) === -1
        ) {
          return 1;
        }

        // 如果 startAmount 相等，就不需要再排序了
        return 0;
      });

    const consideration = order.SeaportOrderAssets.filter(
      (asset) => asset.side === 1,
    )
      .map((asset) => {
        return {
          token: asset.token,
          identifierOrCriteria: asset.identifierOrCriteria,
          startAmount: asset.startAmount,
          endAmount: asset.endAmount,
          availableAmount: asset.availableAmount,
          itemType: asset.itemType,
          recipient: asset.recipient,
        };
      })
      .sort((a, b) => {
        // 先按照 itemType 大到小排序
        if (a.itemType > b.itemType) {
          return -1;
        } else if (a.itemType < b.itemType) {
          return 1;
        }

        // 如果 itemType 相等，再按照 startAmount 大到小排序
        if (
          new BigNumber(a.startAmount).comparedTo(
            new BigNumber(b.startAmount),
          ) === 1
        ) {
          return -1;
        } else if (
          new BigNumber(a.startAmount).comparedTo(
            new BigNumber(b.startAmount),
          ) === -1
        ) {
          return 1;
        }

        // 如果 startAmount 相等，就不需要再排序了
        return 0;
      });

    const seaportOrder = {
      parameters: {
        offerer: order.offerer,
        offer,
        consideration,
        zone: order.zone,
        zoneHash: order.zoneHash,
        salt: order.salt,
        conduitKey: order.conduitKey,
        totalOriginalConsiderationItems: order.totalOriginalConsiderationItems,
        counter: order.counter,
        orderType: order.orderType,
        startTime: order.startTime,
        endTime: order.endTime,
      },
      signature: order.signature,
    };

    return seaportOrder;
  }
}
