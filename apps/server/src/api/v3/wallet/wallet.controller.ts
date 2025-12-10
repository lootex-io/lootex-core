import {
  Controller,
  Get,
  Param,
  Logger,
  HttpException,
  UseInterceptors,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetWalletsByUsernameParamDTO } from '@/api/v3/wallet/wallet.dto';
import { WalletService } from '@/api/v3/wallet/wallet.service';
import {
  WalletHistoryList,
  WalletList,
} from '@/api/v3/wallet/wallet.interceptor';
import { ChainId } from '@/common/utils/types';
import { RealIP } from 'nestjs-real-ip';
import { CFIpCountry } from '@/common/decorator/cf-ip.decorator';
import { WalletHistoryTag } from './wallet.interface';
import { AuthJwtGuardOptional } from '../auth/auth.jwt.guard';
import { CurrentWallet } from '../auth/auth.decorator';
import { Wallet } from '@/model/entities';
import { retry } from '@/common/utils/retry';

@Controller('api/v3')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  @Get('/wallets/record/:chainId/:txHash')
  async recodeWalletHistoryForDev(
    @Param('chainId') chainId: ChainId,
    @Param('txHash') txHash: string,
    @Query('tag') tag: WalletHistoryTag,
    @RealIP() realIP: string,
    @CFIpCountry() cfIpCountry: string,
  ): Promise<any> {
    try {
      this.logger.debug(txHash);
      const result = await this.walletService.recodeWalletHistoryByTxHash(
        chainId,
        txHash,
        {
          tag,
          ip: realIP,
          area: cfIpCountry,
        },
      );

      return result;
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/wallets/history')
  @UseInterceptors(WalletHistoryList)
  async getWalletHistory(
    @Query('walletAddress') walletAddress: string,
    @Query('chainId') chainId: ChainId,
    @Query('currencyAddress') currencyAddress: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ): Promise<any> {
    try {
      this.logger.debug(walletAddress);
      const result = await this.walletService.getWalletHistory(
        walletAddress.toLowerCase(),
        page,
        limit,
        {
          chainId,
          currencyAddress,
        },
      );
      return result;
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/wallets/current')
  @UseGuards(AuthJwtGuardOptional)
  async getCurrentWallet(
    @RealIP() realIP: string,
    @CFIpCountry() cfIpCountry: string,
    @CurrentWallet() wallet: any,
  ) {
    return {
      wallet,
      ip: realIP,
      area: cfIpCountry,
    };
  }

  @Put('/wallets/record/:chainId/:txHash')
  @UseGuards(AuthJwtGuardOptional)
  async recodeWalletHistory(
    @Param('chainId') chainId: ChainId,
    @Param('txHash') txHash: string,
    @Query('tag') tag: WalletHistoryTag,
    @RealIP() realIP: string,
    @CFIpCountry() cfIpCountry: string,
    @CurrentWallet() wallet: Wallet,
  ): Promise<any> {
    try {
      this.logger.debug(txHash);
      return await retry(
        () =>
          this.walletService.recodeWalletHistoryByTxHash(chainId, txHash, {
            tag,
            wallet,
            ip: realIP,
            area: cfIpCountry,
          }),
        3,
        10000,
      )
        .then((response) => {
          return response;
        })
        .catch((error) => {
          this.logger.error(
            `[recodeWalletHistory]${chainId}:${txHash} ${error}`,
          );
          throw new HttpException(error.message, 400);
        });
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/wallets/:username')
  @UseInterceptors(WalletList)
  async getWalletsByUsername(
    @Param() params: GetWalletsByUsernameParamDTO,
  ): Promise<any> {
    try {
      this.logger.debug(params);
      const wallets = await this.walletService.getWalletsByUsername(
        params.username,
      );
      return wallets;
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/wallets/:walletAddress')
  async getWalletBalance(@Param('walletAddress') walletAddress: string) {
    try {
      this.logger.debug(walletAddress);
      const result =
        await this.walletService.getAddressHoldingUSDBalance(walletAddress);
      return result;
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }
}
