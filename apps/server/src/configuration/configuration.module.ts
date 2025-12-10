import * as Joi from 'joi';
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigurationService } from '@/configuration/configuration.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath:
        process.env.NODE_ENV === 'test' ? 'configs/.env.test' : 'configs/.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .regex(/development|production|test/)
          .default('development'),
      }),
      isGlobal: true,
      cache: true,
    }),
  ],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
