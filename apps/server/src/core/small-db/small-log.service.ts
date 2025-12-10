import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DB_SMALL_NAME } from '@/core/small-db/small-constants';
import { LogDev, LogPro } from '@/model-small/entities/log.entity';
import { NODE_ENV, NODE_ENV_PRODUCTION } from '@/common/utils';
import { ConfigurationService } from '@/configuration';
import { ApiLogDev, ApiLogPro } from '@/model-small/entities/api-log.entity';

@Injectable()
export class SmallLogService {
  constructor(
    @InjectModel(LogDev, DB_SMALL_NAME)
    private readonly logDevRepository: typeof LogDev,
    @InjectModel(LogPro, DB_SMALL_NAME)
    private readonly logProRepository: typeof LogPro,

    @InjectModel(ApiLogDev, DB_SMALL_NAME)
    private readonly apiLogDevRepository: typeof ApiLogDev,
    @InjectModel(ApiLogPro, DB_SMALL_NAME)
    private readonly apiLogProRepository: typeof ApiLogPro,

    private readonly configService: ConfigurationService,
  ) {}

  private getLogRepository() {
    if (this.configService.get<string>(NODE_ENV) === NODE_ENV_PRODUCTION) {
      return this.logProRepository;
    } else {
      return this.logDevRepository;
    }
  }

  async log(type: string, action: string, args: { [key: string]: any }) {
    await this.getLogRepository().create({
      type: type,
      action: action,
      args: args,
    });
  }

  private getApiLogRepository() {
    if (this.configService.get<string>(NODE_ENV) === NODE_ENV_PRODUCTION) {
      return this.apiLogProRepository;
    } else {
      return this.apiLogDevRepository;
    }
  }

  async apiLog({
    method,
    statusCode,
    url,
    params,
    query,
    body,
    ip,
    area,
    startTime,
    responseTime,
    duration,
    lootexUsername,
    apiKey,
    errorMessage,
  }: {
    method: string;
    statusCode: number;
    url: string;
    params: any;
    query: any;
    body: any;
    ip: string;
    area: string;
    startTime: Date;
    responseTime: Date;
    duration: number;
    lootexUsername: string;
    apiKey: string;
    errorMessage: string;
  }) {
    await this.getApiLogRepository().create({
      method,
      statusCode,
      url,
      params,
      query,
      body,
      ip,
      area,
      startTime,
      responseTime,
      duration,
      lootexUsername,
      apiKey,
      errorMessage,
    });
  }
}
