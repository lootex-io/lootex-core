import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/sequelize';

import {
  OPENSEA_EVENT_TYPE,
  ORDER_PLATFORM_TYPE,
  SEAPORT_EXCHANGE_ADDRESS_16,
} from '@/microservice/nft-aggregator/aggregator-constants';
import { ConfigurationService } from '@/configuration';
import { Promise } from 'bluebird';
import { OpenSeaApiService } from '@/core/aggregator-core/opensea/opensea-api.service';
import { OrderDao } from '@/core/dao/order-dao';
import {
  Asset,
  AssetExtra,
  Collection,
  Contract,
  Currency,
  SeaportOrder,
  SeaportOrderAsset,
  SeaportOrderHistory,
} from '@/model/entities';
import { Op, QueryTypes, Transaction } from 'sequelize';
import {
  Category,
  OfferOrConsiderationItem,
} from '@/api/v3/order/order.interface';
import { AssetEventCategory } from '@/api/v3/asset/asset.interface';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import { CurrencyService } from '@/core/third-party-api/currency/currency.service';
import { AssetDao } from '@/core/dao/asset-dao';
import { OrderStatus } from '@/model/entities/constant-model';
import { SeaportOrderHistoryDao } from '@/core/dao/seaport-order-history-dao';
import { ethers } from 'ethers';
import { ChainId } from '@/common/utils/types';
import { BigNumber } from 'bignumber.js';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { SEAPORT_ABI } from '@/microservice/event-poller/constants';
import { AggregatorOpenSeaRepairLog } from '@/model/entities/aggregator/aggregator-opensea-repair-log';
import { AggregatorOpenSeaCollection } from '@/model/entities/aggregator/aggregator-watched-collection';
import {
  AssetExtraDao,
  UpdateAssetOrderCategory,
} from '@/core/dao/asset-extra-dao';
import { OpenSeaUtil } from '@/core/aggregator-core/opensea/opensea.util';
import { CacheKeys, CacheService } from '@/common/cache';
import { LOG_TYPE, LogService } from '@/core/log/log.service';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import {
  ERC1155_TRANSFER_SINGLE_TOPIC0,
  TRANSFER_TOPIC0,
} from '@/api/v3/wallet/constants';
import { AggregatorCoreDao } from '@/core/aggregator-core/aggregator-core-dao/aggregator-core-dao';
import { CatchError } from '@/common/decorator/catch-error.decorator';
import { OrderQueueService } from '@/core/bull-queue/queue/order-queue.service';
import { CollectionDao } from '@/core/dao/collection-dao';
import { getAddress } from 'ethers-v6';

