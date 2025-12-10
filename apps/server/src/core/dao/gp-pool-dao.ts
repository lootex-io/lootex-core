import { Inject, Injectable } from '@nestjs/common';
import { GpPoolEvent } from '@/model/entities/constant-model';
import { InjectModel } from '@nestjs/sequelize';
import { GpPool } from '@/model/entities/gp/gp-pool.entity';
import { GpPoolHistory } from '@/model/entities/gp/gp-pool-history.entity';
import { ProviderTokens } from '@/model/providers';
import { Sequelize, Transaction } from 'sequelize';
import { ConfigurationService } from '@/configuration';

@Injectable()
export class GpPoolDao {
  static EVENT_POOL_CATEGORY = 'main';
  constructor(
    @InjectModel(GpPool)
    private gpPoolRepository: typeof GpPool,
    @InjectModel(GpPoolHistory)
    private gpPoolHistoryRepository: typeof GpPoolHistory,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly configService: ConfigurationService,
  ) {
    // this.createQuestHistory('6935441d-e83d-4704-b554-8a9ebadb80d0', {
    //   point: 20,
    //   title: '',
    // });
  }

  async getGpPoolValue() {
    const gpPool = await this.gpPoolRepository.findOne({
      where: { category: GpPoolDao.EVENT_POOL_CATEGORY },
    });
    return gpPool?.value ?? 0;
  }

  async topUp(data: { amount: number; accountId?: string; note: string }) {
    const gpPool = await this.gpPoolRepository.findOne({
      where: { category: GpPoolDao.EVENT_POOL_CATEGORY },
    });
    if (!gpPool) {
      await this.gpPoolRepository.create({
        category: GpPoolDao.EVENT_POOL_CATEGORY,
        value: 0,
      });
    }
    await this.sequelizeInstance.transaction(async (t) => {
      const gpPool = await this.gpPoolRepository.findOne({
        where: { category: GpPoolDao.EVENT_POOL_CATEGORY },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      gpPool.value = gpPool.value + data.amount;
      await gpPool.save({ transaction: t });
      await this.gpPoolHistoryRepository.create(
        {
          event: GpPoolEvent.TOP_UP,
          amount: data.amount,
          poolValue: gpPool.value,
          accountId: data.accountId,
          note: data.note,
        },
        { transaction: t },
      );
    });
  }

  async alertSlackMessage(data: { value: number }) {
    const message = [
      `*GP Pool insufficient* :alert:`,
      `Current value: ${data.value}`,
      `Time: ${new Date()}`,
    ].join('\n');
    // console.log(`sendMessage ${message}`);
  }

  async createQuestHistory(
    accountId: string,
    quest: { point: number; title: string },
    option?: { t: Transaction },
  ) {
    const exec = async (t) => {
      const gpPool = await this.gpPoolRepository.findOne({
        where: { category: GpPoolDao.EVENT_POOL_CATEGORY },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (gpPool.value >= quest.point) {
        gpPool.value = gpPool.value - quest.point;
        await gpPool.save({ transaction: t });
        await this.gpPoolHistoryRepository.create(
          {
            event: GpPoolEvent.QUEST,
            amount: -quest.point,
            poolValue: gpPool.value,
            accountId: accountId,
            note: quest.title,
          },
          { transaction: t },
        );
        if (
          gpPool.value <= this.configService.get<number>('GP_POOL_VALUE_ALERT')
        ) {
          await this.alertSlackMessage({ value: gpPool.value });
        }
      } else {
        await this.alertSlackMessage({ value: gpPool.value });
        throw new Error('GP Pool insufficient');
      }
    };
    if (option?.t) {
      await exec(option.t);
    } else {
      await this.sequelizeInstance.transaction(async (t) => await exec(t));
    }
  }
}
