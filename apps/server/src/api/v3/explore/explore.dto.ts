import { TraitsQuery } from './../asset/asset.dto';
import { Category } from '@/api/v3/order/order.interface';
import {
  IsArray,
  IsInt,
  IsString,
  IsOptional,
  IsNumberString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

import { ChainId } from '@/common/utils/types';
import { queryLimit } from '@/common/utils/utils.pure';

export class keywordsBaseQueryDTO {
  @ApiProperty()
  @IsOptional()
  @Transform(({ value: keywords }) => {
    keywords = keywords.trim();
    return keywords === ''
      ? []
      : keywords.split(',').map((keyword: string) => {
          return keyword.trim();
        });
  })
  @IsArray()
  keywords: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  readonly priceMin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  readonly priceMax?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  readonly priceSymbol?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  readonly platformType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  readonly orderStatus?: Category[];

  @Transform(({ value: traits }) => {
    return JSON.parse(traits);
  })
  @IsOptional()
  traits: TraitsQuery[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  readonly username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  readonly excludeUsername?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @Transform(({ value: walletAddress }) => {
    return walletAddress ? walletAddress.toLowerCase() : walletAddress;
  })
  readonly walletAddress: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  readonly collectionSlugs?: string[];

  @ApiProperty({ default: 10 })
  @Transform(({ value: limit }) => {
    return limit ? parseInt(limit, 10) : 10;
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return page ? parseInt(page, 10) : 1;
  })
  @IsInt()
  page: number;

  @IsOptional()
  @ApiProperty()
  @IsString()
  chainId: ChainId;

  @ApiProperty({
    name: '排序参数',
    description:
      '默認 正序，"-" 倒序。多個排序字段以英文符號","分隔開。 目前createAt可以不用添加，默認是排序最後添加-createdAt， 如sortBy=-likeCount等價於sortBy=-likeCount,-createdAt',
    examples: [
      'sortBy=bestListPrice',
      'sortBy=bestOfferPrice',
      'sortBy=-likeCount',
      'sortBy=-likeCount,-createdAt',
    ],
    required: false,
  })
  @IsArray()
  @Transform(({ value }) => value.toString().split(','))
  @IsOptional()
  sortBy: [string];

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isVerified: boolean;
}

export class collectionQueryDTO extends keywordsBaseQueryDTO {
  @ApiProperty()
  @IsOptional()
  @IsString()
  // alldays, 30days, 7days, today
  tradingDays: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isSimple: boolean;
}

export class keywordsAssetsQueryDTO extends keywordsBaseQueryDTO {
  @ApiProperty()
  @IsString()
  chainId: ChainId;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isCount: boolean;
}
