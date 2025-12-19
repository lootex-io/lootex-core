import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  StakeParams,
  StakeParamsJson,
  StakeParamsQuantityBonusItem,
  StakeParamsTimeBonusItem,
} from '@/model/entities/stake/stake-params.entity';
import * as moment from 'moment/moment';
import { StakeRarity } from '@/model/entities/stake/stake-nft.entity';

@Injectable()
export class StakeParamsDao {
  private logger = new Logger(StakeParamsDao.name);
  private params: StakeParamsJson = null;
  private timeBonusThresholds: StakeParamsTimeBonusItem[] = [];
  private quantityBonusThresholds: StakeParamsQuantityBonusItem[] = [];
  constructor(
    @InjectModel(StakeParams)
    private stakeParamsRepository: typeof StakeParams,
  ) {
    this.loadParams();
  }

  async loadParams() {
    const _params = await this.stakeParamsRepository.findOne({
      where: { active: true },
    });

    if (_params) {
      this.params = _params.params;

      // 正序排列
      this.timeBonusThresholds = this.params.time_bonus_thresholds.sort(
        (x, y) => x.time - y.time,
      );
      this.quantityBonusThresholds = this.params.quantity_bonus_thresholds.sort(
        (x, y) => x.count - y.count,
      );
      return this.params;
    }
  }

  async getParams() {
    if (!this.params) {
      await this.loadParams();
    }
    return this.params;
  }

  getTimeBonus(stakedAt: Date, startTime: Date, endTime?: Date) {
    let timeBonus = 0;
    const nextTimeStart = moment(stakedAt)
      .add(1, this.params.time_unit)
      .startOf(this.params.time_unit);
    const diffTimes = moment(startTime).diff(
      nextTimeStart,
      this.params.time_unit,
    );

    for (let i = 0; i < this.timeBonusThresholds.length; i++) {
      const item = this.timeBonusThresholds[i];
      if (diffTimes < item.time) {
        break;
      }
      timeBonus = item.bonus;
    }
    this.logger.debug(
      `getTimeBonus stakedAt: ${stakedAt} startTime: ${startTime}, diffTimes: ${diffTimes}, timeBonus: ${timeBonus}`,
    );
    return { timeBonus, diffTimes };
  }

  getQuantityBonus(quantity: number) {
    let quantityBonus = 0;
    for (let i = 0; i < this.quantityBonusThresholds.length; i++) {
      const item = this.quantityBonusThresholds[i];
      if (quantity < item.count) {
        break;
      }
      quantityBonus = item.bonus;
    }
    this.logger.debug(
      `getQuantityBonus quantity: ${quantity}, quantityBonus: ${quantityBonus}`,
    );
    return quantityBonus;
  }

  getNextQuantityBonus(quantity: number) {
    let quantityBonus = 0;
    let currentItem: StakeParamsQuantityBonusItem = null;
    for (let i = 0; i < this.quantityBonusThresholds.length; i++) {
      const item = this.quantityBonusThresholds[i];
      if (quantity < item.count) {
        break;
      }
      currentItem = item;
      quantityBonus = item.bonus;
    }
    let nextItem = null;
    if (currentItem) {
      const index = this.quantityBonusThresholds.indexOf(currentItem);
      if (index < this.quantityBonusThresholds.length - 1) {
        nextItem = this.quantityBonusThresholds[index + 1];
      }
    } else {
      //
      nextItem = this.quantityBonusThresholds[0];
    }

    return {
      current: quantity,
      nextThreshold: nextItem?.count ?? null,
      remaining: nextItem ? nextItem.count - quantity : null,
      nextBonus: nextItem?.bonus ?? null,
    };
  }

  getRarityBonus(rarity: string) {
    rarity = this.getRarity(rarity);
    let rarityBonus = 0;
    for (const item of this.params.rarity_base_rates) {
      if (item.level == rarity) {
        rarityBonus = item.bonus;
        break;
      }
    }
    return rarityBonus;
  }

  getRarity(rarity: string): StakeRarity {
    if (this.params?.rarity_base_rates.find((e) => e.level == rarity)) {
      return rarity as StakeRarity;
    } else {
      return StakeRarity.Commemorative;
    }
  }

  getTimeUnit(): 'hour' | 'day' {
    return this.params.time_unit;
  }

  getTimeKey(): string {
    return this.params.time_key;
  }
}
