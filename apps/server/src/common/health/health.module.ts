import { Module, DynamicModule, Provider } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import {
  HealthModuleAsyncOptions,
  HealthModuleOptions,
  HEALTH_MODULE_OPTIONS,
} from './health.interface';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {
  static forRootAsync(options: HealthModuleAsyncOptions): DynamicModule {
    const asyncProvider = this.createAsyncOptionsProvider(options);

    return {
      module: HealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        asyncProvider,
        {
          provide: 'DB_CHECK_ENABLED',
          useFactory: (healthOptions: HealthModuleOptions) => {
            return healthOptions?.db?.enabled;
          },
          inject: [HEALTH_MODULE_OPTIONS],
        },
        {
          provide: 'REDIS_CHECK_ENABLED',
          useFactory: (healthOptions: HealthModuleOptions) => {
            return healthOptions?.redis?.enabled;
          },
          inject: [HEALTH_MODULE_OPTIONS],
        },
        {
          provide: 'REDIS_HOST',
          useFactory: (healthOptions: HealthModuleOptions) => {
            return healthOptions?.redis?.host;
          },
          inject: [HEALTH_MODULE_OPTIONS],
        },
        {
          provide: 'REDIS_PORT',
          useFactory: (healthOptions: HealthModuleOptions) => {
            return healthOptions?.redis?.port;
          },
          inject: [HEALTH_MODULE_OPTIONS],
        },
        {
          provide: 'REDIS_PASSWORD',
          useFactory: (healthOptions: HealthModuleOptions) => {
            return healthOptions?.redis?.password;
          },
          inject: [HEALTH_MODULE_OPTIONS],
        },
      ],
    };
  }

  private static createAsyncOptionsProvider(
    options: HealthModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: HEALTH_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
  }
}
