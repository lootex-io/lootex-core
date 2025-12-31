import {
  IsString,
  IsBoolean,
  IsNumber,
  IsInt,
  Max,
  Min,
  IsArray,
  IsOptional,
  ValidateNested,
  IsEthereumAddress,
  isEthereumAddress,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ChainId, ExternalLink } from '@/common/utils/types';
import { ApiProperty } from '@nestjs/swagger';
import { ChainShortNameEnum } from '@/model/entities';
import { queryLimit } from '@/common/utils/utils.pure';
import { TimeRange } from './collection.interface';

export class CollectionCreateDTO {
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

export class CollectionUpdateDTO {
  @ApiProperty()
  @IsString()
  chainId: ChainId;

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
  @IsString()
  bannerImageUrl: string;

  @ApiProperty()
  @IsString()
  logoImageUrl: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  featuredImageUrl: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  featuredVideoUrl: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false, type: [ExternalLink] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalLink)
  externalLinks?: ExternalLink[];

  @ApiProperty()
  @IsBoolean()
  isVerified: boolean;

  @ApiProperty()
  @IsBoolean()
  isSensitive: boolean;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  @Min(0)
  serviceFee: number;

  @ApiProperty()
  @IsNumber()
  @Max(100)
  @Min(0)
  creatorFee: number;

  @ApiProperty()
  @Transform(({ value: officialAddress }) => {
    if (isEthereumAddress(officialAddress) || '')
      return officialAddress.toLowerCase();
    return '';
  })
  @IsOptional()
  officialAddress?: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isCreatorFee: boolean;

  @ApiProperty()
  @IsOptional()
  @IsEthereumAddress()
  @Transform(({ value: creatorFeeAddress }) => {
    return creatorFeeAddress.toLowerCase();
  })
  creatorFeeAddress: string;
}

export class CollectionParamsDTO {
  @ApiProperty()
  @IsString()
  slug: string;
}

export class CollectionsParamsDTO {
  @ApiProperty()
  @IsArray()
  slugs: string[];
}

export class CollectionAssetsDTO {
  @ApiProperty()
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

export class CollectionListSortQuery {
  //
}
export class CollectionListQueryDTO {
  @ApiProperty()
  @IsString()
  @IsOptional()
  username: string;

  @ApiProperty()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  @IsOptional()
  @IsEthereumAddress()
  contractAddress: string;

  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  holderUsername: string;

  @IsOptional()
  @IsString()
  chainShortName: ChainShortNameEnum;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  force: boolean;

  @ApiProperty({ default: 10 })
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

export class GetTradingBoardDTO {
  @ApiProperty()
  @IsString()
  @IsOptional()
  chainId: ChainId;

  @ApiProperty()
  @IsString()
  timeRange: TimeRange;

  @ApiProperty({ default: 10 })
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

  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isAllCollection?: boolean;
}
