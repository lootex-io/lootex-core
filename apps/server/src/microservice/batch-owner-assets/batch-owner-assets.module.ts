import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from '@/external/queue/queue.module';
import { OwnerAssetsAppModule } from '@/microservice/batch-owner-assets/owner-assets-app.module';
import { CoreModule } from '@/core/core.module';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    QueueModule,
    OwnerAssetsAppModule,
  ],
})
export class BatchOwnerAssetsModule {}
