import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '@/configuration';

@Injectable()
export class SmallLogService {
  constructor(
    private readonly configService: ConfigurationService,
  ) { }

  async log(type: string, action: string, args: { [key: string]: any }) {
    return;
  }

  async apiLog(data: any) {
    return;
  }
}
