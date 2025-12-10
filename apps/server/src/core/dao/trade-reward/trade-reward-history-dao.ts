import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Account, AccountReferral, Wallet } from '@/model/entities';
import { ProviderTokens } from '@/model/providers';
import { QueryTypes, Sequelize } from 'sequelize';
import { TradeRewardStats } from '@/model/entities/trade-reward/trade-reward-stats.entity';
import { TradeRewardRuleDao } from '@/core/dao/trade-reward/trade-reward-rule-dao';
import { ConfigService } from '@nestjs/config';
import { BigNumber } from 'bignumber.js';
import { TradeRewardHistory } from '@/model/entities/trade-reward/trade-reward-history.entity';
import { TradeRewardStatsDao } from '@/core/dao/trade-reward/trade-reward-stats-dao';
import { CacheService } from '@/common/cache';
import { GpDao } from '@/core/dao/gp-dao';
import { SdkEnvService } from '@/core/sdk/service/sdk-env.service';
import { SdkEnv } from '@/core/sdk/constants/env-constants';

@Injectable()
export class TradeRewardHistoryDao {
  private readonly referralRewardVolumeMax; // 最多500 u referral reward
  private logger = new Logger(TradeRewardHistoryDao.name);
  constructor(
    @InjectModel(TradeRewardStats)
    private tradeRewardStatsRepository: typeof TradeRewardStats,
    @InjectModel(TradeRewardHistory)
    private tradeRewardHistoryRepository: typeof TradeRewardHistory,
    @InjectModel(AccountReferral)
    private accountReferralRepository: typeof AccountReferral,
    @InjectModel(Account)
    private accountRepository: typeof Account,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly tradeRewardRuleDao: TradeRewardRuleDao,
    private readonly tradeRewardStatsDao: TradeRewardStatsDao,
    private readonly gpDao: GpDao,
    private readonly sdkEnvService: SdkEnvService,
  ) {
    this.referralRewardVolumeMax = parseInt(
      this.configService.get<string>('GP_REFERRER_REWARD_VOLUME_MAX'),
    );

    // this.createHistory({
    //   chainId: 137,
    //   txHash:
    //     '0x1c2315aee168db488052e92ebb6871ee39296b9213900bb1371c996684f192e7',
    //   seaportId: '569423ba-85bc-4da7-a199-0c63a9a50fc2',
    //   tradePrice: 2,
    //   serviceFeePrice: 0.09115519,
    //   wallet: '0x32304d696e52f2bbf2f71426a76af8ccf7aea99c',
    // });

    //
    // this.getReceivedReferralRewardUsd(
    //   '56797655-50cd-4698-8a02-7359ce888bc0',
    // ).then((res) => console.log(res));

    // this.testDeleteHistory([
    //   '750b3c0c-3978-49c0-8e0c-513bb14a3c6d',
    //   '8cbbda9f-c223-4199-8473-74962e04ff4a',
    //   'd80a7bf9-d86d-4a31-9076-b0929bbef482',
    // ]);
  }

