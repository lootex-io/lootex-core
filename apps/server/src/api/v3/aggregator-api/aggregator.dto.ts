import { IsInt, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AggregatorSyncOrderDto {
  @ApiProperty()
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @IsInt()
  chainId: number;

  @ApiProperty()
  @Transform(({ value: ownerAddress }) => {
    return ownerAddress.toLowerCase();
  })
  @IsString()
  contractAddress: string;

  @ApiProperty()
  @IsString()
  tokenId: string;
}

export class AggregatorSignatureOrderDto {
  @IsString()
  orderHash: string;

  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @IsInt()
  chainId: number;

  @IsString()
  exChangeAddress: string;

  @IsString()
  fulfillerAddress: string;
}
