import { Inject, Injectable } from '@nestjs/common';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { TradeRewardStats } from '@/model/entities/trade-reward/trade-reward-stats.entity';
import { TradeRewardStatsDao } from '@/core/dao/trade-reward/trade-reward-stats-dao';
import { Account, Blockchain, Currency } from '@/model/entities';
import { TradeRewardHistoryDao } from '@/core/dao/trade-reward/trade-reward-history-dao';
import { GpDao } from '@/core/dao/gp-dao';
import { AccountGpQuest } from '@/model/entities/gp/account-gp-quest.entity';
import { QUEST_INDEX } from '@/api/v3/account-gp/constants';
import { SimpleException, SimpleJson } from '@/common/utils/simple.util';
import { TradeRewardRuleDao } from '@/core/dao/trade-reward/trade-reward-rule-dao';
import { GpOrderRewardDto } from '@/api/v3/account-gp/dto/reward.dto';
import { TradeRewardHistory } from '@/model/entities/trade-reward/trade-reward-history.entity';
import { BigNumber } from 'bignumber.js';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { AccountGpBalanceHistory } from '@/model/entities/gp/account-gp-balance-history.entity';
import { OrderQueueService } from '@/core/bull-queue/queue/order-queue.service';

@Injectable()
export class TradeRewardService {
  constructor(
    @InjectModel(AccountGpQuest)
    private accountGpQuestRepository: typeof AccountGpQuest,
    @InjectModel(TradeRewardStats)
    private tradeRewardStatsRepository: typeof TradeRewardStats,
    @InjectModel(TradeRewardHistory)
    private tradeRewardHistoryRepository: typeof TradeRewardHistory,
    @InjectModel(AccountGpBalanceHistory)
    private accountGpBalanceHistoryRepository: typeof AccountGpBalanceHistory,
    @InjectModel(Currency)
    private currencyRepository: typeof Currency,
    @InjectModel(Account)
    private accountRepository: typeof Account,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly orderQueueService: OrderQueueService,
    private readonly currencyService: CurrencyService,
    private tradeRewardRuleDao: TradeRewardRuleDao,
    private tradeRewardHistoryDao: TradeRewardHistoryDao,
    private tradeRewardStatsDao: TradeRewardStatsDao,
    private gpDao: GpDao,
  ) {}

  async accountTradeRewardStats(accountId: string) {
    const queryReferralTrade = `select account_referral.referral_id as account_id, stats.referrer_reward_gp, stats.referrer_reward_usd, account_referral.created_at as referral_date,user_accounts.username, user_accounts.avatar_url
        from account_referral left join trade_reward_stats stats on account_referral.referral_id = stats.account_id left join user_accounts on account_referral.referral_id = user_accounts.id
        where account_referral.referrer_id = :referrerId order by stats.referrer_reward_gp desc NULLS LAST`;

    const items: any[] = await this.sequelizeInstance.query(
      queryReferralTrade,
      {
        replacements: {
          referrerId: accountId,
        },
        type: QueryTypes.SELECT,
      },
    );
    const accountReferralStats = await this.findAccountReferralStats(accountId);

    return {
      ...accountReferralStats,
      // 推荐的人
      referrals: items.map((e) => ({
        accountId: e.account_id,
        avatarUrl: e.avatar_url,
        username: e.username,
        referrerRewardGp: e.referrer_reward_gp, // 推荐人奖励 usd
        referrerRewardUsd: e.referrer_reward_usd, // 推荐人奖励 gp
        eligible: e.referrer_reward_gp > 0 ? true : false, //
        referralDate: e.referral_date,
      })),
    };
  }

  async findAccountReferralStats(accountId: string) {
    const tradeStats = await this.tradeRewardStatsDao.getTradeStats(accountId);
    let referrerUsername = null;
    let referrerAvatarUrl = null;
    if (tradeStats.referrerId) {
      const referrer = await this.accountRepository.findOne({
        where: { id: tradeStats.referrerId },
      });
      referrerUsername = referrer.username;
      referrerAvatarUrl = referrer.avatarUrl;
    }
    return {
      tradeRewardUsd: tradeStats.rewardUsd, // 交易奖励 usd
      tradeRewardGp: tradeStats.rewardGp, // 交易奖励 gp
      tradeVolume: tradeStats.tradeVolume, // 交易量 usd
      referrerId: tradeStats.referrerId, // 推荐人
      referrerUsername: referrerUsername, // 推荐人 username
      referrerAvatarUrl: referrerAvatarUrl, // 推荐人 avatarUrl
      receivedReferralRewardUsd: tradeStats.receivedReferralRewardUsd, // 接收到referral reward usd
      receivedReferralRewardGp: tradeStats.receivedReferralRewardGp, // 接收到referral reward gp
      serviceFeeVolume: tradeStats.serviceFeeVolume, // 平台费
    };
  }