@Injectable()
export class OpenSeaHandlerService {
  private readonly logger = new Logger(OpenSeaHandlerService.name);
  public collections: string[] = [];
  public selectedCollections: string[] = []; // 精选
  public rankingCollections: string[] = []; // ranking
  constructor(
    @InjectModel(Asset)
    private assetRepository: typeof Asset,
    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,
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
    @InjectModel(AggregatorOpenSeaRepairLog)
    private readonly openSeaRepairRepository: typeof AggregatorOpenSeaRepairLog,
    @InjectModel(AggregatorOpenSeaCollection)
    private readonly openSeaCollectionRepository: typeof AggregatorOpenSeaCollection,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,
    private readonly assetExtraDao: AssetExtraDao,
    private currencyService: CurrencyService,
    private readonly assetDao: AssetDao,
    private readonly orderDao: OrderDao,
    private readonly collectionDao: CollectionDao,
    private readonly seaportOrderHistoryDao: SeaportOrderHistoryDao,
    private readonly httpService: HttpService,
    private readonly configService: ConfigurationService,
    private readonly openSeaApiService: OpenSeaApiService,
    private readonly rpcHandlerService: RpcHandlerService,
    private readonly cacheService: CacheService,
    private readonly logService: LogService,
    private readonly gatewayService: GatewayService,
    private readonly aggregatorCoreDao: AggregatorCoreDao,
    private readonly orderQueueService: OrderQueueService,
  ) {
    // this.collections = (this.configService.get('OPENSEA_COLLECTIONS') || '')
    //   .split(',')
    //   .map((e) => e.trim());
    // test
    // listed
    // const payload = `{"base_price":"55830300000000000","collection":{"slug":"rg-bytes"},"event_timestamp":"2025-07-15T07:35:29.543238Z","expiration_date":"2025-07-15T07:46:29.000000Z","is_private":false,"item":{"chain":{"name":"ethereum"},"metadata":{"animation_url":"https://i2c.seadn.io/ethereum/0x6fd8e343c107a24bd6b8ac19b56d9aeb967c0131/8830542e50af5de807cd0072df23c9/a28830542e50af5de807cd0072df23c9.mp4","image_url":"https://i2c.seadn.io/ethereum/0x6fd8e343c107a24bd6b8ac19b56d9aeb967c0131/6eee7fb8883070595368fbf7f7648f/1d6eee7fb8883070595368fbf7f7648f.gif","metadata_url":null,"name":"RG Byte"},"nft_id":"ethereum/0x6fd8e343c107a24bd6b8ac19b56d9aeb967c0131/3242","permalink":"https://opensea.io/item/ethereum/0x6fd8e343c107a24bd6b8ac19b56d9aeb967c0131/3242"},"listing_date":"2025-07-15T07:35:29.000000Z","listing_type":"FULL_OPEN","maker":{"address":"0x1346d9c6315f6c23fe280b49ef215aebd49338b2"},"order_hash":"0x7b807b0aa3a7861c8c1f6271092f7fa7c503ffa71c82ca46e7b64b84428d2370","payment_token":{"address":"0x0000000000000000000000000000000000000000","decimals":18,"eth_price":"0","name":"Ether","symbol":"ETH","usd_price":"0"},"protocol_data":{"parameters":{"conduitKey":"0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000","consideration":[{"endAmount":"52759633500000000","identifierOrCriteria":"0","itemType":0,"recipient":"0x1346d9c6315f6c23fe280b49ef215aebd49338b2","startAmount":"52759633500000000","token":"0x0000000000000000000000000000000000000000"},{"endAmount":"279151500000000","identifierOrCriteria":"0","itemType":0,"recipient":"0x0000a26b00c1f0df003000390027140000faa719","startAmount":"279151500000000","token":"0x0000000000000000000000000000000000000000"},{"endAmount":"2791515000000000","identifierOrCriteria":"0","itemType":0,"recipient":"0x89e5409b4553618efd82353edb2672f62c0f1016","startAmount":"2791515000000000","token":"0x0000000000000000000000000000000000000000"}],"counter":"0x0","endTime":"1752565589","offer":[{"endAmount":"1","identifierOrCriteria":"3242","itemType":2,"startAmount":"1","token":"0x6fd8e343c107a24bd6b8ac19b56d9aeb967c0131"}],"offerer":"0x1346d9c6315f6c23fe280b49ef215aebd49338b2","orderType":0,"salt":"27855337018906766782546881864045825683096516384821792734244936571600710647451","startTime":"1752564929","totalOriginalConsiderationItems":3,"zone":"0x0000000000000000000000000000000000000000","zoneHash":"0x0000000000000000000000000000000000000000000000000000000000000000"},"signature":"0xbe8d5bd2608772bc3fdf12925ef747214b39344bfa5c465b6589e5ae002a57a0bc1e9ecdb4bdebcda8d5b51715e90f561dd8fd6cff21cf715ab208aef0b6e88b"},"quantity":1,"taker":{"address":"0x0000000000000000000000000000000000000000"}}`;
    // matic
    // const payload = `{"base_price":"178999000000000000","chain":"matic","collection":{"slug":"apeironplanet"},"event_timestamp":"2024-03-07T16:29:17.806768+00:00","expiration_date":"2024-03-07T17:29:17.000000+00:00","is_private":false,"item":{"chain":{"name":"matic"},"metadata":{"animation_url":null,"image_url":"https://i.seadn.io/s/raw/files/ce6fe6fc9af521bdfdda32448b9885f0.jpg?w=500&auto=format","metadata_url":"https://nftprops.apeironnft.com/planetprops/4749","name":"Normal #4749"},"nft_id":"matic/0x24f9b0837424c62d2247d8a11a6d6139e4ab5ed2/4749","permalink":"https://opensea.io/assets/matic/0x24f9b0837424c62d2247d8a11a6d6139e4ab5ed2/4749"},"listing_date":"2024-03-07T16:29:17.000000+00:00","listing_type":null,"maker":{"address":"0x28e07986734bea20fa8f8748b35c6953da45cb2e"},"order_hash":"0x8fdfb347f32f6c7f110d76f8fc0db08a59407a18e2ccbb15f960e64a13ed385e","payment_token":{"address":"0x7ceb23fd6bc0add59e62ac25578270cff1b9f619","decimals":18,"eth_price":"1.000000000000000","name":"Ether","symbol":"ETH","usd_price":"3850.320000000000164000"},"protocol_address":"0x00000000000000adc04c56bf30ac9d3c0aaf14dc","protocol_data":{"parameters":{"conduitKey":"0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000","consideration":[{"endAmount":"174524025000000000","identifierOrCriteria":"0","itemType":1,"recipient":"0x28e07986734BEA20Fa8f8748B35c6953da45CB2E","startAmount":"174524025000000000","token":"0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"},{"endAmount":"4474975000000000","identifierOrCriteria":"0","itemType":1,"recipient":"0x0000a26b00c1F0DF003000390027140000fAa719","startAmount":"4474975000000000","token":"0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"}],"counter":0,"endTime":"1709832557","offer":[{"endAmount":"1","identifierOrCriteria":"4749","itemType":2,"startAmount":"1","token":"0x24F9b0837424C62d2247D8A11A6d6139e4ab5eD2"}],"offerer":"0x28e07986734bea20fa8f8748b35c6953da45cb2e","orderType":0,"salt":"0x360c6ebe00000000000000000000000000000000000000007cb176cb25ce8dbe","startTime":"1709828957","totalOriginalConsiderationItems":2,"zone":"0x0000000000000000000000000000000000000000","zoneHash":"0x0000000000000000000000000000000000000000000000000000000000000000"},"signature":null},"quantity":1,"taker":null}`;
    // this.handleListed(JSON.parse(payload));
    // cancel
    // const payload = `{"base_price":"210000000000000000","chain":"matic","collection":{"slug":"punks2024-"},"event_timestamp":"2024-03-13T08:54:22.000000+00:00","expiration_date":"2024-03-13T09:53:24.000000+00:00","is_private":false,"item":{"chain":{"name":"matic"},"metadata":{"animation_url":null,"image_url":"https://i.seadn.io/s/raw/files/f9c563b061b884ff3f747fa44659c5ea.webp?w=500&auto=format","metadata_url":"ipfs://QmcAPdhT6BLGWAV1GgE484nUC8P6nzGf2Yw1qZ71hqPUe7/12267.json","name":"Punks2024 #12267"},"nft_id":"matic/0x452f1593b59777a10835fe1074bfc3351fb01e72/12267","permalink":"https://opensea.io/assets/matic/0x452f1593b59777a10835fe1074bfc3351fb01e72/12267"},"listing_date":"2024-03-13T08:53:28.000000+00:00","listing_type":null,"maker":{"address":"0x7e9508950b3657e572a0aacd951f70e8172d5d05"},"order_hash":"0x95b3a827b2f6f9b8728cbaa1b32308d047b1ed1c4796006d526078cb150f52a1","payment_token":{"address":"0x0000000000000000000000000000000000000000","decimals":18,"eth_price":"0.000299560000000","name":"Matic","symbol":"MATIC","usd_price":"1.220000000000000000"},"protocol_address":"0x00000000000000adc04c56bf30ac9d3c0aaf14dc","protocol_data":{"parameters":{"conduitKey":"0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000","consideration":[{"endAmount":"183750000000000000","identifierOrCriteria":"0","itemType":0,"recipient":"0x7e9508950b3657e572A0aacD951f70e8172D5d05","startAmount":"183750000000000000","token":"0x0000000000000000000000000000000000000000"},{"endAmount":"5250000000000000","identifierOrCriteria":"0","itemType":0,"recipient":"0x0000a26b00c1F0DF003000390027140000fAa719","startAmount":"5250000000000000","token":"0x0000000000000000000000000000000000000000"},{"endAmount":"21000000000000000","identifierOrCriteria":"0","itemType":0,"recipient":"0xe18F05b2E1af68Ff90C7e08D9e4E730bc41FB4C7","startAmount":"21000000000000000","token":"0x0000000000000000000000000000000000000000"}],"counter":0,"endTime":"1710323604","offer":[{"endAmount":"1","identifierOrCriteria":"12267","itemType":2,"startAmount":"1","token":"0x452F1593b59777a10835FE1074bfc3351Fb01E72"}],"offerer":"0x7e9508950b3657e572a0aacd951f70e8172d5d05","orderType":0,"salt":"0x360c6ebe00000000000000000000000000000000000000004c5b4e1c08731e07","startTime":"1710320008","totalOriginalConsiderationItems":3,"zone":"0x0000000000000000000000000000000000000000","zoneHash":"0x0000000000000000000000000000000000000000000000000000000000000000"},"signature":null},"quantity":1,"taker":null,"transaction":{"hash":"0x8dd404c5028a4499b35c636af7946106fac750115c033ef8270928ebc11d81d2","timestamp":"2024-03-13T08:54:22.000000+00:00"}}`;
    // this.handlerEvent(OPENSEA_EVENT_TYPE.ITEM_CANCELLED, JSON.parse(payload));
    // sold
    // const payload = `{"chain":"matic","closing_date":"2024-03-14T10:48:59.000000+00:00","collection":{"slug":"punks2024-"},"event_timestamp":"2024-03-14T10:48:59.000000+00:00","is_private":false,"item":{"chain":{"name":"matic"},"metadata":{"animation_url":null,"image_url":"https://i.seadn.io/s/raw/files/02dbe414b73e89c151b5935810647c8a.webp?w=500&auto=format","metadata_url":"ipfs://QmcAPdhT6BLGWAV1GgE484nUC8P6nzGf2Yw1qZ71hqPUe7/11293.json","name":"Punks2024 #11293"},"nft_id":"matic/0x452f1593b59777a10835fe1074bfc3351fb01e72/11293","permalink":"https://opensea.io/assets/matic/0x452f1593b59777a10835fe1074bfc3351fb01e72/11293"},"listing_type":null,"maker":{"address":"0x7e9508950b3657e572a0aacd951f70e8172d5d05"},"order_hash":"0x06915043e89380186b0dbb617eaf32e68d5a155858cd364367a430c153909523","payment_token":{"address":"0x0000000000000000000000000000000000000000","decimals":18,"eth_price":"0.000314790000000","name":"Matic","symbol":"MATIC","usd_price":"1.250000000000000000"},"protocol_address":"0x00000000000000adc04c56bf30ac9d3c0aaf14dc","protocol_data":{"parameters":{"conduitKey":"0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000","consideration":[{"endAmount":"148750000000000000","identifierOrCriteria":"0","itemType":0,"recipient":"0x7e9508950b3657e572A0aacD951f70e8172D5d05","startAmount":"148750000000000000","token":"0x0000000000000000000000000000000000000000"},{"endAmount":"4250000000000000","identifierOrCriteria":"0","itemType":0,"recipient":"0x0000a26b00c1F0DF003000390027140000fAa719","startAmount":"4250000000000000","token":"0x0000000000000000000000000000000000000000"},{"endAmount":"17000000000000000","identifierOrCriteria":"0","itemType":0,"recipient":"0xe18F05b2E1af68Ff90C7e08D9e4E730bc41FB4C7","startAmount":"17000000000000000","token":"0x0000000000000000000000000000000000000000"}],"counter":0,"endTime":"1713077879","offer":[{"endAmount":"1","identifierOrCriteria":"11293","itemType":2,"startAmount":"1","token":"0x452F1593b59777a10835FE1074bfc3351Fb01E72"}],"offerer":"0x7e9508950b3657e572a0aacd951f70e8172d5d05","orderType":0,"salt":"0x360c6ebe0000000000000000000000000000000000000000e177de831ede0d86","startTime":"1710399479","totalOriginalConsiderationItems":3,"zone":"0x0000000000000000000000000000000000000000","zoneHash":"0x0000000000000000000000000000000000000000000000000000000000000000"},"signature":null},"quantity":1,"sale_price":"170000000000000000","taker":{"address":"0x79daf4c9b18debbb62b293836c3df69f1f91d94c"},"transaction":{"hash":"0x75b170bf0730840d33972b01c0066e0766ad7cf68674bb18f2f02ed6d2c2e7cf","timestamp":"2024-03-14T10:48:59.000000+00:00"}}`;
    // this.handlerEvent(OPENSEA_EVENT_TYPE.ITEM_SOLD, JSON.parse(payload));
    // transfer
    // const payload = `{"chain":"matic","collection":{"slug":"ai-svg-creative"},"event_timestamp":"2024-07-19T10:22:48.000000+00:00","from_account":{"address":"0x33d11c2dd0de6bf29beaebfdf948fedf7bc3f271"},"item":{"chain":{"name":"matic"},"metadata":{"animation_url":null,"image_url":"https://raw.seadn.io/files/afaccdf9c98c6fe46b8272a49a283925.svg","metadata_url":"ipfs://QmXgR9nfke4iZyxa7gpf2KkkoEp9rdvaMmhPTbTAeetdiD/5","name":"Cat"},"nft_id":"matic/0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be/5","permalink":"https://opensea.io/assets/matic/0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be/5"},"quantity":1,"to_account":{"address":"0x138238dcaf471889088b809e1193896048db6327"},"transaction":{"hash":"0xf0dae8946cb1ffe6e649c84f6cfa346d0010e796c8aa72cf6622516a149f8e72","timestamp":"2024-07-19T10:22:48.000000+00:00"}}`;
    // this.handlerEvent(OPENSEA_EVENT_TYPE.ITEM_TRANSFERRED, JSON.parse(payload));
    // this.disableCollectionOrders('trump-digital-trading-cards-series-2');
    // this.handleTransfer({
    //   chainId: 137,
    //   contractAddress: '0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be',
    //   tokenId: '4',
    //   fromAddress: '0xe2c8029957d65242a651177667a7f45b0b83fb92',
    //   toAddress: '0x7e9508950b3657e572a0aacd951f70e8172d5d05',
    //   hash: '0x0054542fa708402ce2a56d41e1ecf0e5882caccf76b07221789715c960f90be4',
    // });
    // this.handlePreSold({
    //   chainId: 42161,
    //   txHash:
    //     '0x963551e0a9e6b6ee7cf5e7a0610cd2763527cd73f68dffcd58cae64adbf70736',
    //   protocolAddress: '0x0000000000000068f116a894984e2db1123eb395',
    //   eventTimestamp: 1729220867 * 1000,
    //   fromAddress: '0x33d11c2dd0de6bf29beaebfdf948fedf7bc3f271',
    //   toAddress: '0x138238dcaf471889088b809e1193896048db6327',
    //   paymentToken: '0x0000000000000000000000000000000000000000',
    // });
    // this.syncNftOrders({
    //   chainId: 8453,
    //   tokenId: '19281',
    //   contractAddress: '0x41dc69132cce31fcbf6755c84538ca268520246f',
    // });
  }

