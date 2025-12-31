import {
  Controller,
  Get,
  Param,
  Logger,
  HttpException,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { GetWalletsByUsernameParamDTO } from '@/api/v3/wallet/wallet.dto';
import { WalletService } from '@/api/v3/wallet/wallet.service';
import { WalletList } from '@/api/v3/wallet/wallet.interceptor';
import { AuthJwtGuardOptional } from '../auth/auth.jwt.guard';
import { CurrentWallet } from '../auth/auth.decorator';

@Controller('api/v3')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  @Get('/wallets/current')
  @UseGuards(AuthJwtGuardOptional)
  async getCurrentWallet(@CurrentWallet() wallet: any) {
    return {
      wallet,
    };
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
