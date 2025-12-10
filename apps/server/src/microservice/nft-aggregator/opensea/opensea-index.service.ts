import { Inject, Injectable, Logger } from '@nestjs/common';
import { OpenSeaHandlerService } from '@/core/aggregator-core/opensea/opensea-handler.service';
import { Cron, Timeout } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { AggregatorOpenSeaCollection } from '@/model/entities/aggregator/aggregator-watched-collection';
import { Op } from 'sequelize';
import { sleep } from 'typescript-retry-decorator/dist/utils';
import { OpenSeaApiService } from '@/core/aggregator-core/opensea/opensea-api.service';
import { Collection, SeaportOrderAsset } from '@/model/entities';
import { QueueService } from '@/external/queue/queue.service';

import { ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize-typescript';
import { OpenseaWsService } from '@/microservice/nft-aggregator/opensea/opensea-ws.service';
import { ProviderTokens } from '@/model/providers';

import { OpenseaWsSdkService } from '@/microservice/nft-aggregator/opensea/opensea-ws-sdk.service';
import { LibsService } from '@/common/libs/libs.service';

@Injectable()
export class OpenSeaIndexService {
  private readonly logger = new Logger(OpenSeaIndexService.name);
  // 测试开关，方便测试时关闭定时任务干扰等
  private debug = false;
  constructor(
    @InjectModel(AggregatorOpenSeaCollection)
    private openSeaCollectionRepository: typeof AggregatorOpenSeaCollection,
    @InjectModel(Collection)
    private collectionRepository: typeof Collection,
    @InjectModel(SeaportOrderAsset)
    private seaportOrderAssetRepository: typeof SeaportOrderAsset,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,
    private readonly handlerService: OpenSeaHandlerService,
    private readonly wsService: OpenseaWsService,
    private readonly wsSdkService: OpenseaWsSdkService,
    private readonly apiService: OpenSeaApiService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
    // 添加 LibsService 的依赖注入
    private readonly libsService: LibsService,
  ) {
    // this.testFn();
    // this.testWatchCollection(['rg-bytes']);
  }

  /**
   * 方便测试，提交时不能被调用
   */
  testFn() {
    this.debug = true;
    // this.handlerService.checkAndRepair();
    // this.handlerService.crawlRankingCollections();
    // this.checkCollectionAndImport();
    // this.clearDeletedCollections();
    // this.crawlRankingCollections();
    // this.handlerService.reloadCollectionListing();
    // this.apiService.importCollectionEvents(
    //   'ai-svg-creative',
    //   1710004535 + '',
    //   1720144535 + '',
    //   async (events) => {},
    // );
    // this.wsSdkService.start(['punks2024-', 'crazy-variation-apes']);
    // setTimeout(() => {
    //   // console.log(Array.from(this.wsSdkService.getChannels().keys()));
    // }, 10000);
  }

  /**
   * 方便测试，提交时不能被调用
   * @param slugs
   */
  testWatchCollection(slugs: string[]) {
    this.debug = true;
    this.wsService.collections = slugs;
    this.wsService.start();

    setTimeout(() => {
      // this.wsService.wsClient.terminate();
      this.wsService.updateWssStatusCache();
      // console.log('updateWssStatusCache');
    }, 10000);
  }

  @Timeout(0)
  async handleTimeout() {
    if (this.debug) {
      return;
    }
    this.logger.debug('handleTimeout');
    await this.wsService.reloadCollection(true);
    this.wsService.start();
    // test
    // this.wsSdkService.start(['punks2024-', 'crazy-variation-apes']);
    this.handlerService.reloadCollectionListing();
  }

  /**
   * 每5分钟检测event_rpc_log表中中断记录
   * 每5分钟刷新watch-opensea-colleciton, 并检测是否需要import collection.
   * @param task
   */
  // @Cron('*/10 * * * * *')
  @Cron('0 */5 * * * *')
  handleCron() {
    if (this.debug) {
      return;
    }
    this.logger.debug('handleCron');
    this.wsService.checkWebSocketState();
    this.wsService.reloadCollection(false).then((newCollections) => {
      // 对于新添加的collection。 一次性把该collection目前的最佳订单导入数据库中
      if (newCollections && newCollections.length != 0) {
        this.handlerService.reloadCollectionListing(newCollections);
      }
    });
    this.handlerService.checkAndRepair();
    this.checkCollectionAndImport();
    this.clearDeletedCollections();
    this.wsService.updateWssStatusCache();
  }

  /**
   * 每隔4小时 爬取opensea ranking collection
   */
  @Cron('0 0 */4 * * *')
  handleCrawlCron() {
    if (this.debug) {
      return;
    }
    // this.crawlRankingCollections();
  }

  async checkCollectionAndImport() {
    const watchedCollections = await this.openSeaCollectionRepository.findAll({
      where: {
        [Op.or]: [
          { chain: null },
          { address: null },
          { category: null },
          { category: '' },
        ],
      },
    });

    for (const collection of watchedCollections) {
      let collectionInfo;
      try {
        collectionInfo = await this.apiService.getCollection(collection.slug);
      } catch (e) {
        // console.log(e);
      }
      console.log('collectionInfo', collectionInfo);
      if (collectionInfo?.chainId && collectionInfo.address) {
        const category = collectionInfo.category || 'uncategorized';
        // 现在可以使用 this.libsService
        const chainShortName =
          await this.libsService.findChainShortNameByChainId(
            collectionInfo.chainId,
          );

        // 更新 aggregator_opensea_collections 表
        await this.openSeaCollectionRepository.update(
          {
            chain: collectionInfo.chainId,
            address: collectionInfo.address,
            safelistStatus: collectionInfo.safelistStatus,
            category: category,
            isDisabled: collectionInfo.isDisabled,
            isNsfw: collectionInfo.isNsfw,
            projectUrl: collectionInfo.projectUrl,
            wikiUrl: collectionInfo.wikiUrl,
            discordUrl: collectionInfo.discordUrl,
            telegramUrl: collectionInfo.telegramUrl,
            twitterUsername: collectionInfo.twitterUsername,
            instagramUsername: collectionInfo.instagramUsername,
          },
          { where: { id: collection.id } },
        );

        // 更新 collections 表，使用 chainShortName
        const collectionSlug = `${chainShortName}:${collectionInfo.address.toLowerCase()}`;
        console.log(
          'Attempting to update collection with slug:',
          collectionSlug,
        );

        try {
          // 首先，尝试查找现有的记录
          const existingCollection = await this.collectionRepository.findOne({
            where: { slug: collectionSlug },
          });

          if (existingCollection) {
            console.log(
              'Existing collection found:',
              existingCollection.toJSON(),
            );

            // 更新现有记录
            const updatedCollection = await existingCollection.update({
              safelistStatus: collectionInfo.safelistStatus,
              category: category,
              isDisabled: collectionInfo.isDisabled,
              isNsfw: collectionInfo.isNsfw,
              projectUrl: collectionInfo.projectUrl,
              wikiUrl: collectionInfo.wikiUrl,
              discordUrl: collectionInfo.discordUrl,
              telegramUrl: collectionInfo.telegramUrl,
              twitterUsername: collectionInfo.twitterUsername,
              instagramUsername: collectionInfo.instagramUsername,
            });

            console.log('Updated collection:', updatedCollection.toJSON());
          } else {
            console.log('No existing collection found。');

            // 创建新记录
            // const newCollection = await this.collectionRepository.create({
            //   slug: collectionSlug,
            //   safelist_status: collectionInfo.safelistStatus,
            //   category: category,
            //   is_disabled: collectionInfo.isDisabled,
            //   is_nsfw: collectionInfo.isNsfw,
            //   // 添加其他必要的字段
            //   chain: chainShortName,
            //   address: collectionInfo.address.toLowerCase(),
            //   name: collectionInfo.name || '',
            //   // 根据需要添加其他字段
            // });

            // console.log("Created new collection:", newCollection.toJSON());
          }
        } catch (error) {
          console.error('Error updating/creating collection:', error);
          console.error('Error details:', error.message);
          if (error.errors) {
            console.error('Validation errors:', error.errors);
          }
        }
      } else {
        await this.openSeaCollectionRepository.update(
          { deleted: true },
          { where: { id: collection.id } },
        );
      }

      await sleep(1000);
    }
  }

  // async crawlRankingCollections() {
  //   this.logger.debug('crawlRankingCollections');
  //   const ranks = Array.from(await this.openSeaCrawlerService.getRanks());
  //   this.logger.debug(`crawlRankingCollections ranks ${JSON.stringify(ranks)}`);
  //   for (const rank of ranks) {
  //     if (OPENSEA_COLLECTIONS_BLACKLIST.indexOf(rank.toString()) > -1) {
  //       this.logger.debug(
  //         `crawlRankingCollections ${rank} in blacklist, skip adding this collection`,
  //       );
  //       continue;
  //     }
  //     // 新增新的collection
  //     const collection = await this.openSeaCollectionRepository.findOne({
  //       where: { slug: rank },
  //     });
  //     if (!collection) {
  //       const collectionInfo = await this.apiService.getCollection(
  //         rank.toString(),
  //       );
  //       if (collectionInfo && collectionInfo.chainId != undefined) {
  //         await this.openSeaCollectionRepository.create({
  //           slug: rank,
  //           isSelected: false,
  //           chain: collectionInfo.chainId,
  //           address: collectionInfo.address.toLowerCase(),
  //         });
  //       }
  //     }
  //     sleep(1000);
  //   }
  //   // 标记deleted， 定时任务会处理（取消订阅和关闭collection相关订单）
  //   if (ranks) {
  //     await this.openSeaCollectionRepository.update(
  //       { deleted: true },
  //       { where: { slug: { [Op.not]: ranks }, isSelected: false } },
  //     );
  //   }
  // }

  /**
   * 清理标记deleted的collection
   */
  async clearDeletedCollections() {
    const collections = await this.openSeaCollectionRepository.findAll({
      where: { deleted: true },
      limit: 20,
    });
    for (const collection of collections) {
      try {
        await this.handlerService.disableCollectionOrders(collection.slug);
      } catch (e) {}
    }
  }
}
