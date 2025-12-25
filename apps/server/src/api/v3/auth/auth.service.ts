import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { ethers } from 'ethers';
import nacl from 'tweetnacl';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CacheService } from '@/common/cache';
import { ConfigurationService } from '@/configuration/configuration.service';
import { AUTH_CHALLENGE_CACHE_KEY_TEMPLATE } from '@/common/utils/constants';
import { AccountAuthBaseDto, AccountSignUpDto } from './auth.dto';
import {
  AuthSupportedAddress,
  AuthSupportedChainFamily,
  AuthSupportedWalletProviderEnum,
  AuthSupportedWalletTransport,
  AuthTorusVerifierTypes,
  LootexJwtPayload,
  SocialConnect,
  SocialPlatform,
} from './auth.interface';
// removed SendInBlueService
import { Account } from '@/model/entities/account.entity';
import { Wallet } from '@/model/entities/wallet.entity';
import { BlockchainService, EthAddress } from '@/external/blockchain';
import { StringOfLength } from '@/common/utils/utils.interface';
import { JwtService } from '@nestjs/jwt';
import { Op, Sequelize, Transaction } from 'sequelize';
import { firstValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/sequelize';
import { ProviderTokens } from '@/model/providers';
import { BlockStatus } from '@/model/entities/constant-model';
import { AccountService } from '../account/account.service';
import { PrivyClient, WalletWithMetadata } from '@privy-io/server-auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires

// import { verifyMessage } from '@mysten/sui.js';
import {
  createSmartAccountClient,
  createECDSAOwnershipValidationModule,
} from '@biconomy/account';
import * as promise from 'bluebird';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { ChainId } from '@/common/utils/types';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { SimpleException, SimpleJson } from '@/common/utils/simple.util';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Account)
    private readonly accountRepository: typeof Account,

    @InjectModel(Wallet)
    private readonly walletsRepository: typeof Wallet,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly httpService: HttpService,

    private readonly cacheService: CacheService,

    private readonly configurationService: ConfigurationService,

    private readonly jwtService: JwtService,

    private readonly blockchainService: BlockchainService,

    private readonly gatewayService: GatewayService,

    private readonly rpcHandlerService: RpcHandlerService,
  ) {
    // this.testGenerateJwtToken('icesimon', '180d').then((res) =>
    //   console.log('jwt-token ', res),
    // );
  }

  async testGenerateJwtToken(username: string, expiresIn = '4h') {
    const account = await this.accountRepository.findOne({
      where: { username },
      include: [
        {
          attributes: ['id', 'address', 'provider'],
          model: Wallet,
          as: 'wallets',
        },
      ],
    });
    const payload = new LootexJwtPayload(
      account.id,
      account.email,
      account.username,
      account.avatarUrl,
      account.wallets[0].id,
    );

    return this.jwtService.signAsync(payload.toObject(), {
      secret: this.configurationService.get('JWT_SECRET'),
      algorithm: this.configurationService.get('JWT_ALGORITHM'),
      expiresIn: expiresIn,
    });
  }

  /**
   * @private
   * @async
   * @function isEmailOrUsernameAlreadyUsed
   * @summary is this sign up info already used?
   * @param {String} email email address to use in query
   * @param {String} username username string to use in query
   * @return {Promise<Boolean>} isAlreadyUsed
   */

  /**
   * @private
   * @async
   * @function createUserAccountAndWallet
   * @summary shared function to create initial account+wallet pair
   * @param {String} email email address
   * @param {String} username '@username' field of the payload
   * @param {AuthSupportedWalletTransport} transport wallet transport
   * @param {AuthSupportedWalletProviderEnum} provider identified wallet provider
   * @param {AuthSupportedChainFamily} chainFamily defined chain families
   * @param {AuthSupportedAddress} address address of target chain family
   * @return {Promise<[Account, Wallet]>} createdAccountAndWallet
   */

  /**
   * @function getSecureRandomNumber
   * @description generates a random number using native crypto module
   * @param {Number} length length of your random number, default: 6
   * @return {Number} n
   */

  // /**
  //  * @async
  //  * @function verifyOneTimeChallengeFlow
  //  * @summary verify Flow signature
  //  * @param {FlowAddress} address Flow wallet address
  //  * @return {Promise<Boolean>} isValid
  //  */
  // async verifyOneTimeChallengeFlow(
  //   address: FlowAddress,
  //   compositeSignatures: Array<FlowCompositeSignature>,
  // ): Promise<boolean> {
  //   const challenge: string = await this.cacheService.getCache(
  //     AUTH_CHALLENGE_CACHE_KEY_TEMPLATE.replace('%c', 'FLOW').replace(
  //       '%a',
  //       address,
  //     ),
  //   );
  //   if (!compositeSignatures.length)
  //     if (!challenge)
  //       throw new TypeError('verifyOneTimeChallengeFlow: where data?');
  //   const challengeHex: string = ethers.utils.id(challenge).slice(2);
  //   // const fclInstance: fcl = this.blockchainService.getFlowLibrary();
  //   return fclInstance.AppUtils?.verifyUserSignatures(
  //     challengeHex,
  //     compositeSignatures,
  //   );
  // }

  // verifyEmailOTP removed

  // ==========================================================================
  // Sign Up Section
  // ==========================================================================

  /**
   * @async
   * @function handleSignUpEth
   * @description handles sign-up by Ethereum Wallet, either EOA or ERC-1271 contracts
   * @param {AccountSignUpDto} accountSignUpDto sign up payload
   * @return {Promise<[Account, Wallet]>} [account, wallet]
   */

  /**
   * DANGER: This function is for internal use only, do not expose to the public
   * 危險: 請謹慎使用此function，不要對外公開
   * @param accountId
   * @returns
   */
  async getJwtTokenByAccountId(accountId: string): Promise<string> {
    const account = await this.accountRepository.findOne({
      attributes: ['id', 'email', 'username', 'avatarUrl'],
      where: {
        id: accountId,
      },
      include: [
        {
          attributes: ['id', 'address', 'provider'],
          model: Wallet,
          as: 'wallets',
        },
      ],
    });

    if (!account) {
      throw new HttpException(
        `Account not found (or not bound)`,
        HttpStatus.BAD_REQUEST,
      );
    }

    this._checkAccountOrThrowException(account);
    const payload = new LootexJwtPayload(
      account.id,
      account.email,
      account.username,
      account.avatarUrl,
      account.wallets[0].id,
    );

    return this.jwtService.signAsync(payload.toObject(), {
      secret: this.configurationService.get('JWT_SECRET'),
      algorithm: this.configurationService.get('JWT_ALGORITHM'),
      expiresIn: this.configurationService.get('JWT_EXPIRES_IN'),
    });
  }

  /**
   * @async
   * @function handleBindWalletAndSignInEth
   * @summary creates a new ETH wallet record for the account to sign in with
   * @param {AccountNewWalletSignUpDto} accountSignUpDto payload, sign up format
   * @return {Promise<[Account,Wallet]>} newWallet
   */
  private _checkAccountOrThrowException(account: Account) {
    if (account.block === BlockStatus.BLOCKED) {
      throw new HttpException('Account FORBIDDEN', HttpStatus.FORBIDDEN);
    }
  }

  async isWalletAddressRegistered(address: string): Promise<boolean> {
    const walletAddress = address?.toLowerCase();
    const wallet = await this.walletsRepository.findOne({
      attributes: ['id'],
      where: {
        address: walletAddress,
      },
    });

    return !!wallet;
  }
}
