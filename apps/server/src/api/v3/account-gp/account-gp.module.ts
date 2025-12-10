import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { AccountGpController } from '@/api/v3/account-gp/controller/account-gp.controller';
import { AccountGpService } from '@/api/v3/account-gp/service/account-gp.service';
import { JwtService } from '@nestjs/jwt';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { providers } from '@/model/providers';
import { AccountGpHistoryService } from '@/api/v3/account-gp/service/account-gp-history.service';
import { AccountGpQuestService } from '@/api/v3/account-gp/service/account-gp-quest.service';
import { AccountGpPaymentService } from '@/api/v3/account-gp/service/account-gp-payment.service';
import { AccountAdminGpService } from '@/api/v3/account-gp/service/account-admin-gp.service';
import { AccountAdminGpController } from '@/api/v3/account-gp/controller/account-admin-gp.controller';
import { GpPoolController } from '@/api/v3/account-gp/controller/gp-pool.controller';
import { GpPoolService } from '@/api/v3/account-gp/service/gp-pool.service';
import { AccountGpPaymentMutilSignatureService } from '@/api/v3/account-gp/service/account-gp-payment-mutil-signature.service';
import { TradeRewardService } from '@/api/v3/account-gp/service/trade-reward.service';
import { QueueModule } from '@/external/queue/queue.module';
import { AccountGpQuestCollectionService } from '@/api/v3/account-gp/service/collection-quest/account-gp-quest-collection.service';

@Module({
  imports: [SequelizeModule.forFeature(entities), QueueModule],
  controllers: [
    AccountGpController,
    AccountAdminGpController,
    GpPoolController,
  ],
  providers: [
    JwtService,
    AccountGpService,
    AccountGpHistoryService,
    AccountGpQuestService,
    AccountGpPaymentService,
    AccountGpPaymentMutilSignatureService,
    AccountAdminGpService,
    GpPoolService,
    CurrencyService,
    TradeRewardService,
    AccountGpQuestCollectionService,
    ...providers,
  ],
  exports: [],
})
export class AccountGpModule {}