  async reloadCollections() {
    const selectedRes = await this.openSeaCollectionRepository.findAll({
      where: { isSelected: true, deleted: false },
    });
    this.selectedCollections = selectedRes.map((e) => e.slug);
    if (!this.selectedCollections || this.selectedCollections.length === 0) {
      this.logger.log('selectedRes empty');
    }
    const res = await this.openSeaCollectionRepository.findAll({
      where: { isSelected: false, deleted: false },
    });
    this.rankingCollections = res.map((e) => e.slug);
    if (!this.rankingCollections || this.rankingCollections.length === 0) {
      this.logger.log('rankingCollections empty');
    }

    this.collections = Array.from(
      new Set([...this.selectedCollections, ...this.rankingCollections]),
    );
    this.logger.debug(
      `collections ${this.collections}, selectedCollections ${this.selectedCollections}, rankingCollections ${this.rankingCollections}`,
    );
    return this.collections;
  }

  // 每次重启调用
  async reloadCollectionListing(newCollections?: string[]) {
    // this.logService.log(LOG_TYPE.COMMON, `reloadCollectionListing`, {
    //   collections: newCollections,
    // });
    let collections = newCollections;
    if (!collections || collections.length === 0) {
      collections = await this.reloadCollections();
    }

    for (const collection of collections) {
      this.logger.debug(`collection reloadCollectionListing ${collection}`);

      try {
        await this.openSeaApiService.importCollectionBestListings(
          collection,
          async (listings) => {
            this.logger.log(
              `reloadCollectionListing ${collection} ${listings?.length}`,
            );
            for (const listing of listings) {
              await this.handleListed(listing, { force: true });
            }
          },
        );
      } catch (e) {
        this.logger.log(
          `collection reloadCollectionListing error ${e.message}`,
        );
      }
    }
  }

