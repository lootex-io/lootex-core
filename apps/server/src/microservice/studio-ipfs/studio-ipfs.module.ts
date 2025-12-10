import { Module } from '@nestjs/common';
import { CoreModule } from '@/core/core.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { StudioIpfsService } from '@/microservice/studio-ipfs/studio-ipfs.service';
import { StorageModule } from '@/external/storage/storage.module';
import { QueueService } from '@/external/queue/queue.service';
import { providers } from '@/model/providers';

@Module({
  imports: [
    CoreModule.forRoot({
      dbPoolMax: 5,
    }),
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature(entities),
    StorageModule,
  ],
  providers: [QueueService, StudioIpfsService, ...providers],
  exports: [StudioIpfsService],
})
export class StudioIpfsModule {}