  /**
   * 获取 reward quest 及相关状态，包含referral reward, trade reward
   * @param accountId
   */
  async getRewardStatus(accountId: string) {
    let tradeStats;
    if (accountId) {
      tradeStats = await this.tradeRewardStatsDao.getTradeStats(accountId);
    }
    const quests = await this.accountGpQuestRepository.findAll({
      where: {
        index: [QUEST_INDEX.TRADE_REWARD, QUEST_INDEX.REFERRAL_REWARD],
      },
    });
    const res = [];

    // trade reward
    const tradeRewardQuest = quests.find(
      (e) => e.index == QUEST_INDEX.TRADE_REWARD,
    );
    if (tradeRewardQuest) {
      const rules = await this.tradeRewardRuleDao.findRulesByServiceFeeVolume(
        tradeStats.serviceFeeVolume,
        0,
      );

      res.push({
        ...tradeRewardQuest.toJSON(),
        claimable: tradeStats
          ? tradeStats.claimableTradeRewardGp > 0
          : undefined,
        tradeRewardGp: tradeStats?.rewardGp ?? undefined,
        claimableTradeRewardGp: tradeStats?.claimableTradeRewardGp ?? undefined,
        claimedTradeRewardGp: tradeStats?.claimedTradeRewardGp ?? undefined,
        args: {
          level: rules[0].rule.level,
          startVolume: rules[0].rule.tradeVolume,
          endVolume: rules[0].rule.maxTradeVolume,
          currentTradeVolume: tradeStats.tradeVolume,
        },
      });
    }

    // referral reward
    const referralRewardQuest = quests.find(
      (e) => e.index == QUEST_INDEX.REFERRAL_REWARD,
    );
    if (referralRewardQuest) {
      res.push({
        ...referralRewardQuest.toJSON(),
        claimable: tradeStats
          ? tradeStats.claimableReferralRewardGp > 0
          : undefined,
        claimableReferralRewardGp:
          tradeStats?.claimableReferralRewardGp ?? undefined,
        referrerRewardGp: tradeStats?.referrerRewardGp ?? undefined,
        receivedReferralRewardGp:
          tradeStats?.receivedReferralRewardGp ?? undefined,
        claimedReferralRewardGp:
          tradeStats?.claimedReferralRewardGp ?? undefined,
      });
    }

    return res;
  }

  async claimReferralReward(accountId: string, quest?: AccountGpQuest) {
    if (!quest) {
      quest = await this.accountGpQuestRepository.findOne({
        where: { index: QUEST_INDEX.REFERRAL_REWARD },
      });
    }
    // 先获取用户 claimableReferralRewardGp
    const tradeStats = await this.tradeRewardStatsRepository.findOne({
      where: { accountId: accountId },
    });
    const claimableReferralRewardGp = tradeStats.claimableReferralRewardGp;
    if (claimableReferralRewardGp > 0) {
      await this.gpDao.createQuestHistory({
        accountId: tradeStats.accountId,
        amount: claimableReferralRewardGp + '',
        questIndex: quest.index,
        note: quest.title,
        transactionCallback: async (t) => {
          const tradeStats = await this.tradeRewardStatsRepository.findOne({
            where: { accountId: accountId },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });
          // 检查 这期间用户 claimableReferralRewardGp 是否被修改
          if (
            tradeStats.claimableReferralRewardGp == claimableReferralRewardGp
          ) {
            tradeStats.claimableReferralRewardGp = 0;
            tradeStats.claimedReferralRewardGp =
              tradeStats.claimedReferralRewardGp + claimableReferralRewardGp;
            await tradeStats.save({ transaction: t });
          } else {
            throw Error('The claimable balance has been changed.');
          }
        },
      });
    } else {
      throw SimpleException.fail({ debug: 'The claimable balance is 0.' });
    }
    return SimpleJson.success({
      data: { gpAmount: claimableReferralRewardGp },
    });
  }

