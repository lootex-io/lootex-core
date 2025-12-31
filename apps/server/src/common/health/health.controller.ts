import { Controller, Inject, Get } from '@nestjs/common';
import {
  HealthCheckService,
  SequelizeHealthIndicator,
  HealthCheck,
  MicroserviceHealthIndicator,
  HealthIndicatorFunction,
} from '@nestjs/terminus';
import { RedisOptions, Transport } from '@nestjs/microservices';

@Controller('health')
export class HealthController {
  private healthCheckList: HealthIndicatorFunction[] = [];

  constructor(
    @Inject('DB_CHECK_ENABLED') private dbCheck: boolean,
    @Inject('REDIS_CHECK_ENABLED') private redisCheck: boolean,
    @Inject('REDIS_HOST') private redisHost: string,
    @Inject('REDIS_PORT') private redisPort: number,
    @Inject('REDIS_PASSWORD') private redisPassword: string,

    private health: HealthCheckService,
    private sequelize: SequelizeHealthIndicator,
    private microservice: MicroserviceHealthIndicator,
  ) {
    if (this.dbCheck) {
      this.healthCheckList.push(() => this.sequelize.pingCheck('sequelize'));
    }
    if (this.redisCheck) {
      this.healthCheckList.push(() =>
        this.microservice.pingCheck<RedisOptions>('redis', {
          transport: Transport.REDIS,
          options: {
            host: this.redisHost,
            port: this.redisPort,
            password: this.redisPassword,
          },
        }),
      );
    }
  }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check(this.healthCheckList);
  }
}