  async createHistory(params: {
    txHash: string;
    chainId: number;
    wallet: string;
    serviceFeePrice: number; // usd price
    tradePrice: number; // usd price
  }) {
    this.logger.debug(
      `createTradeRewardHistory:${params.chainId}:${params.txHash}`,
    );
    // 避免30s重複執行相同事件可能造成並發修改錯誤
    const eventKey = `createTradeRewardHistory:${params.chainId}:${params.txHash}`;
    if (await this.cacheService.getCache(eventKey)) {
      this.logger.log(
        `createTradeRewardHistory:${params.chainId}:${params.txHash} have been handled`,
      );
      return;
    } else {
      await this.cacheService.setCache(eventKey, 30);
    }

    const history = await this.tradeRewardHistoryRepository.findOne({
      where: {
        chain: params.chainId,
        txHash: params.txHash,
      },
    });
    if (history) {
      this.logger.log(
        `createHistory trade reward history exist, skip. ${params.chainId}-${params.txHash}`,
      );
      return;
    }
    const account = await this.accountRepository.findOne({
      subQuery: false,
      attributes: ['id'],
      include: [
        {
          model: Wallet,
          where: { address: params.wallet.toLowerCase() },
          attributes: ['id'],
        },
      ],
    });

    if (account && (params.serviceFeePrice ?? 0) > 0) {
      const accountTradeStats = await this.tradeRewardStatsDao.getTradeStats(
        account.id,
      );
      if (accountTradeStats.referrerId) {
        await this.tradeRewardStatsDao.getTradeStats(
          accountTradeStats.referrerId,
        );
      }

      this.logger.debug(
        `accountTradeStats accountId ${accountTradeStats.accountId} referrerId ${accountTradeStats.referrerId}`,
      );
      await this.sequelizeInstance.transaction(async (t) => {
        // 在修改记录之前，先锁定需要修改的行，避免其他事务干扰
        const lockAccounts = [account.id];
        if (accountTradeStats.referrerId) {
          lockAccounts.push(accountTradeStats.referrerId);
        }
        await this.tradeRewardStatsRepository.findAll({
          where: { accountId: lockAccounts },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        const tradeStats = await this.tradeRewardStatsRepository.findOne({
          where: { accountId: account.id },
          transaction: t,
        });
        const { referrerRewardUsd, referrerRewardGp, rewardUsd, rewardGp } =
          await this.calReward(tradeStats, params.serviceFeePrice);

        if (accountTradeStats.referrerId) {
          //update referrer received reward
          const referrerTradeStats =
            await this.tradeRewardStatsRepository.findOne({
              where: { accountId: accountTradeStats.referrerId },
              transaction: t,
            });

          referrerTradeStats.receivedReferralRewardUsd = new BigNumber(
            referrerTradeStats.receivedReferralRewardUsd,
          )
            .plus(referrerRewardUsd)
            .toNumber();
          referrerTradeStats.receivedReferralRewardGp = new BigNumber(
            referrerTradeStats.receivedReferralRewardGp,
          )
            .plus(referrerRewardGp)
            .toNumber();
          referrerTradeStats.claimableReferralRewardGp =
            referrerTradeStats.claimableReferralRewardGp + referrerRewardGp;
          await referrerTradeStats.save({ transaction: t });
        }

        const data = {
          chain: params.chainId,
          accountId: account.id,
          accountLastVolume: tradeStats.tradeVolume,
          accountVolume: new BigNumber(tradeStats.tradeVolume)
            .plus(params.tradePrice)
            .toNumber(),
          wallet: params.wallet.toLowerCase(),
          tradePrice: params.tradePrice,
          serviceFeePrice: params.serviceFeePrice,
          referrerId: accountTradeStats.referrerId,
          referrerRewardUsd: referrerRewardUsd.toNumber(),
          referrerRewardGp: referrerRewardGp,
          rewardUsd: rewardUsd.toNumber(),
          rewardGp: rewardGp,
          txHash: params.txHash,
        };
        tradeStats.tradeVolume = new BigNumber(tradeStats.tradeVolume)
          .plus(params.tradePrice)
          .toNumber();
        tradeStats.serviceFeeVolume = new BigNumber(tradeStats.serviceFeeVolume)
          .plus(params.serviceFeePrice)
          .toNumber();
        tradeStats.rewardUsd = new BigNumber(tradeStats.rewardUsd)
          .plus(rewardUsd)
          .toNumber();
        tradeStats.rewardGp = tradeStats.rewardGp + rewardGp;
        tradeStats.claimableTradeRewardGp =
          tradeStats.claimableTradeRewardGp + rewardGp;
        tradeStats.referrerRewardUsd = new BigNumber(
          tradeStats.referrerRewardUsd,
        )
          .plus(referrerRewardUsd)
          .toNumber();
        tradeStats.referrerRewardGp = new BigNumber(tradeStats.referrerRewardGp)
          .plus(referrerRewardGp)
          .toNumber();

        console.log('data ', data);
        await this.tradeRewardHistoryRepository.create(data, {
          transaction: t,
        });
        await tradeStats.save({ transaction: t });
        // 给 referrer 账户(推荐人)充值 referral reward
        // if (referrerRewardGp > 0) {
        //   await this.gpDao.createReferralRewardHistory({
        //     chainId: params.chainId,
        //     accountId: accountTradeStats.referrerId,
        //     gpAmount: referrerRewardGp + '',
        //     txHash: params.txHash,
        //   });
        // }
        // 给 account 账户(购买者)充值 trade reward
        // if (rewardGp > 0) {
        //   await this.gpDao.createTradeRewardHistory({
        //     chainId: params.chainId,
        //     accountId: accountTradeStats.accountId,
        //     gpAmount: rewardGp + '',
        //     txHash: params.txHash,
        //   });
        // }
      });
    }
  }

  async calReward(tradeStats: TradeRewardStats, serviceFeeUsd: number) {
    let referrerRewardUsd: BigNumber = new BigNumber(0);
    let referrerRewardGp = 0;
    let rewardUsd: BigNumber = new BigNumber(0);
    let rewardGp = 0;

    const rules = await this.tradeRewardRuleDao.findRulesByServiceFeeVolume(
      tradeStats.serviceFeeVolume,
      serviceFeeUsd,
    );
    // 计算多级价格
    for (const rule of rules) {
      rewardUsd = rewardUsd.plus(
        new BigNumber(rule.volume).times(rule.rule.tradeRewardRate),
      );
      // 单人最多500u
      if (tradeStats.referrerRewardUsd < this.referralRewardVolumeMax) {
        let _referrerRewardUsd = new BigNumber(rule.volume).times(
          rule.rule.referrerRewardRate,
        );
        // 最后超过， 500u - tradeStats.referrerRewardUsd
        if (
          new BigNumber(tradeStats.referrerRewardUsd).plus(_referrerRewardUsd) >
          this.referralRewardVolumeMax
        ) {
          _referrerRewardUsd = new BigNumber(
            this.referralRewardVolumeMax,
          ).minus(tradeStats.referrerRewardUsd);
        }
        referrerRewardUsd = referrerRewardUsd.plus(_referrerRewardUsd);
      }
    }

    const rateGpUsd = await this.sdkEnvService.getNumber(
      SdkEnv.GP_EXCHANGE_GP_USD,
    );
    rewardGp = Math.floor(
      new BigNumber(rewardUsd).dividedBy(rateGpUsd).toNumber(),
    );
    referrerRewardGp = Math.floor(
      new BigNumber(referrerRewardUsd).dividedBy(rateGpUsd).toNumber(),
    );

    return { rewardGp, rewardUsd, referrerRewardGp, referrerRewardUsd };
  }

  async getReceivedReferralRewardUsd(referrerId: string) {
    const sql = `select sum(referrer_reward_usd::numeric) from trade_reward_history where referrer_id = :referrerId`;
    const res: any[] = await this.sequelizeInstance.query(sql, {
      replacements: {
        referrerId: referrerId,
      },
      type: QueryTypes.SELECT,
    });
    if (res && res.length > 0) {
      return res[0].sum;
    }
    return 0;
  }

  async getReceivedReferralRewardGp(referrerId: string) {
    const sql = `select sum(referrer_reward_gp) from trade_reward_history where referrer_id = :referrerId`;
    const res: any[] = await this.sequelizeInstance.query(sql, {
      replacements: {
        referrerId: referrerId,
      },
      type: QueryTypes.SELECT,
    });
    if (res && res.length > 0) {
      return res[0].sum;
    }
    return 0;
  }

  /**
   * 移除 trade reward history
   * @param historyIds
   */
  async testDeleteHistory(historyIds: string[]) {
    for (const historyId of historyIds) {
      const history = await this.tradeRewardHistoryRepository.findOne({
        where: { id: historyId },
      });
      if (history) {
        await this.sequelizeInstance.transaction(async (t) => {
          // 在修改记录之前，先锁定需要修改的行，避免其他事务干扰
          const lockAccounts = [history.accountId];
          if (history.referrerId) {
            lockAccounts.push(history.referrerId);
          }
          await this.tradeRewardStatsRepository.findAll({
            where: { accountId: lockAccounts },
            lock: t.LOCK.UPDATE,
            transaction: t,
          });

          const tradeStats = await this.tradeRewardStatsRepository.findOne({
            where: { accountId: history.accountId },
            transaction: t,
          });
          tradeStats.tradeVolume = new BigNumber(tradeStats.tradeVolume)
            .minus(history.tradePrice)
            .toNumber();
          tradeStats.serviceFeeVolume = new BigNumber(
            tradeStats.serviceFeeVolume,
          )
            .minus(history.serviceFeePrice)
            .toNumber();
          tradeStats.rewardUsd = new BigNumber(tradeStats.rewardUsd)
            .minus(history.rewardUsd)
            .toNumber();
          tradeStats.rewardGp = tradeStats.rewardGp - history.rewardGp;
          tradeStats.claimableTradeRewardGp =
            tradeStats.claimableTradeRewardGp - history.rewardGp;
          tradeStats.referrerRewardUsd = new BigNumber(
            tradeStats.referrerRewardUsd,
          )
            .minus(history.referrerRewardUsd)
            .toNumber();
          tradeStats.referrerRewardGp = new BigNumber(
            tradeStats.referrerRewardGp,
          )
            .minus(history.referrerRewardGp)
            .toNumber();

          await tradeStats.save({ transaction: t });
          if (history.referrerId) {
            //update referrer received reward
            const referrerTradeStats =
              await this.tradeRewardStatsRepository.findOne({
                where: { accountId: history.referrerId },
                transaction: t,
              });

            referrerTradeStats.receivedReferralRewardUsd = new BigNumber(
              referrerTradeStats.receivedReferralRewardUsd,
            )
              .minus(history.referrerRewardUsd)
              .toNumber();
            referrerTradeStats.receivedReferralRewardGp = new BigNumber(
              referrerTradeStats.receivedReferralRewardGp,
            )
              .minus(history.referrerRewardGp)
              .toNumber();
            referrerTradeStats.claimableReferralRewardGp =
              referrerTradeStats.claimableReferralRewardGp -
              history.referrerRewardGp;
            await referrerTradeStats.save({ transaction: t });
          }
          await history.destroy({ transaction: t });
        });
        console.log(`testDeleteHistory ${historyId} success`);
      }
    }
  }
}
