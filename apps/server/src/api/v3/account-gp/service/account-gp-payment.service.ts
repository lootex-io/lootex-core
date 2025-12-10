import { Injectable } from '@nestjs/common';
import { GpPaymentCostDto } from '@/api/v3/account-gp/dto/account-gp.dto';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { BigNumber } from 'bignumber.js';
import {
  Blockchain,
  Currency,
  Wallet as AccountWallet,
} from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { ConfigService } from '@nestjs/config';
import { GpDao } from '@/core/dao/gp-dao';
import { SdkEnvService } from '@/core/sdk/service/sdk-env.service';
import { SdkEnv } from '@/core/sdk/constants/env-constants';

@Injectable()
export class AccountGpPaymentService {
  private readonly gpPaymentPriKey;
  private readonly gpPaymentAmountLimit: number;
  // private readonly rateGpUsd;
  constructor(
    @InjectModel(Currency)
    private currencyRepository: typeof Currency,
    @InjectModel(AccountWallet)
    private walletRepository: typeof AccountWallet,

    private readonly currencyService: CurrencyService,
    private readonly gpDao: GpDao,
    private readonly sdkEnvService: SdkEnvService,
    private readonly configService: ConfigService,
    private readonly rpcHandlerService: RpcHandlerService,
  ) {
    this.gpPaymentPriKey = this.configService.get<string>('GP_PAYMENT_PRI_KEY');
    this.gpPaymentAmountLimit = this.configService.get<number>(
      'GP_PAYMENT_AMOUNT_LIMIT',
    );
  }

  /**
   * 代付nft接口：從商品定價換算代付所需的 gp 數量
   */
  async getPaymentCost(dto: GpPaymentCostDto) {
    const tokenCurrency = await this.currencyRepository.findOne({
      where: {
        symbol: dto.symbol,
      },
      include: [
        {
          model: Blockchain,
          where: {
            chainId: dto.chainId,
          },
        },
      ],
    });
    const tokenPrice =
      await this.currencyService.getPriceByCurrency(tokenCurrency);
    // const lootPrice = (await this.currencyService.getCachePrice('LOOTUSD'))
    //   .price;
    const rateGpUsd = await this.sdkEnvService.getNumber(
      SdkEnv.GP_EXCHANGE_GP_USD,
    );
    if (!dto.invert) {
      const gpAmount = new BigNumber(dto.value)
        .shiftedBy(-tokenCurrency.decimals)
        .times(tokenPrice.price)
        .dividedBy(rateGpUsd);
      return {
        tokenAmount: new BigNumber(dto.value)
          .shiftedBy(-tokenCurrency.decimals)
          .toNumber()
          .toString(),
        tokenPrice: tokenPrice.price,
        gpPrice: rateGpUsd,
        gpCost: Math.ceil(gpAmount.toNumber()),
      };
    } else {
      const tokenAmount = new BigNumber(dto.value)
        .times(rateGpUsd)
        .dividedBy(tokenPrice.price)
        .shiftedBy(tokenCurrency.decimals);
      return {
        gpAmount: dto.value,
        gpPrice: rateGpUsd,
        tokenPrice: tokenPrice.price,
        tokenCost: Math.ceil(tokenAmount.toNumber()).toString(),
      };
    }
  }

