import {
  Controller,
  Get,
  Param,
  HttpException,
  UseInterceptors,
  Query,
} from '@nestjs/common';

import {
  ContractAssetsQueryDTO,
  ContractAssetsParamsDTO,
} from '@/api/v3/contract/contract.dto';
import { ContractService } from '@/api/v3/contract/contract.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { ContractOneResponse } from '@/api/v3/contract/contract.interface';
import { AssetList } from '@/api/v3/asset/asset.interceptor';
import { AssetListResponse } from '@/api/v3/asset/asset.interface';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Contract')
@ApiCookieAuth()
@Controller('api/v3')
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly assetService: AssetService,
  ) {}

  @Get('contracts/clean-repeat')
  async cleanRepeatContractWithAddress(): Promise<string> {
    try {
      await this.contractService.cleanRepeatContractAddress();
      return '';
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('contracts/:chainId/:contractAddress')
  async getContractInfo(
    @Param() params: ContractAssetsParamsDTO,
  ): Promise<ContractOneResponse> {
    try {
      return await this.contractService.findOne(
        params.chainId,
        params.contractAddress,
      );
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('contracts/:contractAddress/all-assets')
  @UseInterceptors(AssetList)
  async getContractAssets(
    @Query() query: ContractAssetsQueryDTO,
    @Param() params: ContractAssetsParamsDTO,
  ): Promise<AssetListResponse> {
    try {
      const { rows: existAssets, count: existAssetsTotal } =
        await this.assetService.getAssetsByContractAddress({
          ...params,
          ...query,
        });

      return {
        rows: existAssets,
        count: existAssetsTotal,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }
}
