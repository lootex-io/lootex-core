import {
  IsEmail,
  IsNotEmpty,
  Length,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsArray,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  AuthSupportedChainFamily,
  AuthSupportedAddress,
  AuthSupportedWalletProviderEnum,
  AuthSupportedWalletTransport,
  SocialPlatform,
} from './auth.interface';
import { EMAIL_BLACKLIST } from '@/common/utils';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotProfanity } from './auth.decorator';
import { normaliseTorusVerifier } from '@/common/utils/utils.pure';
import { LoginPayload } from 'thirdweb/auth';

export class AccountAuthBaseDto {
  // @dev chainFamily: mandatory field
  @ApiProperty({
    example: AuthSupportedChainFamily.ETH,
    enum: AuthSupportedChainFamily,
    description: 'Chain family',
  })
  @IsNotEmpty()
  @IsEnum(AuthSupportedChainFamily)
  chainFamily: AuthSupportedChainFamily;

  // @dev address: mandatory field, although optional for some logic
  @ApiProperty({
    example: '0x8DF0bDf72220aa4ac77cef375c2210b134Bd9e56',
    description: 'Wallet address',
  })
  @Transform(({ value: address }) => {
    return address.toLowerCase();
  })
  @IsNotEmpty()
  address: AuthSupportedAddress;

  // @dev provider: mandatory field, detected/selected wallet provider from front-end
  @ApiProperty({
    example: AuthSupportedWalletProviderEnum.METAMASK_INJECTED,
    enum: AuthSupportedWalletProviderEnum,
  })
  @IsNotEmpty()
  @IsEnum(AuthSupportedWalletProviderEnum)
  provider: AuthSupportedWalletProviderEnum;

  // @dev transport: mandatory field, detected wallet transport
  @ApiProperty({
    example: AuthSupportedWalletTransport.INJECTED,
    enum: AuthSupportedWalletTransport,
  })
  @IsEnum(AuthSupportedWalletTransport)
  transport: AuthSupportedWalletTransport;

  // @dev chainId: optional field, mandatory for ERC-1271
  @ApiPropertyOptional({
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  chainId?: number;

  // @dev signature: signature payload
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  signature?: string;

  // @dev message: message payload, message signed by the wallet will be signature
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;

  // @dev ETH only, if is ERC-1271 contract wallet
  @ApiProperty({
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isErc1271Wallet?: boolean = false;

  // @dev SOL & APTOS only, public key for BS58 recovery
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  publicKey?: string = '';
}

export class AccountSignUpDto extends AccountAuthBaseDto {
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class AccountNewWalletSignUpDto extends AccountAuthBaseDto {
  // Fields removed
}



export class AccountTorusSignUpDto extends AccountAuthBaseDto {
  @ApiProperty({
    example: 'discord',
    enum: ['tkey-facebook', 'tkey-twitch', 'tkey-google', 'reddit', 'discord'],
    description: 'Unsorted verifier field from Torus SDK',
  })
  @IsNotEmpty()
  @Transform(normaliseTorusVerifier)
  verifier: string;

  @ApiProperty({
    example: '1680840',
    description: 'By-verifier specific user identification string',
  })
  @IsNotEmpty()
  verifierId: string;

  // Username and email removed
  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class AccountPrivySignUpDto {
  // @dev mandatory, @username
  @ApiProperty({ example: 'username', description: 'username' })
  @IsNotEmpty()
  @IsString()
  @IsNotProfanity()
  @MinLength(3)
  @MaxLength(16)
  @Matches(/^[a-z0-9-_]+$/)
  username: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class AccountTorusNewWalletSignUpDto extends AccountAuthBaseDto {
  @ApiProperty({
    example: 'discord',
    enum: ['tkey-facebook', 'tkey-twitch', 'tkey-google', 'reddit', 'discord'],
    description: 'Unsorted verifier field from Torus SDK',
  })
  @IsNotEmpty()
  @Transform(normaliseTorusVerifier)
  verifier: string;

  @ApiProperty({
    example: '1680840',
    description: 'By-verifier specific user identification string',
  })
  @IsNotEmpty()
  verifierId: string;
}

export class GetChallengeDto {
  @ApiProperty({
    example: AuthSupportedChainFamily.ETH,
    enum: AuthSupportedChainFamily,
    description: 'Chain family',
  })
  @IsNotEmpty()
  @IsEnum(AuthSupportedChainFamily)
  chainFamily: AuthSupportedChainFamily;

  @ApiProperty({
    example: '0x8DF0bDf72220aa4ac77cef375c2210b134Bd9e56',
    description: 'Wallet address',
  })
  @Transform(({ value: address }) => {
    return address.toLowerCase();
  })
  @IsNotEmpty()
  address: string;
}

export class GetChallengePlusDto {
  @ApiProperty({
    example: '0x8DF0bDf72220aa4ac77cef375c2210b134Bd9e56',
    description: 'Wallet address',
  })
  @Transform(({ value: address }) => {
    return address.toLowerCase();
  })
  @IsNotEmpty()
  address: string;
}
export class VerifyChallengePlusDto {
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @IsNotEmpty()
  loginPayload: LoginPayload;

  @IsNotEmpty()
  @IsString()
  signature: string;
}



export class QueryByAddressBaseDto {
  @ApiProperty()
  @Transform(({ value: address }) => {
    return address.toLowerCase();
  })
  @IsNotEmpty()
  address: AuthSupportedAddress;
}

export class QueryByUsernameBaseDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  username: string;
}



export class IsWalletBoundDto {
  @ApiProperty()
  @Transform(({ value: address }) => {
    return address.toLowerCase();
  })
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsNotEmpty()
  chainFamily: string;
}

export class QueryByIdBaseDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  id: string;
}

export class SocialConnectDTO {
  @ApiProperty({
    example: 'discord',
  })
  @IsNotEmpty()
  @IsString()
  provider: SocialPlatform;

  @ApiProperty()
  @IsOptional()
  @IsString()
  providerAccountId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  expires_at: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  refreshToken: string;
}

export class DiscordWalletVerifyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  discordId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  walletAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  challenge: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  signature: string;
}
