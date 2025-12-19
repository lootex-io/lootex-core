import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AssetMetadataAppModule } from '@/microservice/batch-asset-metadata/asset-metadata-app.module';
import { CoreModule } from '@/core/core.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';

@Module({
  imports: [
    CoreModule.forRoot(),
    SequelizeModule.forFeature(entities),
    AssetMetadataAppModule,
  ],
  providers: [],
})
export class BatchAssetMetadataModule { }
