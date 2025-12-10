import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { BasePaginationDto } from '@/common/dto/base-pagination.dto';

export class AccountGpBalanceStatsDto extends BasePaginationDto {
  @ApiProperty()
  @IsOptional()
  username: string;

  @ApiProperty()
  @IsOptional()
  walletAddress: string;

  // 毫秒
  @ApiProperty()
  startTime: number;

  // 毫秒
  @ApiProperty()
  endTime: number;

  @ApiProperty()
  sortBy: string;
}

export class AccountGpTopupDetailDto {
  @ApiProperty()
  chainId: number;

  @ApiProperty()
  txHash: string;
}

export class AccountStatsOverChangeDto extends BasePaginationDto {
  // 毫秒
  @ApiProperty()
  startTime: number;

  // 毫秒
  @ApiProperty()
  endTime: number;

  @ApiProperty({
    name: '排序参数',
    description: '默認 正序，"-" 倒序 in, out',
    examples: ['sortBy=-in'],
    required: true,
  })
  sortBy: string;
}

export class AccountStatsOverBalanceDto extends BasePaginationDto {
  @ApiProperty({
    name: '排序参数',
    description: '默認 倒序，"-"  balance',
    examples: ['sortBy=-balance'],
    required: true,
  })
  sortBy: string;
}

export class AccountRefundTxGp {
  @ApiProperty()
  historyIds: string[];
}
