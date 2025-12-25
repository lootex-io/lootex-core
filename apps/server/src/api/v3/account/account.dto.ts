import {
  IsOptional,
  IsString,
  IsEthereumAddress,
  IsNumberString,
  IsInt,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ChainId, ExternalLink } from '@/common/utils/types';
import { ApiProperty } from '@nestjs/swagger';
import { queryLimit } from '@/common/utils/utils.pure';
export class UpdateAccountDTO {
  @ApiProperty()
  @IsString()
  @IsOptional()
  fullname?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  introduction?: string;

  @ApiProperty({ required: false, type: [ExternalLink] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalLink)
  externalLinks?: ExternalLink[];
}

export class GetAccountAssetsDTO {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsOptional()
  @IsNumberString()
  chainId: ChainId;

  @ApiProperty()
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;

  @ApiProperty()
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;
}

export class GetAccountCollectionsDTO {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  chainShortName: string;

  @ApiProperty()
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;

  @ApiProperty()
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;
}
export class GetAccountsQueryDTO {
  @ApiProperty()
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;

  @ApiProperty()
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;

  @ApiProperty()
  @IsOptional()
  @IsNumberString()
  chainId: ChainId;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsEthereumAddress()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  contractAddress: string;

  @ApiProperty()
  @IsOptional()
  @IsNumberString()
  tokenId: string;
}

export class GetAccountQueryDTO {
  @ApiProperty()
  @IsOptional()
  @IsEthereumAddress()
  @Transform(({ value: walletAddress }) => {
    return walletAddress.toLowerCase();
  })
  walletAddress: string;

  @ApiProperty()
  @IsOptional()
  email: string;

  @ApiProperty()
  @IsOptional()
  username: string;

  @ApiProperty()
  @IsOptional()
  referralCode: string;
}

export class UserAccountDTO {
  @ApiProperty()
  @IsString()
  username: string;
}

// [
// 	{
// 		"name": "video1",
// 		"description": "blablabla",
// 		"cover": "https://lootex-dev-cdn.imgix.net/hash0.png", // only support jpg/png
// 		"url": "https://lootex-dev-cdn.imgix.net/hash1.mp4",
// 		"contentType": "video/mp4"
// 	},
// 	{
// 		"name": "img1",
// 		"description": "blablablabla",
// 		"url": "https://lootex-dev-cdn.imgix.net/hash3.png",
// 		"contentType": "image/png"
// 	},
// ]


export class ChangeChainStatsVisibilityDto {
  @ApiProperty({ title: 'visibility' })
  @IsString()
  visibility: string;
}

export class SyncChainStatsTaskDto {
  @ApiProperty({ title: 'username' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ title: 'day scope' })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  days?: number;

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
