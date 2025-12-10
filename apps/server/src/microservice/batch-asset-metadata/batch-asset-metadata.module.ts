import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueModule } from '@/external/queue/queue.module';
import { AssetMetadataAppModule } from '@/microservice/batch-asset-metadata/asset-metadata-app.module';
import { CoreModule } from '@/core/core.module';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    QueueModule,
    AssetMetadataAppModule,
  ],
  providers: [],
})
export class BatchAssetMetadataModule {}
