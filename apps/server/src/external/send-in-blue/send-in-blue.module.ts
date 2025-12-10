import { Module } from '@nestjs/common';
import { SendInBlueService } from './send-in-blue.service';
import { ConfigurationService } from '@/configuration';

@Module({
  providers: [
    SendInBlueService,
    {
      provide: 'SENDINBLUE_KEY',
      inject: [ConfigurationService],
      useFactory: async (config: ConfigurationService) => {
        return config.get('SENDINBLUE_KEY');
      },
    },
  ],
  exports: [SendInBlueService],
})
export class SendInBlueModule {}
