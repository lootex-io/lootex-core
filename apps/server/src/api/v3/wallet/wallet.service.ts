import { Injectable, Logger } from '@nestjs/common';
import { Account, Wallet } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { ethers } from 'ethers';
import { AuthSupportedWalletProviderEnum } from '../auth/auth.interface';
import { CurrencyService } from '@/core/third-party-api/currency/currency.service';
import { ChainId } from '@/common/utils/types';
import BigNumber from 'bignumber.js';
import { ChainUtil } from '@/common/utils/chain.util';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';

@Injectable()
export class WalletService {
  protected readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,

    @InjectModel(Account)
    private accountRepository: typeof Account,

    private gatewayService: GatewayService,
    private currencyService: CurrencyService,
    private rpcHandlerService: RpcHandlerService,
  ) {}

  async getWalletsByUsername(username: string): Promise<Wallet[]> {
    try {
      const account = await this.accountRepository.findOne({
        where: {
          username,
        },
      });

      if (!account) {
        throw new Error('account not found');
      }

      const wallets = await this.walletRepository.findAll({
        where: {
          accountId: account.id,
        },
      });

      return wallets;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  /**
   * 如果是 Privy 的 embed wallet, 要去拿 SA 的地址
   * 如果是其他的則回傳原本的地址
   * @param address
   */
  async getUserSaWalletAddressByAddress(
    walletAddress: string,
  ): Promise<string> {
    try {
      let address = walletAddress?.toLowerCase();

      // 如果是 SA，要去拿 SA address
      const userAddress = await this.walletRepository.findOne({
        attributes: ['accountId', 'address', 'provider'],
        where: {
          address,
        },
      });

      if (
        userAddress.provider == AuthSupportedWalletProviderEnum.PRIVY_LIBRARY
      ) {
        const saWallet = await this.walletRepository.findOne({
          attributes: ['address'],
          where: {
            accountId: userAddress.accountId,
            provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
          },
        });
        address = saWallet.address;
      }

      return address;
    } catch (err) {
      this.logger.log(
        `[getUserSaWalletAddressByAddress]: ${walletAddress} ${err}`,
      );
      return walletAddress?.toLowerCase();
    }
  }

  async getUserSaWalletAddressByWallet(wallet: Wallet): Promise<string> {
    try {
      let address = wallet.address?.toLowerCase();
      if (wallet.provider == AuthSupportedWalletProviderEnum.PRIVY_LIBRARY) {
        const saWallet = await this.walletRepository.findOne({
          attributes: ['address'],
          where: {
            accountId: wallet.accountId,
            provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
          },
        });
        address = saWallet.address;
      }

      return address;
    } catch (err) {
      this.logger.log(
        `[getUserSaWalletAddressByAddress]: ${wallet.address} ${err}`,
      );
      return wallet.address?.toLowerCase();
    }
  }

  @RpcCall()
  async getWalletChainBalance(
    chainId: number,
    address: string,
  ): Promise<string> {
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProvider(chainId);

    return ethers.utils.formatEther(await provider.getBalance(address));
  }

  async getAddressHoldingUSDBalance(walletAddress: string) {
    let totalBalance = new BigNumber(0);

    const promises = ChainUtil.POC_CHAINS.map(async (chainId) => {
      const balance = await this.getWalletChainBalance(chainId, walletAddress);
      let warpedToken = '0';

      switch (chainId) {
        case 1:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '1',
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            walletAddress,
          );
          break;
        case 56:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '56',
            '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
            walletAddress,
          );
          break;
        case 137:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '137',
            '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
            walletAddress,
          );
          break;
        case 5000:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '5000',
            '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8',
            walletAddress,
          );
          break;
        case 8453:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '8453',
            '0x4200000000000000000000000000000000000006',
            walletAddress,
          );
          break;
        case 42161:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '42161',
            '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
            walletAddress,
          );
          break;
        case 43114:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '43114',
            '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
            walletAddress,
          );
          break;
      }

      const readableWarpedToken = new BigNumber(warpedToken).dividedBy(1e18);
      const { tokenPrice } = await this.currencyService.getCachePriceByChainId(
        chainId.toString() as ChainId,
      );
      const balanceUsd = new BigNumber(balance)
        .plus(readableWarpedToken)
        .times((tokenPrice as any).price);
      this.logger.debug(
        `chainId ${chainId} balance ${balance.toString()} warpedToken ${readableWarpedToken} nativeTokenPrice ${(tokenPrice as any).price} balanceUsd ${balanceUsd}`,
      );
      totalBalance = totalBalance.plus(balanceUsd);

      return {
        chainId,
        balanceUsd,
        warpedToken: readableWarpedToken,
        nativeToken: balance,
      };
    });

    const balancesUsd = await Promise.all(promises);

    this.logger.debug(`totalBalance ${totalBalance.toString()}`);

    return { totalBalance: totalBalance.toString(), balancesUsd };
  }
}
