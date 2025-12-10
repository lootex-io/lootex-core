import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AccountGpBalance } from '@/model/entities/gp/account-gp-balance.entitiy';
import {
  GpBalanceCostDTO,
  PaymasterCheckerDTO,
  PaymasterCheckerPlusDTO,
  PaymasterUserOperation,
} from '@/api/v3/account-gp/dto/account-gp.dto';
import { Account, Blockchain } from '@/model/entities';
import { ConfigService } from '@nestjs/config';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { LibsDao } from '@/core/dao/libs-dao';
import { BigNumber } from 'bignumber.js';
import { AccountGpBalanceHistory } from '@/model/entities/gp/account-gp-balance-history.entity';
import { GpTxEvent } from '@/model/entities/constant-model';
import { GpDao } from '@/core/dao/gp-dao';
import { LogService } from '@/core/log/log.service';
import { SdkEnvService } from '@/core/sdk/service/sdk-env.service';
import { SdkEnv } from '@/core/sdk/constants/env-constants';

@Injectable()
export class AccountGpService {
  protected readonly logger = new Logger(AccountGpService.name);

  constructor(
    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,
    @InjectModel(Account)
    private accountRepository: typeof Account,
    @InjectModel(AccountGpBalance)
    private accountGpBalanceRepository: typeof AccountGpBalance,
    @InjectModel(AccountGpBalanceHistory)
    private accountGpBalanceHistoryRepository: typeof AccountGpBalanceHistory,

    private readonly logService: LogService,
    private readonly libsDao: LibsDao,
    private readonly gpDao: GpDao,
    private readonly sdkEnvService: SdkEnvService,
    private readonly currencyService: CurrencyService,
    private readonly configService: ConfigService,
  ) {}

  async getExchangeRate() {
    return {
      lootGp: await this.sdkEnvService.getNumber(SdkEnv.GP_EXCHANGE_LOOT_GP),
      gpUsd: await this.sdkEnvService.getNumber(SdkEnv.GP_EXCHANGE_GP_USD),
    };
  }

  async getAccountGpBalance(accountId: string) {
    let balance = await this.accountGpBalanceRepository.findOne({
      where: { accountId: accountId },
    });
    if (!balance) {
      balance = await this.accountGpBalanceRepository.create({
        accountId: accountId,
      });
    }
    return {
      totalBalance: balance.totalBalance,
      availableBalance: balance.availableBalance,
      frozenBalance: balance.frozenBalance,
    };
  }

  async getGpBalanceCost(dto: GpBalanceCostDTO) {
    const { gasPrice, gasUsdPrice } = await this._calGasUsdFee(
      dto.chainId,
      dto.userOp,
    );
    const gasGpFee = await this._calGasGpFee(gasUsdPrice);
    this.logger.debug(`gasPrice ${gasPrice}, gasGpFee ${gasGpFee}`);
    const rateGpUsd = await this.sdkEnvService.getNumber(
      SdkEnv.GP_EXCHANGE_GP_USD,
    );
    return {
      gasGas: gasPrice,
      gasUsdPrice: gasUsdPrice,
      gasGpPrice: gasGpFee,
      gpUsd: rateGpUsd,
    };
  }

  /**
   * checker API webook for Biconomy
   * { arePoliciesVerified: true } 通过， { arePoliciesVerified: false } 不通过
   */
  async paymasterCheckerCallback(dto: PaymasterCheckerDTO) {
    // console.log(dto);
    const errorResult = { arePoliciesVerified: false };
    const account = await this.accountRepository.findOne({
      attributes: ['id'],
      where: { username: dto.data.username },
    });
    if (account) {
      const gpBalance = await this.getAccountGpBalance(account.id);
      const { gasPrice, gasUsdPrice } = await this._calGasUsdFee(
        dto.data.chainId,
        dto.data.userOp,
      );
      // const availableGpUsdPrice = new BigNumber(
      //   gpBalance.availableBalance,
      // ).times(this.rateGpUsd);
      // this.logger.debug(
      //   `gasPrice ${gasPrice}, gasUsdPrice ${gasUsdPrice}, availableGpUsdPrice ${availableGpUsdPrice}`,
      // );
      const gasGpFee = await this._calGasGpFee(gasUsdPrice);
      this.logger.debug(`gasGpFee ${-gasGpFee}`);
      // if (gasUsdPrice.lte(availableGpUsdPrice)) {
      if (
        new BigNumber(gasGpFee + '').lte(
          new BigNumber(gpBalance.availableBalance),
        )
      ) {
        if (dto.data.preview) {
          // 跳過扣款的動作
          return { arePoliciesVerified: true };
        }
        const res = await this.gpDao.createTransactionHistory({
          chainId: dto.data.chainId,
          accountId: account.id,
          amount: (-gasGpFee).toString(),
          event: GpTxEvent.TRANSACTION,
          gasFee: gasPrice.toString(),
          transactionSender: dto.data.userOp.sender.toLowerCase(),
          transactionNonce: new BigNumber(dto.data.userOp.nonce).toString(),
        });
        if (res) {
          this.logger.debug(
            `will return {arePoliciesVerified: true} in next line`,
          );
          // log
          this.logService.common('gp-out', { amount: gasGpFee });
          return { arePoliciesVerified: true };
        }
        return errorResult;
      } else {
        return errorResult;
      }
    }
    return errorResult;
  }

  paymasterCheckerPlusCallback(dto: PaymasterCheckerPlusDTO) {
    const data: PaymasterCheckerDTO = {
      data: {
        username: dto.data.username,
        chainId: dto.data.chainId,
        preview: dto.data.preview,
        userOp: dto.userOp,
      },
    };
    return this.paymasterCheckerCallback(data);
  }

  async _calGasUsdFee(chainId: number, userOperation: PaymasterUserOperation) {
    const { currency, tokenPrice } =
      await this.currencyService.getCachePriceByChainId(chainId);
    console.log(`symbol ${currency.symbol}, nativeTokenPrice `, tokenPrice);

    const callGasLimit = new BigNumber(userOperation.callGasLimit);
    const verificationGasLimit = new BigNumber(
      userOperation.verificationGasLimit,
    );
    const maxFeePerGas = new BigNumber(userOperation.maxFeePerGas);
    this.logger.debug(
      `callGasLimit ${callGasLimit.toNumber()}, verificationGasLimit ${verificationGasLimit.toNumber()}, maxFeePerGas ${maxFeePerGas.toNumber()}`,
    );
    /**
     * gasPrice = (callGasLimit+ verificationGasLimit+preVerificationGas) * maxFeePerGas
     */
    const gasPrice = callGasLimit
      .plus(verificationGasLimit)
      .times(maxFeePerGas)
      .shiftedBy(-currency.decimals);
    const gasUsdPrice = gasPrice.times(
      new BigNumber((tokenPrice as any).price),
    );
    return { gasPrice, gasUsdPrice };
  }

  async _calGasGpFee(gasUsdPrice: BigNumber) {
    const rateGpUsd = await this.sdkEnvService.getNumber(
      SdkEnv.GP_EXCHANGE_GP_USD,
    );
    const gasGpPrice = gasUsdPrice.dividedBy(rateGpUsd).toNumber();
    const gasGpIntPrice = Math.ceil(gasGpPrice);
    return gasGpIntPrice;
  }
}
