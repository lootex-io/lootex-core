import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  AccountGpQuest,
  GpQuestCategory,
  GpQuestStatus,
} from '@/model/entities/gp/account-gp-quest.entity';
import { AccountGpQuestCompleted } from '@/model/entities/gp/account-gp-quest_completed.entity';
import {
  CollectionQuestType,
  QuestCollection,
} from '@/api/v3/account-gp/service/collection-quest/quest-collection.contants';
import { QueryTypes } from 'sequelize';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import * as moment from 'moment';
import { ORDER_PLATFORM_TYPE } from '@/microservice/nft-aggregator/aggregator-constants';
import { GpDao } from '@/core/dao/gp-dao';
import { SimpleException, SimpleJson } from '@/common/utils/simple.util';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { FORMAT_DATETIME } from '@/common/utils';

@Injectable()
export class AccountGpQuestCollectionService {
  private logger = new Logger(AccountGpQuestCollectionService.name);

  constructor(
    @InjectModel(AccountGpQuest)
    private readonly accountGpQuestRepository: typeof AccountGpQuest,
    @InjectModel(AccountGpQuestCompleted)
    private readonly accountGpQuestCompletedRepository: typeof AccountGpQuestCompleted,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly gpDao: GpDao,
  ) {}

  // async testCreateQuest() {
  //   const quest = {
  //     index: 40,
  //     title: '',
  //     description: '',
  //     point: -1,
  //     category: GpQuestCategory.Collection,
  //     args: null,
  //   };
  //   const questCollection: QuestCollection = {
  //     type: CollectionQuestType.LISTING,
  //     threshold: 1, // 检测类型，阈值
  //     rewardType: 'GP', // 奖励类型
  //     rewardAmount: 1, // 奖励金额
  //     rewardTimes: 10, // 奖励次数
  //     collectionAddress: '0xcce8989e5a9c9a9627f7b9ad984c5883a18a2800', // collection address
  //     collectionChainId: 1, // collection chainId
  //     questStartTime: '2025-01-01 00:00:00.000000 +00:00', // 任务开始时间
  //     questEndTime: '2025-01-01 00:00:00.000000 +00:00', // 任务结束时间
  //     claimTime: '2025-01-01 00:00:00.000000 +00:00',
  //   };
  //   quest.args = questCollection;
  //   if (
  //     !(await this.accountGpQuestRepository.findOne({
  //       where: { index: quest.index },
  //     }))
  //   ) {
  //     await this.accountGpQuestRepository.create(quest);
  //     this.logger.log('testCreateQuest success.');
  //   } else {
  //     this.logger.log('testCreateQuest failed. because it already exists');
  //   }
  // }

  async getQuestStatus(accountId: string) {
    let data = await this.accountGpQuestRepository.findAll({
      where: { category: GpQuestCategory.Collection },
    });
    data = data
      .map((e) => e.toJSON())
      .filter((e) => {
        // 过滤条件：領獎期間已過
        const args: QuestCollection = e.args;
        if (args.claimTime >= moment().utc().format(FORMAT_DATETIME)) {
          return true;
        }
        return false;
      });
    data = await Promise.all(
      data.map(async (e: any) => {
        e.claimedCount = await this.findQuestClaimedCount(e.index);
        return e;
      }),
    );
    data.sort((a, b) => a.index - b.index);
    if (accountId == null) {
      return data;
    }
    data = await Promise.all(
      data.map(async (e: any) => {
        const res = await this._getCollectionQuestStatus(accountId, e);
        e.status = res?.status;
        e.statusMessage = res?.statusMessage;
        e.value = res?.value;
        return e;
      }),
    );
    data.sort((a, b) => a.index - b.index);
    return data;
  }

