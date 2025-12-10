import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { queryLimit } from '@/common/utils/utils.pure';
import { GpTxEvent } from '@/model/entities/constant-model';

export class PaymasterUserOperation {
  @IsString()
  @IsOptional()
  sender: string;

  @IsString()
  @IsOptional()
  nonce: string;

  @IsString()
  @IsOptional()
  initCode: string;

  @IsString()
  @IsOptional()
  callData: string;

  @IsString()
  @IsOptional()
  signature: string;

  @IsString()
  @IsOptional()
  paymasterAndData: string;

  @IsString()
  @IsOptional()
  maxFeePerGas: string;

  @IsString()
  @IsOptional()
  maxPriorityFeePerGas: string;

  @IsString()
  @IsOptional()
  verificationGasLimit: string;

  @IsString()
  @IsOptional()
  callGasLimit: string;

  @IsString()
  @IsOptional()
  preVerificationGas: string;
}

export class PaymasterDataDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  preview?: boolean;

  @ApiProperty()
  userOp: PaymasterUserOperation;
}

export class PaymasterDataPlusDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  preview?: boolean;
}

export class PaymasterCheckerPlusDTO {
  @ApiProperty()
  data: PaymasterDataPlusDto;

  @ApiProperty()
  userOp: PaymasterUserOperation;
}

export class PaymasterCheckerDTO {
  @ApiProperty()
  data: PaymasterDataDto;
}

export class GpBalanceCostDTO {
  @ApiProperty()
  chainId: number;

  @ApiProperty()
  userOp: PaymasterUserOperation;
}

export class GpBalanceHistoryQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  readonly event?: GpTxEvent[];

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

export class GpPaymentCostDto {
  @ApiProperty()
  symbol: string;

  @ApiProperty()
  value: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  invert: boolean = false;
}

export class GpPaymentSignatureDto {
  @ApiProperty()
  accountAddress: string;

  @ApiProperty()
  consumedGp: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  delegatedValue: string;

  @ApiProperty()
  tokenAddress: string;

  @ApiProperty()
  chainId: number;
}
