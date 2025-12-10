import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from '@/external/queue/queue.module';
import { AssetOwnersAppModule } from '@/microservice/batch-asset-owners/asset-owners-app.module';
import { CoreModule } from '@/core/core.module';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    QueueModule,
    AssetOwnersAppModule,
  ],
  providers: [],
})
export class BatchAssetOwnersModule {}
