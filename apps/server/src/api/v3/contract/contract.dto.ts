import { IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ChainId } from '@/common/utils/types';
import { TraitQuery } from '@/api/v3/trait/trait.interface';
import { ApiProperty } from '@nestjs/swagger';
import { queryLimit } from '@/common/utils/utils.pure';

export class ContractAssetsQueryDTO {
  @ApiProperty()
  @IsString()
  chainId: ChainId;

  @ApiProperty({ default: 50 })
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @IsInt()
  @Transform(queryLimit)
  limit: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => JSON.parse(value))
  traits: TraitQuery;
}

export class ContractAssetsParamsDTO {
  @ApiProperty()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  @IsString()
  contractAddress: string;

  @ApiProperty()
  @IsString()
  chainId: ChainId;
}