  async _getCollectionQuestStatus(
    accountId: string,
    quest: AccountGpQuest,
  ): Promise<{
    status: GpQuestStatus;
    value?: number;
    statusMessage?: string;
  } | null> {
    const questArgs: QuestCollection = quest.args;

    let res: { status: GpQuestStatus; value: number } = null;
    if (questArgs.type === CollectionQuestType.TRANSACTION_AMOUNT) {
      res = await this.checkTransactionAmount(accountId, quest);
    } else if (questArgs.type === CollectionQuestType.TRANSACTION_NUMBER) {
      res = await this.checkTransactionNumber(accountId, quest);
    } else if (questArgs.type === CollectionQuestType.LISTING) {
      res = await this.checkListing(accountId, quest);
    } else {
      return null;
    }
    if (
      res.status != GpQuestStatus.Completed &&
      this._checkQuestExpired(quest)
    ) {
      return {
        status: GpQuestStatus.Error,
        statusMessage: 'Quest has expired',
      };
    }
    return res;
  }

  /**
   * 交易(buy)金额
   * @param accountId
   * @param quest
   */
  async checkTransactionAmount(accountId: string, quest: AccountGpQuest) {
    const questArgs: QuestCollection = quest.args;
    // 计算规定时间内交易金额
    const sql = `
      select sum(usd_price) from seaport_order_history inner join user_wallets on user_wallets.address::bytea = seaport_order_history.to_address
      where user_wallets.account_id = :accountId
        and seaport_order_history.category = 'sale'
        and seaport_order_history.contract_address = :contractAddress
        and seaport_order_history.chain_id = :chainId
        and seaport_order_history.created_at > :startTime
        and seaport_order_history.created_at < :endTime
      `;
    const res: any[] = await this.sequelizeInstance.query(sql, {
      replacements: {
        accountId: accountId,
        platformType: ORDER_PLATFORM_TYPE.DEFAULT,
        chainId: questArgs.collectionChainId,
        contractAddress: questArgs.collectionAddress,
        startTime: moment(new Date(questArgs.questStartTime))
          .utc()
          .format(FORMAT_DATETIME),
        endTime: moment(new Date(questArgs.questEndTime))
          .utc()
          .format(FORMAT_DATETIME),
      },
      type: QueryTypes.SELECT,
    });
    const tradeVolume = res?.length == 1 ? (res[0].sum ?? 0) : 0;
    if (
      await this.gpDao.getQuestComplete({
        accountId: accountId,
        questIndex: quest.index,
      })
    ) {
      // 已领取
      return { status: GpQuestStatus.Completed, value: tradeVolume };
    }
    let status = GpQuestStatus.Default;
    if (tradeVolume >= questArgs.threshold) {
      status = GpQuestStatus.Claimable;
    }
    return { status, value: tradeVolume };
  }

  /**
   * transaction(buy) number
   * @param accountId
   * @param quest
   */
  async checkTransactionNumber(accountId: string, quest: AccountGpQuest) {
    const questArgs: QuestCollection = quest.args;
    const sql = `
      select distinct tx_hash from seaport_order_history inner join user_wallets on user_wallets.address::bytea = seaport_order_history.to_address
      where user_wallets.account_id = :accountId
        and category = 'sale'
        and seaport_order_history.contract_address = :contractAddress
        and seaport_order_history.chain_id = :chainId
        and seaport_order_history.created_at > :startTime
        and seaport_order_history.created_at < :endTime
      `;
    const orders: any[] = await this.sequelizeInstance.query(sql, {
      replacements: {
        accountId: accountId,
        platformType: ORDER_PLATFORM_TYPE.DEFAULT,
        chainId: questArgs.collectionChainId,
        contractAddress: questArgs.collectionAddress,
        startTime: moment(new Date(questArgs.questStartTime))
          .utc()
          .format(FORMAT_DATETIME),
        endTime: moment(new Date(questArgs.questEndTime))
          .utc()
          .format(FORMAT_DATETIME),
      },
      type: QueryTypes.SELECT,
    });
    let status = GpQuestStatus.Default;
    const txCount = orders?.length ?? 0;
    if (txCount >= questArgs.threshold) {
      status = GpQuestStatus.Claimable;
    }
    if (
      await this.gpDao.getQuestComplete({
        accountId: accountId,
        questIndex: quest.index,
      })
    ) {
      // 已领取
      return { status: GpQuestStatus.Completed, value: txCount };
    }
    return { status: status, value: txCount };
  }

