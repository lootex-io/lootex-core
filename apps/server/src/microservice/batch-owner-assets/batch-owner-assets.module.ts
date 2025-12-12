import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OwnerAssetsAppModule } from '@/microservice/batch-owner-assets/owner-assets-app.module';
import { CoreModule } from '@/core/core.module';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    OwnerAssetsAppModule,
  ],
})
export class BatchOwnerAssetsModule { }
