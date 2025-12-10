import { IsOptional, IsString } from 'class-validator';

export class GpOrderRewardDto {
  @IsOptional()
  fees: ServiceFeeDto[];

  chainId: number;

  @IsOptional()
  txHash: string;
}

export class ServiceFeeDto {
  @IsString()
  amount: string;

  @IsString()
  symbol: string;
}
