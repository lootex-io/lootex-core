import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { queryLimit } from '@/common/utils/utils.pure';

export class GetStudioContractUploadItemDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  keyword: string;

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
}
