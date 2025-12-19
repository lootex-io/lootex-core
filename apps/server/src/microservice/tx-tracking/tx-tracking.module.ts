import { providers } from '@/model/providers';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { CoreModule } from '@/core/core.module';
import { LibsService } from '@/common/libs/libs.service';
import { TxTrackingIndexService } from '@/microservice/tx-tracking/service/tx-tracking-index.service';
import { GpPayTrackingService } from '@/microservice/tx-tracking/service/gp-pay/gp-pay-tracking.service';


@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature(entities),
  ],
  controllers: [],
  providers: [
    TxTrackingIndexService,
    GpPayTrackingService,
    LibsService,
    ...providers,
    // sequelizeProvider,
  ],
})
export class TxTrackingModule { }
