import { Injectable } from '@nestjs/common';
import { AssetService } from '@/api/v3/asset/asset.service';
import { FindByFamily } from '@/api/v3/asset/asset.interface';

@Injectable()
export class AssetDataService {
  constructor(private readonly assetService: AssetService) {}

  getAssetInfo(dto: FindByFamily): Promise<any> {
    return this.assetService.getAssetDetailInfo(dto);
  }
}
