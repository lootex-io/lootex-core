import { BasePaginationDto } from '@/common/dto/base-pagination.dto';
import { ChainId } from '@/common/utils/types';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetLaunchpadListDTO extends BasePaginationDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  chainId: ChainId;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isVerified: boolean;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  sortBy: string[];

  @ApiProperty()
  @IsArray()
  @IsOptional()
  sortOrder: string[];
}

export class BiruMintLogPaginationDto extends BasePaginationDto {
  @IsNotEmpty()
  @IsString()
  contractAddress: string;

  @IsString()
  @IsOptional()
  tokenId: string;
}
