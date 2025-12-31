import { ChainId } from '@/common/utils/types';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsEthereumAddress,
  IsNumberString,
  IsOptional,
  IsArray,
} from 'class-validator';

export class GetTraitDTO {
  @IsNotEmpty()
  @IsNumberString()
  readonly chainId: ChainId;

  @IsString()
  @IsEthereumAddress()
  @Transform(({ value }) => value.toLowerCase())
  readonly collectionAddress: string;
}

export class GetTraitsListDTO {
  @IsString()
  @IsOptional()
  readonly collectionSlug: string;

  @IsString()
  @IsOptional()
  readonly collectionId: string;

  @IsArray()
  @IsOptional()
  readonly ownerAddresses?: string[];
}

export class GetTraitsTFDTO {
  @IsString()
  @IsOptional()
  readonly collectionSlug?: string[];

  @IsString()
  @IsOptional()
  readonly traitType?: string;

  @IsString()
  @IsOptional()
  readonly value?: string;

  @IsEthereumAddress()
  @IsOptional()
  readonly ownerAddress?: string;
}
