import { BasePaginationDto } from '@/common/dto/base-pagination.dto';
import { ChainId } from '@/common/utils/types';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEthereumAddress,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ContractDraftDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  schemaName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  chainId: ChainId;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  logoImageUrl: string;

  @ApiProperty()
  @IsString()
  // 限制只能 Normal, Badge
  @IsIn(['Normal', 'Badge'], { message: 'type must be either Normal or Badge' })
  mode: string;
}

export class ContractBlindboxDTO {
  @ApiProperty()
  @IsBoolean()
  isBlindbox: boolean;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  blindboxUrl: string;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty()
  blindboxName: ChainId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  blindboxDescription: string;

  @ApiProperty()
  @IsOptional()
  blindboxTraits: { value: any; trait_type: string; display_type?: string }[];
}

export class ContractDropDTO {
  @ApiProperty()
  @IsString()
  @IsOptional()
  allowlist: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  startTime: Date;

  @ApiProperty()
  @IsString()
  limitPerWallet: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  currencyAddress: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  metadata: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  tokenId: string;
}

export class AssetDraftDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class UpdateContractDraftDTO {
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  chainId: ChainId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  schemaName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  symbol: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  logoImageUrl: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isVisible: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  creatorAddress: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  ownerAddress: string;

  @ApiProperty()
  @IsOptional()
  dropFeeInfo: any;

  @ApiProperty()
  @IsOptional()
  dropName: string;

  @ApiProperty()
  @IsOptional()
  dropDescription: string;

  @ApiProperty()
  @IsOptional()
  dropUrls: string[];

  @ApiProperty()
  @IsOptional()
  isCreatorFee: boolean;

  // @ApiProperty()
  // @IsOptional()
  // creatorFee: string;

  @ApiProperty()
  @IsOptional()
  creatorFeeAddress: string;
}

export class GetContractSimpleDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  chainId: ChainId;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  address: string;
}

export class SetLaunchpadInfoByAdminDTO {
  @ApiProperty()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isLaunchpadHidden: boolean;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  launchpadRank?: number;
}
export class BiruMintLogPaginationDto extends BasePaginationDto {
  @IsNotEmpty()
  @IsString()
  contractAddress: string;

  @IsString()
  @IsOptional()
  tokenId: string;
}

export class GetContractBlindboxListDTO extends BasePaginationDto {
  @ApiProperty()
  @IsString()
  walletAddress: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  chainId: ChainId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  contractAddress: string;
}

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
