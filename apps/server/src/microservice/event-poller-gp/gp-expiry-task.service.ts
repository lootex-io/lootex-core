import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';
import { AccountGpExpiry } from '@/model/entities/gp/account-gp-expiry.entity';
import { Op } from 'sequelize';
import * as moment from 'moment';
import { FORMAT_DATETIME } from '@/common/utils';
import { GpDao } from '@/core/dao/gp-dao';
import { AccountGpBalanceHistory } from '@/model/entities/gp/account-gp-balance-history.entity';

@Injectable()
export class GpExpiryTaskService {
  constructor(
    @InjectModel(AccountGpExpiry)
    private readonly accountGpExpiryRepository: typeof AccountGpExpiry,
    @InjectModel(AccountGpBalanceHistory)
    private readonly accountGpBalanceHistoryRepository: typeof AccountGpBalanceHistory,

    private readonly gpDao: GpDao,
  ) {}

  // 每隔12小时执行, 定期清理 过期GP
  @Cron('0 0 */12 * * *')
  // @Cron('0 */5 * * * *')
  async task() {
    const logs = await this.accountGpExpiryRepository.findAll({
      where: {
        deleted: false,
        expiryTime: {
          [Op.lte]: moment().utc().format(FORMAT_DATETIME),
        },
      },
    });
    for (const log of logs) {
      await this.gpDao.notifyDeleteGpExpiry(log);
    }
  }

  // @Timeout(0)
  // handleTimeout() {
  //   this.task();
  // }
}
