import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { StudioUploadService } from '@/api/v3/studio/upload/service/studio-upload.service';
import { StudioUploadController } from '@/api/v3/studio/upload/controller/studio-upload.controller';
import { JwtService } from '@nestjs/jwt';
import { QueueService } from '@/external/queue/queue.service';
import { StorageModule } from '@/external/storage/storage.module';

@Module({
  imports: [SequelizeModule.forFeature(entities), StorageModule],
  providers: [JwtService, QueueService, StudioUploadService],
  controllers: [StudioUploadController],
})
export class StudioUploadModule {}
