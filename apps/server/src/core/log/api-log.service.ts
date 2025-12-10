import { Injectable } from '@nestjs/common';
import { SmallLogService } from '@/core/small-db/small-log.service';

@Injectable()
export class ApiLogService {
  constructor(private smallLogService: SmallLogService) {}
  async log({
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
    await this.smallLogService.apiLog({
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
