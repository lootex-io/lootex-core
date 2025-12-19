import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TradeRewardStats } from '@/model/entities/trade-reward/trade-reward-stats.entity';
import { AccountReferral } from '@/model/entities';

@Injectable()
export class TradeRewardStatsDao {
  constructor(
    @InjectModel(TradeRewardStats)
    private tradeRewardStatsRepository: typeof TradeRewardStats,
    @InjectModel(AccountReferral)
    private accountReferralRepository: typeof AccountReferral,
  ) {}

  async getTradeStats(accountId: string) {
    let tradeStats = await this.tradeRewardStatsRepository.findOne({
      where: { accountId: accountId },
    });
    if (!tradeStats) {
      const referrer = await this.accountReferralRepository.findOne({
        where: { referralId: accountId },
      });
      try {
        tradeStats = await this.tradeRewardStatsRepository.create({
          accountId: accountId,
          referrerId: referrer?.referrerId ?? null,
        });
      } catch (e) {
        console.log('getTradeStats ', e.message);
        tradeStats = await this.tradeRewardStatsRepository.findOne({
          where: { accountId: accountId },
        });
      }
    }
    return tradeStats;
  }
}
