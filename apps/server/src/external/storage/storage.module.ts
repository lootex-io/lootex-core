import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigurationModule, ConfigurationService } from '@/configuration';

@Module({
  imports: [ConfigurationModule],
  providers: [StorageService, ConfigurationService],
  exports: [StorageService],
})
export class StorageModule {}
