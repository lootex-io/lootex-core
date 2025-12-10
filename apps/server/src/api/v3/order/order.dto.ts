import { AssetEventCategory } from '@/api/v3/asset/asset.interface';
import { TraitQuery } from '@/api/v3/trait/trait.interface';
import { SUPPORT_CHAIN_ID_REGEX } from '@/common/utils/constants';
import {
  IsNotEmpty,
  IsInt,
  IsString,
  IsNumberString,
  Min,
  Max,
  Matches,
  IsEthereumAddress,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ChainId } from '@/common/utils/types';
import { Category, OfferType } from '@/api/v3/order/order.interface';
import { getAddress } from 'ethers/lib/utils';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from 'sequelize/types';
import { queryLimit } from '@/common/utils/utils.pure';

export class OfferDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(5)
  itemType: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  @Transform(({ value: token }) => {
    return getAddress(token);
  })
  token: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumberString()
  identifierOrCriteria: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumberString()
  startAmount: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumberString()
  endAmount: string;
}

export class ConsiderationDTO extends OfferDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  @Transform(({ value: recipient }) => {
    return getAddress(recipient);
  })
  recipient: string;
}
export class CreateOrderDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsEthereumAddress()
  @Transform(({ value: offerer }) => {
    return offerer.toLowerCase();
  })
  readonly offerer: string;

  @ApiProperty({
    type: [OfferDTO],
  })
  @IsNotEmpty()
  readonly offer: OfferDTO[];

  @ApiProperty({
    type: [ConsiderationDTO],
  })
  @IsNotEmpty()
  readonly consideration: ConsiderationDTO[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly signature: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly hash: string;

  @ApiProperty({ enum: Category })
  @IsNotEmpty()
  @Matches(/^(listing|offer|auction|bundle|other)$/)
  @Transform(({ value: category }) => {
    return Category[category];
  })
  readonly category: Category;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(3)
  readonly orderType: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumberString()
  readonly startTime: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumberString()
  readonly endTime: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  readonly totalOriginalConsiderationItems: number;

  @ApiProperty()
  @IsString()
  readonly zone: string;

  @ApiProperty()
  @IsString()
  readonly zoneHash: string;

  @ApiProperty()
  @IsNumberString()
  readonly counter: string;

  @ApiProperty()
  @IsString()
  readonly conduitKey: string;

  @ApiProperty()
  @IsString()
  readonly salt: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  @Transform(({ value: exchangeAddress }) => {
    return exchangeAddress.toLowerCase();
  })
  readonly exchangeAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(SUPPORT_CHAIN_ID_REGEX)
  readonly chainId: ChainId;

  @ApiProperty()
  @IsString()
  @IsOptional()
  readonly message: string;
}

export class GetOrderDTO {
  @ApiProperty({
    required: false,
    description: 'Seaport getHash() generated hash',
  })
  @IsOptional()
  readonly hash?: string;

  @ApiProperty({
    required: false,
    description: 'Seaport getHash() generated hash',
  })
  @IsOptional()
  @IsArray()
  readonly hashes?: string[];

  @ApiProperty({ required: false, description: 'the order maker' })
  @IsOptional()
  @IsEthereumAddress()
  readonly offerer?: string;

  @ApiProperty({ required: false, description: 'the order maker' })
  @IsOptional()
  @IsString()
  readonly offererUsername?: string;

  @IsOptional()
  @IsEthereumAddress()
  // seaport_order 沒有這個欄位 要去 seaport_order_history 撈嗎?
  readonly fulfiller?: string;

  @ApiProperty({
    required: false,
    description: 'order include NFT contract address',
  })
  @IsEthereumAddress()
  @IsOptional()
  readonly contractAddress?: string;

  @ApiProperty({
    required: false,
    description: 'order include NFT contract address and tokenId',
  })
  @IsNumberString()
  @IsOptional()
  readonly tokenId?: string;

  @ApiProperty({
    required: false,
    description: 'order include NFT contract address and tokenId',
  })
  @IsOptional()
  @IsArray()
  readonly tokenIds?: string[];

  @ApiProperty({
    required: false,
    example: '{"stringTraits": {"Clothing": ["Low Cut Vest Yellow"]}}',
  })
  @Transform(({ value }) => JSON.parse(value))
  traits?: TraitQuery;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Matches(SUPPORT_CHAIN_ID_REGEX)
  readonly chainId?: ChainId;

  @ApiProperty({
    required: false,
    enum: Category,
  })
  @IsOptional()
  @Matches(/^(listing|offer|auction|bundle|other)$/)
  @Transform(({ value: category }) => {
    return Category[category];
  })
  readonly category?: Category;

  @ApiProperty({
    required: false,
    enum: OfferType,
  })
  @IsOptional()
  @Matches(/^(Normal|Collection|Specify)$/)
  @Transform(({ value: offerType }) => {
    return OfferType[offerType];
  })
  readonly offerType?: OfferType;