  /**
   * listing number
   * @param accountId
   * @param quest
   */
  async checkListing(accountId: string, quest: AccountGpQuest) {
    const questArgs: QuestCollection = quest.args;
    const sql = `
      select seaport_order_history.id from seaport_order_history inner join user_wallets on user_wallets.address::bytea = seaport_order_history.from_address
      where user_wallets.account_id = :accountId
        and seaport_order_history.contract_address = :contractAddress
        and seaport_order_history.chain_id = :chainId
        and category = 'list'
        and seaport_order_history.platform_type = :platformType
        and seaport_order_history.created_at > :startTime
        and seaport_order_history.created_at < :endTime
      `;
    const res: any[] = await this.sequelizeInstance.query(sql, {
      replacements: {
        accountId: accountId,
        platformType: ORDER_PLATFORM_TYPE.DEFAULT,
        chainId: questArgs.collectionChainId,
        contractAddress: questArgs.collectionAddress,
        startTime: moment(new Date(questArgs.questStartTime))
          .utc()
          .format(FORMAT_DATETIME),
        endTime: moment(new Date(questArgs.questEndTime))
          .utc()
          .format(FORMAT_DATETIME),
      },
      type: QueryTypes.SELECT,
    });
    let status = GpQuestStatus.Default;
    if (
      await this.gpDao.getQuestComplete({
        accountId: accountId,
        questIndex: quest.index,
      })
    ) {
      return { status: GpQuestStatus.Completed, value: res.length };
    }
    if (res && res.length >= questArgs.threshold) {
      status = GpQuestStatus.Claimable;
    }
    return { status, value: res.length };
  }

  /**
   * 领取时间是否过期
   * @param quest
   */
  _checkQuestExpired(quest: AccountGpQuest) {
    const questArgs: QuestCollection = quest.args;
    if (new Date().getTime() > new Date(questArgs.claimTime).getTime()) {
      return true;
    }
    return false;
  }

  async claim(accountId: string, quest: AccountGpQuest) {
    const questArgs: QuestCollection = quest.args;
    const failException = SimpleException.fail({ message: 'Claim failed' });
    const res = await this._getCollectionQuestStatus(accountId, quest);
    if (res.status === GpQuestStatus.Claimable) {
      const count = await this.accountGpQuestCompletedRepository.count({
        where: { questIndex: quest.index },
      });
      if (count >= questArgs.rewardTimes) {
        throw SimpleException.fail({
          message: 'The number of claims has been exhausted',
        });
      }
      const gpAmount = questArgs.rewardAmount.toString();
      const res = await this.gpDao.createQuestHistory({
        accountId: accountId,
        questIndex: quest.index,
        amount: gpAmount,
        note: quest.title,
        questTime: new Date().getTime(),
      });
      if (res) {
        return SimpleJson.success({ data: { gpAmount: gpAmount } });
      }
    } else if (res.status === GpQuestStatus.Completed) {
      throw SimpleException.fail({
        message: 'You have successfully claimed it',
      });
    } else if (res.status === GpQuestStatus.Default) {
      throw failException;
    } else if (res.status === GpQuestStatus.Error) {
      throw SimpleException.fail({
        message: res.statusMessage,
      });
    }
    throw failException;
  }

  @Cacheable({ seconds: 2 })
  async findQuestClaimedCount(questIndex) {
    const count = await this.accountGpQuestCompletedRepository.count({
      where: { questIndex: questIndex },
    });
    return count;
  }
}
