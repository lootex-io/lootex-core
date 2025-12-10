import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { queryLimit } from '@/common/utils/utils.pure';
import { IsInt } from 'class-validator';

export class BasePaginationDto {
  @ApiProperty({ default: 10 })
  @Transform(({ value: limit }) => {
    return limit ? parseInt(limit, 10) : 10;
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number = 10;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return page ? parseInt(page, 10) : 1;
  })
  @IsInt()
  page: number = 1;
}