  @IsOptional()
  readonly orderType?: number;

  @ApiProperty({ required: false, description: 'order start time < ?' })
  @IsOptional()
  readonly startTimeLt?: number;

  @ApiProperty({ required: false, description: 'order start time > ?' })
  @IsOptional()
  readonly startTimeGt?: number;

  @ApiProperty({ required: false, description: 'order start time <= ?' })
  @IsOptional()
  readonly endTimeLt?: number;

  @ApiProperty({ required: false, description: 'order start time >= ?' })
  @IsOptional()
  readonly endTimeGt?: number;

  @ApiProperty({
    required: false,
    description: 'the Seaport address used for the order',
  })
  @IsOptional()
  @IsEthereumAddress()
  @Transform(({ value: exchangeAddress }) => {
    return exchangeAddress.toLowerCase();
  })
  readonly exchangeAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly isFillable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly isCancelled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly isExpired?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly isFulfilled?: boolean;

  @ApiProperty({
    required: false,
    description: 'the currency symbol used for the order',
  })
  @IsOptional()
  readonly currencySymbol?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly priceGt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly priceGte?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly priceLt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly priceLte?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly priceBetween?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  readonly priceNotBetween?: string;

  @ApiProperty({ required: false })
  @IsArray()
  @IsOptional()
  readonly sortBy?: Order;

  @ApiProperty({ default: 20 })
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @IsInt()
  limit?: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page?: number;
}

export class GetOrderHistoryDTO {
  @ApiProperty({
    required: false,
  })
  @Transform(({ value: contractAddress }) => {
    return contractAddress.toLowerCase();
  })
  @IsOptional()
  @IsEthereumAddress()
  readonly contractAddress?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsNumberString()
  readonly tokenId?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsArray()
  readonly category?: AssetEventCategory[];

  @ApiProperty({
    required: false,
  })
  @Transform(({ value: fromAddress }) => {
    return fromAddress.toLowerCase();
  })
  @IsOptional()
  @IsEthereumAddress()
  readonly fromAddress?: string;

  @ApiProperty({
    required: false,
  })
  @Transform(({ value: toAddress }) => {
    return toAddress.toLowerCase();
  })
  @IsOptional()
  @IsEthereumAddress()
  readonly toAddress?: string;

  @ApiProperty({
    required: false,
  })
  @Transform(({ value: userAddress }) => {
    return userAddress.toLowerCase();
  })
  @IsOptional()
  @IsEthereumAddress()
  readonly userAddress?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  readonly recentDays?: number;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  readonly startTimeLt?: number;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  readonly startTimeGt?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Matches(SUPPORT_CHAIN_ID_REGEX)
  readonly chainId?: ChainId;

  @ApiProperty({
    required: false,
  })
  platformType?: string;

  @ApiProperty({ default: 20 })
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;
}

export class GetAccountOrderReceiveDTO {
  @ApiProperty({
    required: false,
  })
  @Transform(({ value: userAddresses }) => {
    if (Array.isArray(userAddresses)) {
      return userAddresses.map((address) => address.toLowerCase());
    }
    return userAddresses;
  })
  @IsOptional()
  @IsEthereumAddress({ each: true })
  @IsArray()
  readonly userAddress?: string[];

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly username?: string;

  @ApiProperty({
    required: false,
    enum: OfferType,
  })
  @IsOptional()
  @Matches(/^(Normal|Collection|Specify)$/)
  @Transform(({ value: offerType }) => {
    return OfferType[offerType];
  })
  readonly offerType?: OfferType;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  readonly recentDays?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Matches(SUPPORT_CHAIN_ID_REGEX)
  readonly chainId?: ChainId;

  @ApiProperty({ default: 20 })
  @Transform(({ value: limit }) => {
    return parseInt(limit, 10);
  })
  @Transform(queryLimit)
  @IsInt()
  limit: number;

  @ApiProperty({ default: 1 })
  @Transform(({ value: page }) => {
    return parseInt(page, 10);
  })
  @IsInt()
  page: number;
}

export class SyncOrderDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  readonly hash: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEthereumAddress()
  @Transform(({ value: exchangeAddress }) => {
    return exchangeAddress.toLowerCase();
  })
  readonly exchangeAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Matches(SUPPORT_CHAIN_ID_REGEX)
  readonly chainId: ChainId;
}

export class DisableOrdersDTO {
  @ApiProperty()
  @IsArray()
  @IsOptional()
  ids: string[];

  @ApiProperty()
  @IsString()
  @IsOptional()
  contractAddress: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  chainId: ChainId;
}

/**
 * swap example:
 *
 * {
 *   type: 'swap',
 *   data: {
 *     tokenIn: 'MNT',
 *     tokenOut: 'FRENS',
 *     amountIn: '0.1',
 *     amountOut: '0.2'
 *   }
 *  }
 *
 */
export interface SyncTransactionDto {
  type: string;
  ip: string;
  ipCountry: string;
  data: any;
}
