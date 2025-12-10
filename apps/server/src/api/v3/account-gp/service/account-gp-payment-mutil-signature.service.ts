import { Injectable } from '@nestjs/common';
import { GpPaymentSignatureDto } from '@/api/v3/account-gp/dto/account-gp.dto';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { BigNumber } from 'bignumber.js';
import { Currency, Wallet as AccountWallet } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { ethers, Wallet } from 'ethers-v6';
import { ethers as ethers5 } from 'ethers';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import { GP_PAYMENT_CONTRACT_ABI } from '@/api/v3/account-gp/constants';
import { ConfigService } from '@nestjs/config';
import { GpDao } from '@/core/dao/gp-dao';
import { SimpleException } from '@/common/utils/simple.util';
import { ERC20_ABI } from '@/core/third-party-api/rpc/constants';
import { AWS_SQS_TX_TRACKING_URL, QUEUE_ENV } from '@/common/utils';
import { QueueService } from '@/external/queue/queue.service';
import {
  TxTrackingGPPayData,
  TxTrackingType,
} from '@/microservice/tx-tracking/tx-tracking-constants';
import { GP_PURCHASE_PROJECTS } from '@/microservice/event-poller-gp/constants';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

@Injectable()
export class AccountGpPaymentMutilSignatureService {
  private gpPaymentPriKey;
  private gpPaymentPriKey1;
  private gpPaymentPriKey2;
  private readonly gpPaymentAmountLimit: number;
  constructor(
    @InjectModel(Currency)
    private currencyRepository: typeof Currency,
    @InjectModel(AccountWallet)
    private walletRepository: typeof AccountWallet,

    private readonly currencyService: CurrencyService,
    private readonly gpDao: GpDao,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly rpcHandlerService: RpcHandlerService,
  ) {
    // this.gpPaymentPriKey = this.configService.get<string>('GP_PAYMENT_PRI_KEY');
    // this.gpPaymentPriKey1 = this.configService.get<string>(
    //   'GP_PAYMENT_PRI_KEY1',
    // );
    // this.gpPaymentPriKey2 = this.configService.get<string>(
    //   'GP_PAYMENT_PRI_KEY2',
    // );
    this.gpPaymentAmountLimit = this.configService.get<number>(
      'GP_PAYMENT_AMOUNT_LIMIT',
    );
    this.getWalletPriKeys().then((priKeys) => {
      if (priKeys && priKeys.length == 3) {
        this.gpPaymentPriKey = priKeys[0];
        this.gpPaymentPriKey1 = priKeys[1];
        this.gpPaymentPriKey2 = priKeys[2];
        console.log('getWalletPriKeys success');
        // console.log(
        //   `${this.gpPaymentPriKey}, ${this.gpPaymentPriKey1}, ${this.gpPaymentPriKey2}`,
        // );
      }
    });
  }

