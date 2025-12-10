import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GpPoolDao } from '@/core/dao/gp-pool-dao';
import { ConfigurationService } from '@/configuration';

@Injectable()
export class GpPoolTaskService {
  private readonly logger = new Logger(GpPoolTaskService.name);
  constructor(
    private readonly gpPoolDao: GpPoolDao,
    private readonly configService: ConfigurationService,
  ) {}

  /**
   * 每个月1日执行一次
   */
  @Cron('0 0 0 1 * *')
  // @Cron('*/10 * * * * *')
  async topUp() {
    const value = await this.gpPoolDao.getGpPoolValue();
    if (value < this.configService.get<number>('GP_POOL_VALUE_MAX')) {
      await this.gpPoolDao.topUp({
        amount: +this.configService.get<number>('GP_POOL_VALUE_TOP_UP'),
        accountId: null,
        note: '',
      });
    } else {
      this.logger.log(`GP Pool value exceeding the maximum value. ${value}`);
    }
  }
}