  async claimTradeReward(accountId: string, quest?: AccountGpQuest) {
    if (!quest) {
      quest = await this.accountGpQuestRepository.findOne({
        where: { index: QUEST_INDEX.TRADE_REWARD },
      });
    }
    // 先获取用户 claimableTradeRewardGp
    const tradeStats = await this.tradeRewardStatsRepository.findOne({
      where: { accountId: accountId },
    });
    const claimableTradeRewardGp = tradeStats.claimableTradeRewardGp;
    if (claimableTradeRewardGp > 0) {
      await this.gpDao.createQuestHistory({
        accountId: tradeStats.accountId,
        amount: claimableTradeRewardGp + '',
        questIndex: quest.index,
        note: quest.title,
        transactionCallback: async (t) => {
          const tradeStats = await this.tradeRewardStatsRepository.findOne({
            where: { accountId: accountId },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });
          // 检查 这期间用户 claimableTradeRewardGp 是否被修改
          if (tradeStats.claimableTradeRewardGp == claimableTradeRewardGp) {
            tradeStats.claimableTradeRewardGp = 0;
            tradeStats.claimedTradeRewardGp =
              tradeStats.claimedTradeRewardGp + claimableTradeRewardGp;
            await tradeStats.save({ transaction: t });
          } else {
            throw Error('The claimable balance has been changed.');
          }
        },
      });
    } else {
      throw SimpleException.fail({ debug: 'The claimable balance is 0.' });
    }
    return SimpleJson.success({ data: { gpAmount: claimableTradeRewardGp } });
  }

  async calOrderReward(accountId: string, dto: GpOrderRewardDto) {
    if (dto.txHash) {
      const history = await this.tradeRewardHistoryRepository.findOne({
        where: { chain: dto.chainId, txHash: dto.txHash },
      });
      if (history) {
        return {
          rewardGp: history.rewardGp,
          rewardUsd: history.rewardUsd,
        };
      }
    }

    let serviceFeeUsd = new BigNumber(0);
    for (const feeDto of dto.fees) {
      const tokenCurrency = await this.currencyRepository.findOne({
        where: {
          symbol: feeDto.symbol,
        },
        include: [
          {
            model: Blockchain,
            where: {
              chainId: dto.chainId,
            },
          },
        ],
      });
      const tokenPrice =
        await this.currencyService.getPriceByCurrency(tokenCurrency);
      console.log('tokenPrice ', tokenPrice.price);
      const feeUsd = new BigNumber(feeDto.amount)
        .shiftedBy(-tokenCurrency.decimals)
        .times(tokenPrice.price);
      serviceFeeUsd = serviceFeeUsd.plus(feeUsd);
    }
    const tradeStats = await this.tradeRewardStatsDao.getTradeStats(accountId);

    const { referrerRewardUsd, referrerRewardGp, rewardUsd, rewardGp } =
      await this.tradeRewardHistoryDao.calReward(
        tradeStats,
        serviceFeeUsd.toNumber(),
      );
    return {
      rewardGp: rewardGp,
      rewardUsd: rewardUsd,
    };
  }

  test() {
    // this.tradeRewardHistoryDao.createHistory({
    //   chainId: 137,
    //   txHash:
    //     '0x8b24f06bfe2ce0569271247765a1ff77e169089438031f76da60e6d12dfedbc0',
    //   tradePrice: 0.5,
    //   serviceFeePrice: 0.01,
    //   wallet: '0x33d11c2dd0de6bf29beaebfdf948fedf7bc3f271',
    // });
    //
    // this.tradeRewardHistoryDao.createHistory({
    //   chainId: 137,
    //   txHash:
    //     '0x1c2315aee168db488052e92ebb6871ee39296b9213900bb1371c996684f192e7',
    //   tradePrice: 2,
    //   serviceFeePrice: 0.01,
    //   wallet: '0x32304d696e52f2bbf2f71426a76af8ccf7aea99c',
    // });
    // this.gpDao.testTopUp('slider', '100');
    // this.gpDao.createQuestHistory({
    //   accountId: '6935441d-e83d-4704-b554-8a9ebadb80d0',
    //   questIndex: 1,
    //   amount: '3',
    //   note: 'test',
    // });
    // test create gp pay history
    // this.gpDao.createPaymentTransactionHistory({
    //   chainId: 8453,
    //   accountId: '6935441d-e83d-4704-b554-8a9ebadb80d0',
    //   transactionSender: '0x870b67ad5410fd1759d49ff573436ff4f14c6148',
    //   amount: '-5',
    //   args: null,
    // });
    // test refund pay
    // this.accountGpBalanceHistoryRepository
    //   .findOne({ where: { id: '5f4fcfae-2953-4715-9efc-c078525c34de' } })
    //   .then((history) => {
    //     this.gpDao.notifyRefundPaymentTransactionHistory(history);
    //   });

    this.orderQueueService.testUpdateAssetBestOrder();
    return;
  }
}
