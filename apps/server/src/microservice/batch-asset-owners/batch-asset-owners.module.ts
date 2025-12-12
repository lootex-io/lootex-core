import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AssetOwnersAppModule } from '@/microservice/batch-asset-owners/asset-owners-app.module';
import { CoreModule } from '@/core/core.module';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    AssetOwnersAppModule,
  ],
  providers: [],
})
export class BatchAssetOwnersModule { }