  /**
   * 同步nft的opensea平台的listing数据
   */
  async syncNftOrders(nft: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  }) {
    this.logService.log(LOG_TYPE.COMMON, 'syncNftOrders', nft);
    const { chainId, contractAddress, tokenId } = nft;
    const listings = await this.openSeaApiService.getAllListingsByNFT(
      chainId,
      contractAddress,
      tokenId,
    );

    // disable opensea中不存在的订单
    const orderHashes = listings.map((e) => e.order_hash);

    const asset = await this.assetRepository.findOne({
      attributes: ['id'],
      where: {
        chainId: chainId,
        tokenId: tokenId,
      },
      include: [
        {
          attributes: ['id'],
          model: Contract,
          where: {
            address: contractAddress.toLowerCase(),
            chainId: chainId,
          },
        },
      ],
    });
    if (!asset) {
      return;
    }
    // this.logger.debug(`orderHashes ${orderHashes}`);
    const orderAssets = await this.seaportOrderAssetRepository.findAll({
      attributes: ['id', 'token'],
      where: {
        side: 0,
        assetId: asset.id,
        // identifierOrCriteria: tokenId,
        // token: ethers.utils.getAddress(contractAddress),
      },
      include: [
        {
          attributes: ['id', 'hash', 'isFillable'],
          model: SeaportOrder,
          where: {
            isFillable: true,
            platformType: ORDER_PLATFORM_TYPE.OPENSEA,
          },
        },
      ],
    });
    for (const orderAsset of orderAssets) {
      // this.logger.debug(
      //   `orderAsset.order ${orderAsset.SeaportOrder.hash} ${orderAsset.SeaportOrder.id}`,
      // );
      if (orderHashes.indexOf(orderAsset.SeaportOrder.hash) === -1) {
        // this.logger.debug(`disable order ${orderAsset.SeaportOrder.hash}`);
        await this.seaportOrderRepository.update(
          { isFillable: false },
          { where: { id: orderAsset.SeaportOrder.id } },
        );

        this.orderQueueService.updateAssetBestOrder(
          asset.id,
          null,
          UpdateAssetOrderCategory.Listing,
        );
        // await this.assetExtraRepository.update(
        //   {
        //     bestListingOrderId: null,
        //     bestListingSymbol: '',
        //     bestListingPerPrice: null,
        //     bestListingPlatform: null,
        //   },
        //   {
        //     where: {
        //       bestListingOrderId: orderAsset.SeaportOrder.id,
        //     },
        //   },
        // );  );
      }
      // format token of existed order
      orderAsset.token = ethers.utils.getAddress(orderAsset.token);
      await orderAsset.save();
    }

    // add order
    if (listings) {
      for (const listing of listings) {
        await this.handleListed(listing, { force: true });
      }
    }
  }

  // 检测和修复poc中断造成的影响
  async checkAndRepair() {
    const log = await this.openSeaRepairRepository.findOne({
      where: {
        status: AggregatorOpenSeaRepairLog.EVENT_STATUS_INIT,
      },
      order: [['start_time', 'ASC']],
    });
    if (log) {
      let collections = [];
      if (log.collections != null && log.collections.length > 0) {
        collections = log.collections.split(',');
      } else {
        collections = await this.reloadCollections();
      }
      for (const collection of collections) {
        this.logger.debug(`collection checkAndRepair ${collection}`);
        await this.openSeaApiService.importCollectionEvents(
          collection,
          log.startTime + '',
          log.endTime + '',
          async (events) => {
            for (const event of events) {
              await this.handleApiEvent(event);
            }
          },
        );
        log.status = AggregatorOpenSeaRepairLog.EVENT_STATUS_DONE;
        await log.save();
      }
    }
  }
  async checkAndRepairNFTs(
    nfts: [
      {
        chainId: number;
        contractAddress: string;
        tokenId: string;
        startTime: number;
        endTime: number;
      },
    ],
  ) {
    this.logger.log(`checkAndRepairNFTs ${JSON.stringify(nfts)}`);
    for (const nft of nfts) {
      await this.openSeaApiService.importNFTEvents(
        nft.chainId,
        nft.contractAddress,
        nft.tokenId,
        nft.startTime + '',
        nft.endTime + '',
        async (events) => {
          for (const event of events) {
            await this.handleApiEvent(event);
          }
        },
      );
    }
  }

  /**
   * 处理来自opensea api 的event
   * @param event
   */
  async handleApiEvent(event) {
    const eventType = event.event_type;
    // 1715151510 -> 1715151510*1000
    const eventTimestamp = event.event_timestamp * 1000;
    if (eventType === 'sale') {
      const txHash = event.transaction;
      const protocolAddress = event.protocol_address;
      const orderHash = event.order_hash;
      const chainId = OpenSeaUtil.convertChainId(event.chain.toLowerCase());
      if (!orderHash || !txHash) {
        this.logger.log(
          `importCollectionEvents txHash ${txHash} incomplete. skip`,
        );
        return;
      }
      await this.handlePreSold({
        chainId: chainId,
        txHash,
        protocolAddress: protocolAddress,
        //
        eventTimestamp: eventTimestamp,
        paymentToken: event.payment?.token_address?.toLowerCase(),
        fromAddress: event.seller?.toLowerCase(),
        toAddress: event.buyer?.toLowerCase(),
      });
    } else if (eventType === 'order' && event.order_type === 'listing') {
      // listing  do nothing
      const chainId = OpenSeaUtil.convertChainId(event.chain.toLowerCase());
      const order = await this.getListOrderData(
        chainId,
        event.protocol_address,
        event.order_hash,
      );
      if (order) {
        await this.handleListed(order);
      }
    } else if (eventType === 'cancel' && event.order_type === 'listing') {
      // cancel
      const data = {
        txHash: event.transaction,
        orderHash: event.order_hash,
        chainId: OpenSeaUtil.convertChainId(event.chain.toLowerCase()),
        fromAddress: event.maker?.toLowerCase(),
        eventTimestamp: eventTimestamp,
      };
      await this.handleCanceled(data);
    } else if (eventType === 'transfer') {
      // transfer
      const data = {
        chainId: OpenSeaUtil.convertChainId(event.chain.toLowerCase()),
        contractAddress: event.nft?.contract?.toLowerCase(),
        tokenId: event.nft?.identifier,
        fromAddress: event.from_address.toLowerCase(),
        toAddress: event.to_address.toLowerCase(),
        hash: event.transaction?.toLowerCase(),
        eventTime: eventTimestamp,
      };
      this.handleTransfer(data);
    }
  }

  /**
   * 处理来自opensea stream的event
   * @param eventType
   * @param payload
   */
  async handlerEvent(eventType: string, payload: any) {
    // this.logger.debug(`handlerEvent ${eventType} ${JSON.stringify(payload)}`);
    if (eventType === OPENSEA_EVENT_TYPE.ITEM_LISTED) {
      await this.handleListed(payload);
    } else if (eventType === OPENSEA_EVENT_TYPE.ITEM_CANCELLED) {
      if (payload.listing_date) {
        const data = {
          txHash: payload.transaction?.hash ?? '',
          orderHash: payload.order_hash,
          chainId: OpenSeaUtil.convertChainId(payload.chain.toLowerCase()),
          fromAddress: payload.maker?.address?.toLowerCase(),
          eventTimestamp: payload.event_timestamp,
        };
        await this.handleCanceled(data);
      } else {
        this.logger.debug(
          `cancel order is not listing, skip ${payload.order_hash}`,
        );
      }
    } else if (eventType === OPENSEA_EVENT_TYPE.ITEM_SOLD) {
      const chainId = OpenSeaUtil.convertChainId(
        payload.chain.toLowerCase() || payload.item?.chain?.name,
      );
      const protocolAddress =
        payload.protocol_address || SEAPORT_EXCHANGE_ADDRESS_16;
      const txHash = payload.transaction?.hash;
      await this.handlePreSold({
        chainId: chainId,
        txHash,
        protocolAddress: protocolAddress,
        //
        eventTimestamp: payload.event_timestamp,
        paymentToken: payload.payment_token.address?.toLowerCase(),
        fromAddress: payload.maker.address.toLowerCase(),
        toAddress: payload.taker.address.toLowerCase(),
      });
    } else if (eventType === OPENSEA_EVENT_TYPE.ITEM_TRANSFERRED) {
      const data = {
        chainId: OpenSeaUtil.convertChainId(
          payload.chain?.toLowerCase() || payload.item?.chain?.name,
        ),
        contractAddress: payload.item.nft_id.split('/')[1].toLowerCase(),
        tokenId: payload.item.nft_id.split('/')[2],
        fromAddress: payload.from_account.address.toLowerCase(),
        toAddress: payload.to_account.address.toLowerCase(),
        hash: payload.transaction?.hash?.toLowerCase(),
        eventTime: payload.event_timestamp,
      };
      this.handleTransfer(data);
    }
  }

  /**
   *
   * @param payload
   * @param option : force 是否强制需要激活被disable的订单
   */
  @CatchError()
  async handleListed(payload, option?: { force: boolean }) {
    option = { force: false, ...option };
    // this.logger.log(
    //   `handleListed ${JSON.stringify(payload)} ${JSON.stringify(option)}`,
    // );
    if (!payload.protocol_data) {
      this.logger.log(
        `handlerListed protocol_data is ${payload.protocol_data}. skip `,
      );
      return;
    }

    const hash = payload.order_hash;
    const consideration = payload.protocol_data.parameters.consideration;
    const chainId = OpenSeaUtil.convertChainId(
      payload.chain?.toLowerCase() || payload.item?.chain?.name,
    );
    const order = payload.protocol_data.parameters;

    // 快速过滤private listing. 除 FULL_OPEN,  PARTIAL_OPEN 其他非法
    if ([0, 1].indexOf(order.orderType) === -1) {
      return;
    }

    // 检测是否为private listing. 跳过
    for (const item of consideration) {
      // 如果 consideration 包含 erc721, erc 1155 类型，且 recipient不为空
      if ((item.itemType === 2 || item.itemType === 3) && item.recipient) {
        return;
      }
    }

    // before 检测 asset 是否存在
    let asset = await this.aggregatorCoreDao.findNFTByToken({
      tokenId: order.offer[0].identifierOrCriteria,
      chainId: chainId,
      contractAddress: order.offer[0].token.toLowerCase(),
    });
    if (!asset) {
      asset = await this.assetDao.syncAssetOnChain({
        contractAddress: order.offer[0].token.toLowerCase(),
        tokenId: order.offer[0].identifierOrCriteria,
        chainId: (chainId + '') as ChainId,
      });
      if (!asset) {
        this.logger.log(
          `asset not found. skip this listing. ${chainId} ${order.offer[0].token.toLowerCase()}/${order.offer[0].identifierOrCriteria}`,
        );
        return;
      }
    }

    // 检测价格是否为native或wrap native
    if (!(await this.orderDao.checkOrderNativeToken(chainId, consideration))) {
      this.logger.log(
        `The unit of order price is illegal, order hash is ${hash}, skip`,
      );
      return;
    }

    // 1. 检测订单是否已创建
    const exitsOrder = await this.seaportOrderRepository.findOne({
      where: { hash: hash, platformType: ORDER_PLATFORM_TYPE.OPENSEA },
    });
    if (exitsOrder) {
      if (
        option.force &&
        !exitsOrder.isFillable &&
        !exitsOrder.isCancelled &&
        exitsOrder.endTime > new Date().getTime() / 1000
      ) {
        // check if order is fulfilled
        const fulfilledHistory =
          await this.seaportOrderHistoryRepository.findOne({
            attributes: ['id'],
            where: {
              hash: hash,
              chainId: chainId,
              orderStatus: OrderStatus.FULFILLED,
            },
          });

        if (fulfilledHistory) {
          this.logger.log(
            `Order ${hash} is fulfilled, skip reactivate`,
          );
          return;
        }

        // 重新激活订单
        this.logger.log(`Reactivate order. order hash is ${hash}`);
        exitsOrder.isFillable = true;
        await exitsOrder.save();

        const seaportOrderAssets =
          await this.seaportOrderAssetRepository.findAll({
            attributes: ['assetId'],
            where: {
              seaportOrderId: exitsOrder.id,
              [Op.or]: [{ itemType: 2 }, { itemType: 3 }],
            },
          });
        const assetIds = seaportOrderAssets.map((e) => e.assetId);
        // 4. 因為創建訂單是用 transaction，所以要等 transaction 完成後才能更新 best order（需要去 DB 查詢）
        if (assetIds && assetIds.length > 0) {
          assetIds.map(
            (assetId) =>
              this.orderQueueService.updateAssetBestOrder(
                assetId,
                exitsOrder,
                UpdateAssetOrderCategory.Listing,
              ),
            // this.assetExtraDao.updateAssetExtraBestOrderByAssetId(
            //   assetId,
            //   exitsOrder,
            //   UpdateAssetOrderCategory.Listing,
            // ),
          );
          // update lastCreatedListingAt
          assetIds.map(async (assetId) => {
            await this.assetExtraRepository.update(
              {
                lastCreatedListingAt: new Date(exitsOrder.startTime * 1000),
              },
              {
                where: {
                  assetId,
                },
              },
            );
          });
        } else {
          this.logger.error(
            `createOrder: can not sync asset_extra best order info. assetIds: ${assetIds}, order: ${JSON.stringify(
              payload,
            )}`,
          );
        }
        return;
      }
      this.logger.log(`This order already exists, order hash is ${hash}`);
      return;
    }

    // 2. 计算价格
    const price = await this.orderDao.calListingOrderPrice(
      `${chainId}`,
      consideration,
    );
    const perPrice = await this.orderDao.calListingOrderPerPrice(
      { offer: order.offer, consideration: order.consideration },
      price,
    );
    // this.logger.debug('order price: ' + price + ', perPrice ' + perPrice);

    // 3. 创建订单记录

    let assetIds: string[] = null;
    const seaportOrder = await this.sequelizeInstance.transaction(
      async (t: Transaction) => {
        // 3.1 add seaport_order
        const orderValues = {
          offerer: order.offerer.toLowerCase(),
          signature: payload.protocol_data.signature ?? '',
          hash: hash,
          category: Category.LISTING,
          orderType: order.orderType,
          offerType: null,
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
          exchangeAddress:
            payload.protocol_address?.toLowerCase() ||
            SEAPORT_EXCHANGE_ADDRESS_16,
          chainId: chainId,
          salt: order.salt,
          price: +price,
          perPrice: +perPrice,
          platformType: ORDER_PLATFORM_TYPE.OPENSEA,
        };
        const dbOrder = await this.seaportOrderRepository.create(orderValues, {
          transaction: t,
        });

        // 3.2 add seaport_order_asset
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
                currency = await this.aggregatorCoreDao.findCurrency({
                  address: offerAndConsideration.token.toLowerCase(),
                  chainId: chainId,
                });
                if (!mainCurrency) {
                  mainCurrency = currency;
                }
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
                asset = await this.aggregatorCoreDao.findNFTByToken({
                  chainId: chainId,
                  contractAddress: offerAndConsideration.token.toLowerCase(),
                  tokenId: offerAndConsideration.identifierOrCriteria,
                });
                assets.push({
                  contractAddress: offerAndConsideration.token.toLowerCase(),
                  tokenId: offerAndConsideration.identifierOrCriteria,
                  amount: offerAndConsideration.startAmount,
                });
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
              token: getAddress(
                offerAndConsideration.token.toLocaleLowerCase(),
              ),
              identifierOrCriteria: offerAndConsideration.identifierOrCriteria,
              startAmount: offerAndConsideration.startAmount,
              endAmount: offerAndConsideration.endAmount,
              availableAmount: offerAndConsideration.startAmount,
              recipient: offerAndConsideration.recipient,
            };
            return newSeaportOrderAsset;
          },
        );
        await this.seaportOrderAssetRepository.bulkCreate(seaportOrderAsset, {
          transaction: t,
        });

        // 3.3 add seaport_order_history
        const seaportOrderHistory = [];
        const eventCategory: AssetEventCategory = AssetEventCategory.LIST;
        const orderSymbolPrice = +price;
        const symbolUsdPrice = +(
          await this.currencyService.getSymbolPrice(
            mainCurrency.symbol.replace(/^W/i, '') + 'USD',
          )
        ).price;
        assets.map((asset) => {
          seaportOrderHistory.push({
            contractAddress: asset.contractAddress,
            tokenId: asset.tokenId,
            chainId: +chainId,
            amount: asset.amount,
            category: eventCategory,
            startTime: new Date(order.startTime * 1000),
            endTime: new Date(order.endTime * 1000),
            price: orderSymbolPrice,
            currencySymbol: mainCurrency.symbol,
            usdPrice: orderSymbolPrice * symbolUsdPrice,
            fromAddress: order.offerer.toLowerCase(),
            hash: hash,
            platformType: ORDER_PLATFORM_TYPE.OPENSEA,
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

    // 4. 因為創建訂單是用 transaction，所以要等 transaction 完成後才能更新 best order（需要去 DB 查詢）
    if (assetIds && assetIds.length > 0) {
      assetIds.map((assetId) => {
        this.orderQueueService.updateAssetBestOrder(
          assetId,
          seaportOrder,
          UpdateAssetOrderCategory.Listing,
        );
        // this.assetExtraDao.updateAssetExtraBestOrderByAssetId(
        //   assetId,
        //   seaportOrder,
        //   UpdateAssetOrderCategory.Listing,
        // );
      });
    } else {
      this.logger.error(
        `createOrder: can not sync asset_extra best order info. assetIds: ${assetIds}, order: ${JSON.stringify(
          payload,
        )}`,
      );
    }

    // 5. 更新asset最近的listing时间
    assetIds.map(async (assetId) => {
      await this.assetExtraRepository.update(
        {
          lastCreatedListingAt: new Date(order.startTime * 1000),
        },
        {
          where: {
            assetId,
          },
        },
      );
    });

    this.collectionDao.updateCollectionTotalByAssets(
      assetIds,
      Category.LISTING,
    );

    this.logService.log(LOG_TYPE.COMMON, 'handleListed');
  }

  @CatchError()
  async handleCanceled(data: {
    orderHash: string;
    chainId: number;
    txHash: string;
    fromAddress: string;
    eventTimestamp: string | number;
  }) {
    // this.logger.log(`handleCanceled ${JSON.stringify(data)}`);

    // 1. update seaport order
    const dbOrder = await this.seaportOrderRepository.findOne({
      where: {
        hash: data.orderHash,
        chainId: data.chainId,
      },
    });
    if (!dbOrder) {
      this.logger.log(`can not find order db. orderhash is ${data.orderHash}`);
      return;
    }
    dbOrder.isFillable = false;
    dbOrder.isCancelled = true;
    await dbOrder.save();

    // 2.update asset extra
    const orderAssetIds = (
      await this.seaportOrderAssetRepository.findAll({
        attributes: ['assetId'],
        where: {
          seaportOrderId: dbOrder.id,
        },
      })
    ).map((e) => e.assetId);
    // execute async
    if (orderAssetIds) {
      const ids = orderAssetIds.filter(
        (e) => e != null && e.trim().length !== 0,
      );
      ids.map((id) => {
        this.orderQueueService.updateAssetBestOrder(
          id,
          null,
          UpdateAssetOrderCategory.Listing,
        );
        // this.assetExtraDao.updateAssetExtraBestOrderByAssetId(
        //   id,
        //   null,
        //   UpdateAssetOrderCategory.Listing,
        // );
      });
    }

    // 3. create cancelled Order history
    const dbCancelHistory = await this.seaportOrderHistoryRepository.findOne({
      attributes: ['id'],
      where: {
        hash: data.orderHash,
        txHash: data.txHash,
        chainId: data.chainId,
      },
    });
    if (dbCancelHistory) {
      this.logger.debug(
        `OrderCancelled event ${data.txHash} orderHash ${data.orderHash} is exist in database seaport_order_history`,
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
            hash: data.orderHash,
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
        `chainId ${data.chainId} poll: OrderCancelled event  orderHash ${data.orderHash} currency not found in database currency`,
      );
      return;
    }
    const orderAssets = await this.seaportOrderAssetRepository.findAll({
      where: { assetId: { [Op.not]: null } },
      include: [
        {
          model: SeaportOrder,
          where: {
            hash: data.orderHash,
            chainId: data.chainId,
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
    if (orderAssets[0].Asset.tokenId === null) {
      this.logger.debug(
        `chainId ${data.chainId}: OrderCancelled event orderHash ${data.orderHash} asset not found in database asset`,
      );
      return;
    }

    const cancelHistories = await Promise.all(
      orderAssets.map(async (orderAsset) => {
        return {
          contractAddress: orderAsset.Asset.Contract.address,
          tokenId: orderAsset.Asset.tokenId,
          amount: orderAsset.startAmount,
          chainId: data.chainId,
          category: AssetEventCategory.CANCEL,
          startTime: new Date(data.eventTimestamp),
          price: orderAsset.SeaportOrder.price,
          currencySymbol: orderCurrency.Currency.symbol,
          fromAddress: data.fromAddress,
          hash: data.orderHash,
          txHash: data.txHash,
          platformType: ORDER_PLATFORM_TYPE.OPENSEA,
        };
      }),
    );
    await this.seaportOrderHistoryRepository.bulkCreate(cancelHistories);
    await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
      {
        orderHash: data.orderHash,
        chainId: data.chainId,
      },
      OrderStatus.CANCELED,
    );

    this.logService.log(LOG_TYPE.COMMON, 'handleCanceled');
  }

  async handlePreSold(tx: {
    chainId: number;
    txHash: string;
    protocolAddress?: string;
    paymentToken: string;
    fromAddress: string;
    toAddress: string;
    eventTimestamp: string | number;
  }) {
    const orders = await this.getSoldOrderDataFromTransaction(tx);
    // console.log('orders ', orders[0]);
    // console.log('orders ', orders[0].order.offer);
    // console.log('orders ', orders[0].order.consideration);
    for (const data of orders) {
      const cacheKey = CacheKeys.aggregatorOpenSeaNFTSoldKey(
        data.chainId,
        data.contractAddress,
        data.tokenId,
      );
      if (await this.cacheService.getCache(cacheKey)) {
        this.logger.debug(
          `this.handleSold ${data.contractAddress} ${data.tokenId} task has been handled, skip this time`,
        );
        continue;
      }

      await this.cacheService.setCache(cacheKey, true, 60 * 2); // 缓存2分钟,避免重复调用
      this.handleSold(data);
    }
  }

  @CatchError()
  async handleSold(data: {
    contractAddress: string;
    tokenId: string;
    orderHash: string;
    txHash: string;
    chainId: number;
    order: {
      offer: {
        contractAddress: string;
        tokenId: string;
        amount: string;
        itemType: number;
      }[];
      consideration: {
        contractAddress: string;
        amount: string;
        recipient: string;
        itemType: number;
      }[];
      offerer: string;
    };
    paymentToken: string;
    eventTimestamp: string | number;
    fromAddress: string;
    toAddress: string;
  }) {
    // this.logger.log(`handleSold ${JSON.stringify(data)}`);

    // before 检测 关联asset 是否存在
    const asset = await this.aggregatorCoreDao.findNFTByToken({
      chainId: data.chainId,
      contractAddress: data.contractAddress,
      tokenId: data.tokenId,
    });
    if (!asset) {
      // await this.assetDao.syncAssetOnChain({
      //   contractAddress: data.contractAddress.toLowerCase(),
      //   tokenId: data.tokenId,
      //   chainId: (data.chainId + '') as ChainId,
      // });
      this.logger.log('asset not found. skip this Sold');
      return;
    }

    const dbOrder = await this.seaportOrderRepository.findOne({
      where: {
        hash: data.orderHash,
        chainId: data.chainId,
        platformType: ORDER_PLATFORM_TYPE.OPENSEA,
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
        `chainId ${data.chainId} poll: OrderFulfilled event ${data.orderHash} is not exist in database order`,
      );
      return;
    }

    const dbOrderHistory = await this.seaportOrderHistoryRepository.findOne({
      where: {
        hash: data.orderHash,
        txHash: data.txHash,
        chainId: data.chainId,
      },
    });
    // check if order history IS exist, skip
    //確保不會記錄重複的 order history
    if (dbOrderHistory) {
      this.logger.debug(
        `chainId ${data.chainId} poll: OrderFulfilled event ${data.txHash} orderHash ${data.orderHash} is exist in database order history`,
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
      data.order.offer.forEach((item) => {
        if (item.itemType > 1) {
          orderAssets.push({
            contractAddress: item.contractAddress,
            tokenId: ethers.BigNumber.from(item.tokenId),
            amount: ethers.BigNumber.from(item.amount),
          });
        }
      });
      data.order.consideration.forEach((item) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.contractAddress,
            amount: ethers.BigNumber.from(item.amount),
          });
        }
      });
    }

    // calculate order price
    // e.g., seller get 0.9 ETH
    // + platform fee 0.025 ETH
    // +  creator fee 0.075 ETH
    // =      order price 1 ETH
    const orderPrice = new BigNumber(
      await this.orderDao.calListingOrderPrice(
        data.chainId + '',
        data.order.consideration.map((e) => ({
          itemType: e.itemType,
          token: e.contractAddress,
          startAmount: e.amount,
        })),
      ),
    );
    let currencySymbol = '';
    const currency = await this.aggregatorCoreDao.findCurrency({
      address: data.paymentToken.toLowerCase(),
      chainId: data.chainId,
    });
    if (currency) {
      currencySymbol = currency.symbol;
    }

    // if WETH need to replace to ETH, because CurrencyService don't have warped token price
    const symbolUsd = currencySymbol
      ? await this.currencyService.getSymbolPrice(
        currencySymbol.replace(/^W/i, '') + 'USD',
      )
      : null;
    const symbolUsdPrice = symbolUsd ? symbolUsd.price : 0;
    const orderUsdPrice = orderPrice.multipliedBy(symbolUsdPrice);

    // cal service fee usd price
    const { serviceFeeAmount, serviceFeeUsdPrice } =
      await this.orderDao.getOrderServiceFeeInfo(
        data.chainId,
        data.order.consideration.map((e) => ({
          ...e,
          token: e.contractAddress,
        })),
      );

    const orderHistories = [];
    const txTime = new Date(data.eventTimestamp);

    // offer items
    for (const item of data.order.offer) {
      // if it's NFT, it's fulfilled offer
      if (item.itemType <= 1) {
        continue;
      }

      // 取得 transfer 的 to，避免抓到錯誤的 to （SA 交易的 to 是 Biconomy）
      const transactionReceipt =
        await this.gatewayService.getTransactionReceipt(
          data.chainId,
          data.txHash,
        );
      let toAddress = data.toAddress;
      for (const log of transactionReceipt.logs) {
        // handle ERC721 transfer
        if (
          log.address.toLowerCase() == item.contractAddress.toLowerCase() &&
          log.topics[0] === TRANSFER_TOPIC0 &&
          log.data == '0x' &&
          ethers.BigNumber.from(log.topics[3]).toString() === item.tokenId
        ) {
          toAddress = '0x' + log.topics[2].slice(26);
          break;
        }
        // handle ERC1155 single transfer
        if (
          log.address.toLowerCase() == item.contractAddress.toLowerCase() &&
          log.topics[0] === ERC1155_TRANSFER_SINGLE_TOPIC0 &&
          ethers.BigNumber.from(log.data.slice(0, 66)).toString() ===
          item.tokenId
        ) {
          toAddress = '0x' + log.topics[3].slice(26);
          break;
        }
      }

      orderHistories.push({
        contractAddress: item.contractAddress,
        tokenId: item.tokenId,
        amount: item.amount,
        chainId: data.chainId,
        category: AssetEventCategory.SALE,
        startTime: txTime,
        price: orderPrice.toNumber(),
        serviceFeeAmount: serviceFeeAmount,
        serviceFeeUsdPrice: serviceFeeUsdPrice?.toNumber(),
        currencySymbol: currencySymbol,
        usdPrice: orderUsdPrice.toNumber(),
        fromAddress: data.fromAddress,
        toAddress,
        hash: data.orderHash,
        txHash: data.txHash,
        platformType: ORDER_PLATFORM_TYPE.OPENSEA,
        // orderStatus:OrderStatus.FULFILLED,
      });
    }

    const updatedCount =
      await this.seaportOrderHistoryRepository.bulkCreate(orderHistories);

    for (const orderHistory of orderHistories) {
      await this.orderDao.transferAssetOwnershipOnchain({
        contractAddress: orderHistory.contractAddress,
        tokenId: orderHistory.tokenId,
        chainId: (data.chainId + '') as ChainId,
        fromAddress: orderHistory.fromAddress,
        toAddress: orderHistory.toAddress,
      });
    }

    // 更新 availableAmount
    // available_amount = offer.endAmount * (numerator / denominator)
    const orderStatus: {
      isValidated: boolean;
      isCancelled: boolean;
      totalFilled: ethers.BigNumber;
      totalSize: ethers.BigNumber;
    } = await this.orderDao.getSeaportOrderStatusOnChain(
      dbOrder.hash,
      data.chainId,
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
            await this.seaportOrderRepository.update(
              { isFillable: false },
              { where: { id: dbOrder.id } },
            );
          }

          await this.seaportOrderAssetRepository.update(
            {
              availableAmount: availableAmount.toString(),
            },
            {
              where: { id: orderAssetId.id },
            },
          );
        }),
      );
    }

    if (isFullyFilled) {
      await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
        { orderHash: data.orderHash, chainId: data.chainId },
        OrderStatus.FULFILLED,
      );
    }

    await this.orderDao.disableOrderByAssets(
      orderAssets.map((e) => ({
        contractAddress: e.contractAddress,
        tokenId: e.tokenId?.toString(),
        chainId: data.chainId,
        contractType: asset.Contract.schemaName,
      })),
      {
        nftTransfer: true,
        fromAddress: data.fromAddress,
        eventTime: data.eventTimestamp
          ? Math.floor(txTime.getTime() / 1000)
          : null,
      },
    );

    orderAssets.map((e) => {
      this.orderQueueService.updateAssetBestOrder(
        asset.id,
        null,
        UpdateAssetOrderCategory.ListingAndOffer,
      );
    });

    this.logService.log(LOG_TYPE.COMMON, 'handleSold');
  }

  @CatchError()
  async handleTransfer(data: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    fromAddress: string;
    toAddress: string;
    hash: string;
    eventTime: string | number;
  }) {
    // this.logger.debug(`handleTransfer ${JSON.stringify(data)}`);
    // before 检测 关联asset 是否存在
    const asset = await this.aggregatorCoreDao.findNFTByToken({
      chainId: data.chainId,
      contractAddress: data.contractAddress,
      tokenId: data.tokenId,
    });
    if (!asset) {
      // await this.assetDao.syncAssetOnChain({
      //   contractAddress: data.contractAddress,
      //   tokenId: data.tokenId,
      //   chainId: (data.chainId + '') as ChainId,
      // });
      this.logger.log('asset not found. skip this Transfer');
      return;
    }

    // await this.orderDao.transferAssetOwnershipOnchain({
    //   contractAddress: data.contractAddress,
    //   tokenId: data.tokenId,
    //   chainId: (data.chainId + '') as ChainId,
    //   fromAddress: data.fromAddress,
    //   toAddress: data.toAddress,
    // });

    /**
     * 逻辑跟order/sync接口类似
     * 先去看 transfer 後 offerer 還有沒有足夠的 amount (721的話就沒有，1155可能只轉出一部分，
     * 所以不能直接有transfer就砍單），如果有改到訂單狀態最後再去 call assetExtraService.updateBestOrder
     */

    await this.orderDao.disableOrderByAssets(
      [
        {
          chainId: data.chainId,
          contractAddress: data.contractAddress,
          tokenId: data.tokenId,
          contractType: asset.Contract.schemaName,
        },
      ],
      {
        nftTransfer: true,
        fromAddress: data.fromAddress,
        eventTime: data.eventTime
          ? Math.floor(new Date(data.eventTime).getTime() / 1000)
          : null,
      },
    );

    this.orderQueueService.updateAssetBestOrder(
      asset.id,
      null,
      UpdateAssetOrderCategory.ListingAndOffer,
    );
    // await this.assetExtraDao.updateAssetExtraBestOrderByAssetId(asset.id);

    this.logService.log(LOG_TYPE.COMMON, 'handleTransfer');
  }

  async getListOrderData(
    chainId: number,
    protocolAddress: string,
    orderHash: string,
  ) {
    // this.logger.log(
    //   `getListOrderData ${chainId} ${protocolAddress} ${orderHash}`,
    // );
    const order = await this.openSeaApiService.getOrderData({
      chainId: chainId,
      orderHash: orderHash,
      protocolAddress: protocolAddress,
    });
    return order;
  }

  async getSoldOrderDataFromTransaction(tx: {
    chainId: number;
    txHash: string;
    protocolAddress?: string;
    paymentToken: string;
    fromAddress: string;
    toAddress: string;
    eventTimestamp: string | number;
  }) {
    let {
      chainId,
      txHash,
      protocolAddress,
      paymentToken,
      fromAddress,
      toAddress,
      eventTimestamp,
    } = tx;
    // this.logger.debug(`getOrderNFTsFromTransaction ${chainId} ${txHash}`);
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProvider(chainId);
    const data = await this.gatewayService.getTransactionReceipt(
      chainId,
      txHash,
    );

    // 如果protocolAddress null， 使用默认的Seaport 1.6 合約地址
    if (!protocolAddress || protocolAddress.length === 0) {
      protocolAddress = SEAPORT_EXCHANGE_ADDRESS_16;
    }
    const seaport = new ethers.Contract(protocolAddress, SEAPORT_ABI, provider);
    const orders = [];
    // const assets = [];
    for (const log of data.logs) {
      // if (log.data == '0x') {
      //   const tokenId = ethers.BigNumber.from(log.topics[3]).toString();
      //   const contractAddress = log.address.toLowerCase();
      //   assets.push({ contractAddress, tokenId });
      //   console.log(contractAddress, ' tokenId ', log.topics[3]);
      // }
      try {
        const orderData = seaport.interface.parseLog(log);
        const order = orderData?.args;
        if (order) {
          const soldData = {
            contractAddress: order.offer[0].token.toLowerCase(),
            tokenId: order.offer[0].identifier.toString(),
            orderHash: order.orderHash,
            txHash: txHash,
            chainId: chainId,
            eventTimestamp: eventTimestamp,
            order: {
              offer: order.offer.map((e) => ({
                contractAddress: e.token.toLowerCase(),
                tokenId: e.identifier.toString(),
                amount: e.amount.toString(),
                itemType: e.itemType,
              })),
              consideration: order.consideration.map((e) => ({
                contractAddress: e.token.toLowerCase(),
                amount: e.amount.toString(),
                recipient: e.recipient?.toLowerCase(),
                itemType: e.itemType,
              })),
              offerer: order.offerer.toLowerCase(),
            },
            paymentToken: paymentToken,
            fromAddress: order.offerer.toLowerCase(),
            toAddress: toAddress,
          };
          orders.push(soldData);
        }
      } catch (e) {
        continue;
      }

      // handle ERC721 transfer
      // if (
      //   log.address.toLowerCase() == item.contractAddress.toLowerCase() &&
      //   log.topics[0] === TRANSFER_TOPIC0 &&
      //   log.data == '0x' &&
      //   ethers.BigNumber.from(log.topics[3]).toString() === item.tokenId
      // ) {
      //   toAddress = '0x' + log.topics[2].slice(26);
      //   break;
      // }
      // // handle ERC1155 single transfer
      // if (
      //   log.address.toLowerCase() == item.contractAddress.toLowerCase() &&
      //   log.topics[0] === ERC1155_TRANSFER_SINGLE_TOPIC0 &&
      //   ethers.BigNumber.from(log.data.slice(2, 66)).toString() ===
      //   item.tokenId
      // ) {
      //   toAddress = '0x' + log.topics[3].slice(26);
      //   break;
      // }
    }
    // console.log(`order assets ${assets.length} `, assets);
    // console.log(`orders ${orders.length} `, orders);
    // console.log(`orders[0] `, orders[0]);
    // console.log(`orders[0] `, orders[0].args.orderHash);
    return orders;
  }

  /**
   * 关闭collection相关的opensea订单, 同时更新相应NFT的最佳订单数据
   * dev环境清理550个NFT的最佳订单耗时大概 7分钟， db cpu 有轻微上升
   */
  async disableCollectionOrders(slug: string) {
    this.logService.log(LOG_TYPE.COMMON, 'disableCollectionOrders', { slug });
    const cacheKey = CacheKeys.aggregatorOpenSeaDeleteSlugKey(slug);
    if (await this.cacheService.getCache(cacheKey)) {
      this.logger.debug(
        `disableCollectionOrders ${slug} task in running, skip this time`,
      );
      return;
    }
    await this.cacheService.setCache(cacheKey, true, 60 * 15); // 缓存15分钟,避免重复调用

    const collection = await this.openSeaCollectionRepository.findOne({
      where: { slug: slug, deleted: true },
    });
    if (!collection) {
      this.logger.log(
        `disableCollectionOrders could not found ${slug} collection in db. skip`,
      );
      return;
    }

    const chainId = collection.chain;
    const contractAddress = collection.address;
    // const chainId = 137;
    // const contractAddress = '0xe28d2d8746d855251ba677a91626009cb33aa4f9';
    //
    if (!contractAddress || !chainId) {
      // 当collection资料不完整，说明collection刚添加不久，未来得及更新资料。
      // 这种情况发生：当手动在db添加监控collection的slug，且未设置对应chain和address时才发生。这个时候资料补充由定时任务负责。
      // 自动爬取OpenSea ranking页面方式不存在这个情况

      // 直接移除
      await this.openSeaCollectionRepository.destroy({
        where: { id: collection.id },
      });
      return;
    }
    // disable order fillable
    const disableOrderSql = `
    update seaport_order
    set is_fillable = false
    where id in (
            select so.id as id from seaport_order so
                inner join public.seaport_order_asset soa on so.id = soa.seaport_order_id
                inner join asset a on a.id = soa.asset_id
            where so.is_fillable = true
              and so.chain_id = :chainId
              and so.category = :category
              and so.platform_type = :platformType
              and soa.token = :contractAddress
    )
    `;
    await this.sequelizeInstance.query(disableOrderSql, {
      replacements: {
        chainId: chainId,
        contractAddress: ethers.utils.getAddress(contractAddress),
        category: Category.LISTING,
        platformType: ORDER_PLATFORM_TYPE.OPENSEA,
      },
      useMaster: true,
      type: QueryTypes.UPDATE,
    });
    // update NFT best offer and listing(offer order这里用不到)
    const needUpdatedAssetsSql = `
    select ae.asset_id as id
    from asset_extra ae
        inner join collections c on ae.collection_id = c.id
        inner join seaport_order so on so.id = ae.best_listing_order_id and so.platform_type = :platformType
    where c.chain_id = :chainId
        and c.contract_address = :contractAddress
    `;
    // 更新该collection下NFT相关最佳订单
    const assets = await this.sequelizeInstance.query(needUpdatedAssetsSql, {
      replacements: {
        chainId: chainId,
        contractAddress: contractAddress,
        platformType: ORDER_PLATFORM_TYPE.OPENSEA,
      },
      type: QueryTypes.SELECT,
    });
    const assetIds = assets.map((e: any) => e.id);
    assetIds.map((assetId) => {
      this.orderQueueService.updateAssetBestOrder(
        assetId,
        null,
        UpdateAssetOrderCategory.Listing,
      );
      // this.assetExtraDao.updateAssetExtraBestOrderByAssetId(
      //   assetId,
      //   null,
      //   UpdateAssetOrderCategory.Listing,
      // );
    });

    // remove the collection in the watched list in db.
    await this.openSeaCollectionRepository.destroy({
      where: { id: collection.id },
    });
  }
}