  // /**
  //  * 代付nft接口：給定用戶想代付的貨幣數量與消耗的 GP ，獲取 admin 簽名
  //  */
  // async getPaymentSignature(accountId: string, dto: GpPaymentSignatureDto) {
  //   const wallets = await this.walletRepository.findAll({
  //     attributes: ['address'],
  //     where: {
  //       accountId: accountId,
  //     },
  //   });
  //   if (
  //     !wallets
  //       .map((e) => e.address)
  //       .find((e) => e.toLowerCase() === dto.accountAddress.toLowerCase())
  //   ) {
  //     throw SimpleException.error('accountAddress invalid.');
  //   }
  //
  //   // 计算deleteValue usd
  //   const { tokenPrice } = await this.currencyService.getCachePriceByChainId(
  //     dto.chainId,
  //   );
  //   const deletedTokenAmount = new BigNumber(
  //     dto.delegatedValue.toString(),
  //   ).dividedBy(1e18);
  //   const deletedTokenUsd = deletedTokenAmount
  //     .times((tokenPrice as any).price)
  //     .toNumber();
  //
  //   const consumeGp = parseInt(dto.consumedGp);
  //   // const lootPrice = (await this.currencyService.getCachePrice('LOOTUSD'))
  //   //   .price;
  //   // const consumeGpUsd = new BigNumber(consumeGp).times(lootPrice);
  //   // console.log('consumeGpUsd ', consumeGpUsd.toNumber());
  //   // 校验：
  //   // 校验1：單筆交易 GP 補助的最大上限 (50000 gp)
  //   if (consumeGp > this.gpPaymentAmountLimit) {
  //     throw SimpleException.error(
  //       `This transaction exceeds the single payment limit`,
  //     );
  //   }
  //
  //   // 校验2：檢查 Proxy 合約餘額是否足夠 (Native token & Wrap token )
  //   const contractAddress = GP_PURCHASE_PROJECTS.find(
  //     (e) => e.chainId == dto.chainId,
  //   ).contractAddress;
  //   const isNativeToken = !dto.symbol.toLowerCase().startsWith('w');
  //   const contractTokenUsd = await this._getContractTokenBalance(
  //     dto.chainId,
  //     contractAddress,
  //     isNativeToken,
  //   );
  //
  //   console.log(
  //     `getPaymentSignature contractTokenUsd ${contractTokenUsd}, deletedTokenUsd ${deletedTokenUsd} `,
  //   );
  //   if (contractTokenUsd < deletedTokenUsd) {
  //     throw SimpleException.error(
  //       `The current payment account balance is insufficient. Please contact the appropriate personnel for assistance`,
  //     );
  //   }
  //
  //   const { signature, endTime } = await this._calPaymentSignature(
  //     +dto.chainId,
  //     dto,
  //   );
  //   const success = await this.gpDao.createPaymentTransactionHistory({
  //     chainId: dto.chainId,
  //     accountId: accountId,
  //     transactionSender: dto.accountAddress.toLowerCase(),
  //     amount: (-Math.abs(consumeGp)).toString(),
  //     args: { signatures: [signature], endTime: endTime, consumeGp: consumeGp },
  //   });
  //   if (success) {
  //     return { signature, endTime };
  //   } else {
  //     throw SimpleException.error('Create history failed.');
  //   }
  // }
  //
  // @RpcCall()
  // async _calPaymentSignature(chainId: number, dto: GpPaymentSignatureDto) {
  //   const consumeGp = parseInt(dto.consumedGp);
  //   const provider = new ethers.JsonRpcProvider(
  //     this.rpcHandlerService.getRpcUrl(dto.chainId),
  //   );
  //   const wallet = new ethers.Wallet(this.gpPaymentPriKey, provider);
  //   const contractAddress = GP_PURCHASE_PROJECTS.find(
  //     (e) => e.chainId == dto.chainId,
  //   ).contractAddress;
  //   const contract = new ethers.Contract(
  //     contractAddress,
  //     GP_PAYMENT_CONTRACT_ABI,
  //     wallet,
  //   );
  //   const nonce = await contract.nonce(dto.accountAddress);
  //
  //   // 有效时间5分钟
  //   const endTime = Math.floor(new Date().getTime() / 1000) + 5 * 60;
  //   // console.log('nonce ', nonce, ' endTime ', endTime);
  //   const signature = await this.signMessage(
  //     wallet,
  //     dto.chainId,
  //     nonce,
  //     dto.tokenAddress,
  //     dto.accountAddress,
  //     consumeGp,
  //     dto.delegatedValue,
  //     endTime,
  //   );
  //   return { signature, endTime };
  // }
  //
  // /**
  //  * 计算token or wrap token usd value
  //  * @param chainId
  //  * @param contract
  //  */
  // @RpcCall()
  // async _getContractTokenBalance(
  //   chainId: number,
  //   contractAddress: string,
  //   isNativeToken: boolean,
  // ) {
  //   const { tokenPrice } =
  //     await this.currencyService.getCachePriceByChainId(chainId);
  //   const provider =
  //     this.rpcHandlerService.createStaticJsonRpcProvider(chainId);
  //
  //   if (isNativeToken) {
  //     const balance = await provider.getBalance(contractAddress);
  //     const readableWarpedToken = new BigNumber(balance.toString()).dividedBy(
  //       1e18,
  //     );
  //     return readableWarpedToken.times((tokenPrice as any).price).toNumber();
  //   }
  //   let wrappedTokenAddress = '';
  //   switch (chainId) {
  //     case 1:
  //       wrappedTokenAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  //       break;
  //     case 56:
  //       wrappedTokenAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
  //       break;
  //     case 137:
  //       wrappedTokenAddress = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
  //       break;
  //     case 5000:
  //       wrappedTokenAddress = '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8';
  //       break;
  //     case 8453:
  //       wrappedTokenAddress = '0x4200000000000000000000000000000000000006';
  //       break;
  //     case 42161:
  //       wrappedTokenAddress = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
  //       break;
  //     case 43114:
  //       wrappedTokenAddress = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';
  //       break;
  //   }
  //   const wrappedTokenContract = new ethers5.Contract(
  //     wrappedTokenAddress,
  //     ERC20_ABI,
  //     provider,
  //   );
  //   // Get wrap Balance
  //   const wBalance = await wrappedTokenContract.balanceOf(contractAddress);
  //   const readableWarpedToken = new BigNumber(wBalance.toString()).dividedBy(
  //     1e18,
  //   );
  //   return readableWarpedToken.times((tokenPrice as any).price).toNumber();
  // }
  //
  // // sign message
  // async signMessage(
  //   wallet: Wallet,
  //   chainId: number,
  //   nonce: number,
  //   token: string,
  //   sender: string,
  //   consumedGp: number,
  //   delegatedValue: string,
  //   endTime: number,
  // ) {
  //   const messageHash = this._getMessageHash(
  //     nonce,
  //     token,
  //     sender,
  //     consumedGp,
  //     delegatedValue,
  //     endTime,
  //   );
  //   const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  //   return signature;
  // }
  //
  // _getMessageHash(
  //   nonce: number,
  //   token: string,
  //   sender: string,
  //   consumedGp: number,
  //   delegatedValue: string,
  //   endTime: number,
  // ): string {
  //   return ethers.keccak256(
  //     ethers.solidityPacked(
  //       ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint256'],
  //       [nonce, token, sender, consumedGp, delegatedValue, endTime],
  //     ),
  //   );
  // }
}
