import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '@/configuration';
import { ObjectManager } from '@filebase/sdk';

@Injectable()
export class FileBaseService {
  private readonly fileBaseKey;
  private readonly fileBaseSecret;
  private readonly fileBaseBucket;
  private readonly fileBaseGw;

  private objectManager: ObjectManager;
  constructor(public readonly configService: ConfigurationService) {
    this.fileBaseKey = this.configService.get<string>('FILEBASE_KEY');
    this.fileBaseSecret = this.configService.get<string>('FILEBASE_SECRET');
    this.fileBaseBucket = this.configService.get<string>('FILEBASE_BUCKET');
    this.fileBaseGw = this.configService.get<string>('FILEBASE_GATEWAY');

    this.objectManager = new ObjectManager(
      this.fileBaseKey,
      this.fileBaseSecret,
      { bucket: this.fileBaseBucket },
    );
  }

  async uploadObjects(key: string, arr: any[]) {
    const res = await this.objectManager.upload(key, arr, null, null);
    return res.cid;
  }
}