  async getWalletPriKeys() {
    const secret_name = 'wallet';
    const client = new SecretsManagerClient({
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_ACCESS_KEY_SECRET'),
      },
      region: this.configService.get('AWS_SQS_REGION'),
    });
    try {
      const response = await client.send(
        new GetSecretValueCommand({
          SecretId: secret_name,
          VersionStage: 'AWSCURRENT', // VersionStage defaults to AWSCURRENT if unspecified
        }),
      );
      const secret = response.SecretString;
      // console.log('secret response', response);
      return JSON.parse(secret)['wallet'].split(',');
    } catch (error) {
      console.log('getWalletPriKeys ', error.message);
    }
    return [];
  }

  /**
   * 代付nft接口：給定用戶想代付的貨幣數量與消耗的 GP ，獲取 admin 簽名
   */
  async getPaymentSignature(accountId: string, dto: GpPaymentSignatureDto) {
    const wallets = await this.walletRepository.findAll({
      attributes: ['address'],
      where: {
        accountId: accountId,
      },
    });
    if (
      !wallets
        .map((e) => e.address)
        .find((e) => e.toLowerCase() === dto.accountAddress.toLowerCase())
    ) {
      throw SimpleException.error('accountAddress invalid.');
    }

    // 计算deleteValue usd
    const { tokenPrice } = await this.currencyService.getCachePriceByChainId(
      dto.chainId,
    );
    const deletedTokenAmount = new BigNumber(
      dto.delegatedValue.toString(),
    ).dividedBy(1e18);
    const deletedTokenUsd = deletedTokenAmount
      .times((tokenPrice as any).price)
      .toNumber();

    const consumeGp = parseInt(dto.consumedGp);
    // const lootPrice = (await this.currencyService.getCachePrice('LOOTUSD'))
    //   .price;
    // const consumeGpUsd = new BigNumber(consumeGp).times(lootPrice);
    // console.log('consumeGpUsd ', consumeGpUsd.toNumber());
    // 校验：
    // 校验1：單筆交易 GP 補助的最大上限 (50000 gp)
    if (consumeGp > this.gpPaymentAmountLimit) {
      throw SimpleException.error(
        `This transaction exceeds the single payment limit`,
      );
    }

    // 校验2：檢查 Proxy 合約餘額是否足夠 (Native token & Wrap token )
    const contractAddress = GP_PURCHASE_PROJECTS.find(
      (e) => e.chainId == dto.chainId,
    ).contractAddress;
    const isNativeToken = !dto.symbol.toLowerCase().startsWith('w');
    const contractTokenUsd = await this._getContractTokenBalance(
      dto.chainId,
      contractAddress,
      isNativeToken,
    );

    console.log(
      `getPaymentSignature contractTokenUsd ${contractTokenUsd}, deletedTokenUsd ${deletedTokenUsd} `,
    );
    if (contractTokenUsd < deletedTokenUsd) {
      throw SimpleException.error(
        `The current payment account balance is insufficient. Please contact the appropriate personnel for assistance`,
      );
    }

    const { signatures, endTime, blockNumber } =
      await this._calPaymentSignature(+dto.chainId, dto);
    if (consumeGp == 0) {
      // 如果 consumeGp, 代表不能gp pay的订单，直接返回，不创建gp消费记录及tracking
      return { signatures, endTime };
    } else {
      // 5分钟后触发一条sqs，用来追中GP PAY结果
      const txTrackingGPPayData: TxTrackingGPPayData = {
        chainId: dto.chainId,
        accountId: accountId,
        walletAddress: dto.accountAddress,
        endTime: endTime,
        fromBlockNumber: blockNumber,
        consumeGp: consumeGp,
        signatures: signatures,
      };
      await this.queueService.sendMessageToSqsCacheable({
        queueUrl: this.configService.get(AWS_SQS_TX_TRACKING_URL),
        payload: {
          type: TxTrackingType.GP_PAY,
          data: txTrackingGPPayData,
        },
        delaySecond: 300,
        expiredTime: this.configService.get(QUEUE_ENV.AWS_TX_TRACKING_EXPIRED), // 同一个消息300s最多发一次
      });
      const success = await this.gpDao.createPaymentTransactionHistory({
        chainId: dto.chainId,
        accountId: accountId,
        transactionSender: dto.accountAddress.toLowerCase(),
        amount: (-Math.abs(consumeGp)).toString(),
        args: {
          signatures: signatures,
          endTime: endTime,
          consumeGp: consumeGp,
          fromBlockNumber: blockNumber,
        },
      });
      if (success) {
        return { signatures, endTime };
      } else {
        throw SimpleException.error('Create history failed.');
      }
    }
  }

  @RpcCall()
  async _calPaymentSignature(chainId: number, dto: GpPaymentSignatureDto) {
    const consumeGp = parseInt(dto.consumedGp);
    const provider = new ethers.JsonRpcProvider(
      this.rpcHandlerService.getRpcUrl(dto.chainId),
    );
    const wallet = new ethers.Wallet(this.gpPaymentPriKey, provider);
    const wallet1 = new ethers.Wallet(this.gpPaymentPriKey1, provider);
    const wallet2 = new ethers.Wallet(this.gpPaymentPriKey2, provider);
    const contractAddress = GP_PURCHASE_PROJECTS.find(
      (e) => e.chainId == dto.chainId,
    ).contractAddress;
    const contract = new ethers.Contract(
      contractAddress,
      GP_PAYMENT_CONTRACT_ABI,
      wallet,
    );
    const contract1 = new ethers.Contract(
      contractAddress,
      GP_PAYMENT_CONTRACT_ABI,
      wallet1,
    );
    const contract2 = new ethers.Contract(
      contractAddress,
      GP_PAYMENT_CONTRACT_ABI,
      wallet2,
    );
    const nonce = await contract.nonce(dto.accountAddress);
    const nonce1 = await contract1.nonce(dto.accountAddress);
    const nonce2 = await contract2.nonce(dto.accountAddress);

    // 有效时间5分钟
    const endTime = Math.floor(new Date().getTime() / 1000) + 5 * 60;
    // console.log('nonce ', nonce, ' endTime ', endTime);
    const signature = await this.signMessage(
      wallet,
      dto.chainId,
      nonce,
      dto.tokenAddress,
      dto.accountAddress,
      consumeGp,
      dto.delegatedValue,
      endTime,
    );
    const signature1 = await this.signMessage(
      wallet1,
      dto.chainId,
      nonce1,
      dto.tokenAddress,
      dto.accountAddress,
      consumeGp,
      dto.delegatedValue,
      endTime,
    );
    const signature2 = await this.signMessage(
      wallet2,
      dto.chainId,
      nonce2,
      dto.tokenAddress,
      dto.accountAddress,
      consumeGp,
      dto.delegatedValue,
      endTime,
    );
    return {
      signatures: [signature, signature1, signature2],
      endTime,
      blockNumber: await provider.getBlockNumber(),
    };
  }

  /**
   * 计算token or wrap token usd value
   * @param chainId
   * @param contract
   */
  @RpcCall()
  async _getContractTokenBalance(
    chainId: number,
    contractAddress: string,
    isNativeToken: boolean,
  ) {
    const { tokenPrice } =
      await this.currencyService.getCachePriceByChainId(chainId);
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProvider(chainId);

    if (isNativeToken) {
      const balance = await provider.getBalance(contractAddress);
      const readableWarpedToken = new BigNumber(balance.toString()).dividedBy(
        1e18,
      );
      return readableWarpedToken.times((tokenPrice as any).price).toNumber();
    }
    let wrappedTokenAddress = '';
    switch (chainId) {
      case 1:
        wrappedTokenAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
        break;
      case 56:
        wrappedTokenAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
        break;
      case 137:
        wrappedTokenAddress = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
        break;
      case 5000:
        wrappedTokenAddress = '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8';
        break;
      case 8453:
        wrappedTokenAddress = '0x4200000000000000000000000000000000000006';
        break;
      case 42161:
        wrappedTokenAddress = '0x82af49447d8a07e3bd95bd0d56f35241523fbab1';
        break;
      case 43114:
        wrappedTokenAddress = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';
        break;
    }
    const wrappedTokenContract = new ethers5.Contract(
      wrappedTokenAddress,
      ERC20_ABI,
      provider,
    );
    // Get wrap Balance
    const wBalance = await wrappedTokenContract.balanceOf(contractAddress);
    const readableWarpedToken = new BigNumber(wBalance.toString()).dividedBy(
      1e18,
    );
    return readableWarpedToken.times((tokenPrice as any).price).toNumber();
  }

  // sign message
  async signMessage(
    wallet: Wallet,
    chainId: number,
    nonce: number,
    token: string,
    sender: string,
    consumedGp: number,
    delegatedValue: string,
    endTime: number,
  ) {
    const messageHash = this._getMessageHash(
      nonce,
      token,
      sender,
      consumedGp,
      delegatedValue,
      endTime,
    );
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));
    return signature;
  }

  _getMessageHash(
    nonce: number,
    token: string,
    sender: string,
    consumedGp: number,
    delegatedValue: string,
    endTime: number,
  ): string {
    return ethers.keccak256(
      ethers.solidityPacked(
        ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint256'],
        [nonce, token, sender, consumedGp, delegatedValue, endTime],
      ),
    );
  }
}
