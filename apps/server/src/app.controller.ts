import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigurationService } from '@/configuration';
import { BUILD_ID_KEY } from '@/common/utils';
import { VersionResponse } from './app.interface';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly config: ConfigurationService) {}

  @Get(['', 'api/v3'])
  version(): VersionResponse {
    const ciBuildId = this.config.get(BUILD_ID_KEY, 'NOT FOUND');

    return {
      build: ciBuildId,
    };
  }
}
