import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { CoreModule } from '@/core/core.module';
import { OpenseaWsService } from '@/microservice/nft-aggregator/opensea/opensea-ws.service';
import { OpenSeaIndexService } from '@/microservice/nft-aggregator/opensea/opensea-index.service';
import { providers } from '@/model/providers';
import { LibsService } from '@/common/libs/libs.service';
import { QueueService } from '@/external/queue/queue.service';
import { OpenseaWsSdkService } from '@/microservice/nft-aggregator/opensea/opensea-ws-sdk.service';
import { AggregatorEventTaskService } from '@/microservice/nft-aggregator/service/aggregator-event-task.service';

@Module({
  imports: [
    CoreModule.forRoot({
      dbPoolMax: 80,
    }),
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature(entities),
  ],
  providers: [
    OpenseaWsService,
    OpenseaWsSdkService,
    OpenSeaIndexService,
    LibsService,
    QueueService,
    AggregatorEventTaskService,
    ...providers,
  ],
})
export class AggregatorTaskModule {}
