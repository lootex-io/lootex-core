import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConfigurationService {
  constructor(private readonly configService: ConfigService) {}

  get<T = string>(key: string, defaultValue?: T): T {
    const value = this.configService.get<T>(key) || defaultValue;

    return value;
  }
}
