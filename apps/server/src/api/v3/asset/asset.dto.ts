import {
  IsEthereumAddress,
  IsInt,
  IsString,
  IsNumberString,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ChainId } from '@/common/utils/types';
import { ApiProperty } from '@nestjs/swagger';
import { queryLimit } from '@/common/utils/utils.pure';

export class TraitsQuery {
  @IsString()
  traitType: string;

  @IsString()
  value: string;
}
export class AssetListQueryDTO {
  @ApiProperty()
  @IsOptional()
  @Transform(({ value: ownerAddress }) => {
    return ownerAddress.toLowerCase();
  })
  @IsString()
  @IsEthereumAddress()
  ownerAddress: string;

  @ApiProperty({ default: 1 })
  @IsString()
  chainId: ChainId;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  collectionSlug?: string;

  @ApiProperty({ default: 50 })
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;

  @Transform(({ value: traits }) => {
    return JSON.parse(traits);
  })
  @IsOptional()
  traits: TraitsQuery[];
}

export class AssetMeQueryDTO {
  @ApiProperty({ default: 1 })
  @IsString()
  chainId: ChainId;

  @ApiProperty({ default: 50 })
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;
}

export class AssetParamsDTO {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ default: 50 })
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsOptional()
  @IsInt()
  limit: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  @IsOptional()
  page: number;
}

export class AssetChainFamilyParamsDTO {
  @ApiProperty()
  @IsString()
  chainShortName: string;

  @ApiProperty()
  @IsEthereumAddress()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  contractAddress: string;

  @ApiProperty()
  @IsNumberString()
  tokenId: string;
}

export class SyncAssetsByContractParamsDTO {
  @ApiProperty()
  @IsString()
  chainShortName: string;

  @ApiProperty()
  @IsEthereumAddress()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  contractAddress: string;
}

export class AssetMetaDataUpdateQueryDTO {
  @ApiProperty()
  @IsEthereumAddress()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  contractAddress: string;

  @ApiProperty()
  @IsNumberString()
  tokenId: string;

  @ApiProperty()
  @IsString()
  chainId: string;
}

export class GetAssetsByUsernameParamsDTO {
  @ApiProperty()
  @IsString()
  username: string;
}

export class GetAssetsByUsernameQueryDTO {
  @ApiProperty()
  @IsString()
  @IsOptional()
  chainId: ChainId;

  @ApiProperty({ default: 50 })
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;
}

export class AssetUserHoldingQueryDTO {
  @ApiProperty()
  @IsEthereumAddress()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  contractAddress: string;

  @ApiProperty()
  @IsNumberString()
  tokenId: string;

  @ApiProperty()
  @IsOptional()
  @Transform(({ value: ownerAddress }) => {
    return ownerAddress.toLowerCase();
  })
  @IsString()
  @IsEthereumAddress()
  ownerAddress: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  username: string;

  @ApiProperty()
  @IsString()
  chainId: string;
}

export class AssetCountDTO {
  @ApiProperty()
  @IsString()
  username: string;
}

export class FeatchAssetsDTO {
  @ApiProperty()
  @IsString()
  username: string;
}

export class SyncCollectionDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  chainId: string;

  @ApiProperty()
  @IsEthereumAddress()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  @IsNotEmpty()
  contractAddress: string;

  @ApiProperty({
    default: false,
    description:
      '默认false. \nforce == true，表示不管原本有沒有 metadata 都強迫刷新\n' +
      '\n' +
      'force == false，表示只刷新沒有 metadata or metadata 為空的 asset',
    required: false,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  force = false;

  @ApiProperty({
    description: '刷新asset的个数, 不传代表全部',
    required: false,
  })
  @IsInt()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  assetNum;

  @ApiProperty({
    default: false,
    description: '默认false, 是否取消',
    required: false,
  })
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  cancel = false;
}
