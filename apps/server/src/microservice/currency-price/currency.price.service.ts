import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import { CurrencyService as ThridPartyCurrencyService } from '@/core/third-party-api/currency/currency.service';

@Injectable()
export class CurrencyTasksService {
  private readonly logger = new Logger(CurrencyTasksService.name);

  constructor(
    private readonly thirdPartyCurrencyService: ThridPartyCurrencyService,
  ) { }

  @Cron('0 * * * * *')
  async handleCron() {
    this.logger.debug('called per 60 seconds');
    await this.thirdPartyCurrencyService.updateAllPriceToCacheByMulticall();
  }

  // 10m record once

  @Timeout(0)
  async handleTimeout() {
    this.logger.debug('Called once start');
    await this.thirdPartyCurrencyService.updateAllPriceToCacheByMulticall();
  }
}
