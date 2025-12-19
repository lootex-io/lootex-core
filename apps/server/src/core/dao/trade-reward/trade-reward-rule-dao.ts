import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TradeRewardRule } from '@/model/entities/trade-reward/trade-reward-rule.entity';

@Injectable()
export class TradeRewardRuleDao {
  private rules: TradeRewardRule[] = [];
  constructor(
    @InjectModel(TradeRewardRule)
    private tradeRewardRuleRepository: typeof TradeRewardRule,
  ) {
    // test
    // this.findRulesByServiceFeeVolume(200, 21000).then((res) => {
    //   console.log(
    //     res.map((e) => ({
    //       i: e.i,
    //       volume: e.volume,
    //       serviceFee: e.rule.serviceFee,
    //     })),
    //   );
    //   console.log(`sum ${sum(res.map((e) => e.volume))}`);
    // });
  }

  async _loadRules() {
    this.rules = await this.tradeRewardRuleRepository.findAll({
      order: [['trade_volume', 'asc']],
    });
  }

  /**
   * 根据 serviceFee 获取相应的计算规则
   * @param startServiceFee
   * @param serviceFee
   */
  async findRulesByServiceFeeVolume(
    startServiceFee: number,
    serviceFee: number,
  ): Promise<{ i: number; volume: number; rule: TradeRewardRule }[]> {
    if (!this.rules || this.rules.length === 0) {
      await this._loadRules();
    }
    const res = [];
    let leftVolume = serviceFee;
    if (this.rules && this.rules.length > 0) {
      const size = this.rules.length;
      for (let i = 0; i < size; i++) {
        const rule = this.rules[i];
        const minVolume = rule.serviceFee;
        const maxVolume =
          i >= size - 1 ? Number.MAX_VALUE : this.rules[i + 1].serviceFee;
        // console.log(`[${minVolume}, ${maxVolume}]`);
        if (startServiceFee >= minVolume && startServiceFee < maxVolume) {
          if (i < size - 1) {
            // const nextRuleVolume = this.rules[i + 1].tradeVolume;
            if (startServiceFee + leftVolume <= maxVolume) {
              res.push({ i: i, volume: leftVolume, rule: rule.toJSON() });
              break;
            } else {
              const v = maxVolume - startServiceFee;
              res.push({ i: i, volume: v, rule: rule.toJSON() });
              leftVolume = leftVolume - v;
              startServiceFee = maxVolume;
            }
          } else {
            res.push({ i: i, volume: leftVolume, rule: rule.toJSON() });
            break;
          }
        }
      }
    }
    return res;
  }
}
