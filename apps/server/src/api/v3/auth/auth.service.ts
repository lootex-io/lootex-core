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
import {
  AUTH_CHALLENGE_CACHE_KEY_TEMPLATE,
} from '@/common/utils/constants';
import {
  AccountAuthBaseDto,
  AccountSignUpDto,
} from './auth.dto';
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
import { AccountReferral, AccountSocialToken } from '@/model/entities';
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
import { modifyGmail } from '@/common/utils/modify-gmail';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { ChainId } from '@/common/utils/types';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { SimpleException, SimpleJson } from '@/common/utils/simple.util';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';

import { BiruDiscordWallet } from '@/model/entities/biru/biru-wallet-discord.entity';


@Injectable()
export class AuthService {
  private readonly ERC1271_MATCH_VALUE = '0x1626ba7e';
  private readonly logger = new Logger(AuthService.name);



  constructor(
    @InjectModel(Account)
    private readonly accountRepository: typeof Account,

    @InjectModel(Wallet)
    private readonly walletsRepository: typeof Wallet,

    @InjectModel(AccountReferral)
    private readonly referralRepository: typeof AccountReferral,

    @InjectModel(AccountSocialToken)
    private readonly accountSocialTokenRepository: typeof AccountSocialToken,

    @InjectModel(BiruDiscordWallet)
    private readonly biruDiscordWalletRepository: typeof BiruDiscordWallet,

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
  private async isEmailOrUsernameAlreadyUsed(
    email: string,
    username: string,
  ): Promise<boolean> {
    return (
      (await this.accountRepository.count({
        where: {
          [Op.or]: [{ email }, { username }],
        },
      })) > 0
    );
  }

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
  private async createUserAccountAndWallet(
    transport: AuthSupportedWalletProviderEnum,
    provider: AuthSupportedWalletProviderEnum, // Wait, transport is AuthSupportedWalletTransport
    chainFamily: AuthSupportedChainFamily,
    address: AuthSupportedAddress,
    option?: {
      privyUserId?: string;
      ip?: string;
      area?: string;
    },
  ): Promise<[Account, Wallet]> {
    // Auto-generate username from address if not provided
    const username = `user_${address.slice(2, 8)}`;
    const email = null;
    try {
      return await this.sequelizeInstance.transaction(
        async (t: Transaction) => {
          const newAccount: Account = await this.accountRepository.create(
            {
              email,
              username,
              privyUserId: option?.privyUserId,
              registerIp: option?.ip,
              registerArea: option?.area,
            },
            { transaction: t },
          );

          const newWallet: Wallet = await this.walletsRepository.create(
            {
              accountId: newAccount.id,
              transport: transport as any, // Fix type mismatch if any
              provider,
              chainFamily,
              address,
              isMainWallet: option?.privyUserId ? false : true,
            },
            { transaction: t },
          );

          // 使用 Privy 的時候需要用 embed wallet 的地址去計算出 smart account 的地址
          if (option?.privyUserId) {
            const provider =
              this.rpcHandlerService.createStaticJsonRpcProvider(1);
            const signer = provider.getSigner(address);
            const ecdsaModuleConfig = { signer };

            const defaultValidationModule =
              await createECDSAOwnershipValidationModule(ecdsaModuleConfig);

            const bundlerKey = this.configurationService.get(
              'BICONOMY_BUNDLER_KEY',
            );

            const bundlerUrl = `https://bundler.biconomy.io/api/v2/1/${bundlerKey}`;

            const smartAccount = await createSmartAccountClient({
              defaultValidationModule,
              bundlerUrl,
            });

            const saWallet = (
              await smartAccount.getAccountAddress()
            ).toLowerCase();
            await this.walletsRepository.create(
              {
                accountId: newAccount.id,
                transport,
                provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
                chainFamily,
                address: saWallet,
                isMainWallet: true,
              },
              { transaction: t },
            );
          }
          return [newAccount, newWallet];
        },
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @function getSecureRandomNumber
   * @description generates a random number using native crypto module
   * @param {Number} length length of your random number, default: 6
   * @return {Number} n
   */
  getSecureRandomNumber(length = 6): number {
    return crypto.randomInt(0, 10 ** length);
  }

  /**
   * @function getSecureRandomNumberStr
   * @description generates a random number using native crypto module, outputs padded string
   * @param {Number} length length of your random number, default: 6
   * @return {String} n
   */
  getSecureRandomNumberStr(length = 6): string {
    return `${new Array(length).fill('0').join('')}${this.getSecureRandomNumber(
      length,
    )}`.slice(0 - length);
  }

  /**
   * @function generateOneTimeChallengeByAddress
   * @description gives an one-time challenge with designated address
   *              generation uses lower cased HEX string for address
   * @param {String} address Arbitrary address to use
   * @return {String} challenge
   */
  generateOneTimeChallengeByAddress(address: string): string {
    const nonce = ethers.utils.sha256(
      ethers.utils.toUtf8Bytes(
        [address.toLowerCase(), this.getSecureRandomNumberStr(8)].join(''),
      ),
    );

    const authText = `Welcome to Lootex!\n\nClick to sign in and accept the Lootex Terms of Service (https://lootex.io/terms) and Privacy Policy (https://lootex.io/privacy). This request will not trigger any blockchain transaction or cost any gas fees. Your authentication status will reset after — hours.\n\nWallet address:\n${address}\n\nNonce:\n${nonce}`;

    return authText;
  }

  /**
   * @async
   * @function getOneTimeChallenge
   * @summary gives challenge string and updates cache
   * @param {String} address arbitrary wallet address
   * @param {AuthSupportedChainFamily} chainFamily designated chain family
   * @return {Promise<string>} challenge
   */
  async getOneTimeChallenge(
    address: string,
    chainFamily: AuthSupportedChainFamily,
  ): Promise<string> {
    try {
      const challenge: string = this.generateOneTimeChallengeByAddress(address);
      return this.cacheService
        .setCache(
          AUTH_CHALLENGE_CACHE_KEY_TEMPLATE.replace('%c', chainFamily).replace(
            '%a',
            address,
          ),
          challenge,
          180,
        )
        .then(() => challenge);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * @async
   * @function verifyOneTimeChallengeEth
   * @description verifies ETH format signature for Lootex ID. Gives bool result.
   * @param {String} address ETH address for the wallet we want to check against
   * @param {String} signature Signature for ecrecover function
   * @return {Promise<Boolean>} isValid
   */
  async verifyOneTimeChallengeEth(
    address: EthAddress,
    signature: string,
  ): Promise<boolean> {
    const challenge: string = await this.cacheService.getCache(
      AUTH_CHALLENGE_CACHE_KEY_TEMPLATE.replace('%c', 'ETH').replace(
        '%a',
        address,
      ),
    );
    if (!challenge)
      throw new TypeError('verifyOneTimeChallengeEth: not recognised');
    return (
      address.toLowerCase() ===
      ethers.utils.verifyMessage(challenge, signature).toLowerCase()
    );
  }

  /**
   * @async
   * @function verifyOneTimeChallengeEthErc1271
   * @summary verifies ETH format signature for Lootex ID & contract wallet. Gives bool result.
   *          Using ERC-1271 standard.
   * @param {String} address ETH address for the wallet we want to check against
   * @param {String} signature Signature for ecrecover function
   * @param {Number} chainId (ERC-1271 specific) deployment target chain for
   *                the contract wallet since our code needs to call the contract
   * @return {Promise<Boolean>} isValid
   */
  async verifyOneTimeChallengeEthErc1271(
    address: EthAddress,
    signature: string,
    chainId: number,
  ): Promise<boolean> {
    const challenge: string = await this.cacheService.getCache(
      AUTH_CHALLENGE_CACHE_KEY_TEMPLATE.replace('%c', 'ETH').replace(
        '%a',
        address,
      ),
    );

    if (!challenge) {
      this.logger.debug('verifyOneTimeChallengeEthErc1271: where data?');
      return false;
    }

    const isValidSignature =
      await this.gatewayService.nativeGetERC1271IsValidSignature(
        chainId.toString() as ChainId,
        address,
        challenge,
        signature,
      );

    return isValidSignature === this.ERC1271_MATCH_VALUE;
  }

  async verifyOneTimeChallengeEthErc6492(
    address: EthAddress,
    signature: string,
    message: string,
  ): Promise<boolean> {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(this.rpcHandlerService.getRpcUrl(1)),
    });

    const valid = await client.verifyMessage({
      address: address as any,
      message,
      signature: signature as any,
    });

    return valid;
  }

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
  async handleSignUpEth(
    accountSignUpDto: AccountSignUpDto,
    ip?: string,
    area?: string,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. Signature verification
    if (accountSignUpDto.isErc1271Wallet) {
      // ERC-1271 Contract Wallet Standard
      if (
        !(await this.verifyOneTimeChallengeEthErc1271(
          accountSignUpDto.address as EthAddress,
          accountSignUpDto.signature,
          accountSignUpDto.chainId,
        ))
      ) {
        this.logger.debug(
          `handleSignUpEth: ${accountSignUpDto.address} ERC1271 invalid`,
        );
        if (
          !(await this.verifyOneTimeChallengeEthErc6492(
            accountSignUpDto.address as EthAddress,
            accountSignUpDto.signature,
            accountSignUpDto.message,
          ))
        ) {
          this.logger.debug(
            `handleSignUpEth: ${accountSignUpDto.address} ERC6492 invalid`,
          );
          throw new TypeError(
            'handleSignUpEth: invalid signature',
          );
        }
      }
    } else {
      // Normal Signature Recovery Method
      if (
        !(await this.verifyOneTimeChallengeEth(
          accountSignUpDto.address as EthAddress,
          accountSignUpDto.signature,
        ))
      )
        throw new TypeError('handleSignUpEth: invalid signature');
    }

    // 2. Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: accountSignUpDto.address },
      })
    )
      throw new TypeError('handleSignUpEth: wallet exists, sign in instead');

    // 3. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      accountSignUpDto.transport as any,
      accountSignUpDto.provider,
      accountSignUpDto.chainFamily,
      accountSignUpDto.address,
      { ip, area },
    );
  }

  /**
   * @async
   * @function handleSignInEth
   * @description handles sign-in by Ethereum wallets
   * @param {AccountAuthBaseDto} accountSignInDto sign in payload
   * @return {Promise<string>} jwt_string
   */
  async handleSignInEth(accountSignInDto: AccountAuthBaseDto): Promise<string> {
    try {
      // @note Refer to STORY-090215 for spec.
      // 1. Signature verification
      if (accountSignInDto.isErc1271Wallet) {
        // ERC-1271 Contract Wallet Standard
        if (
          !(await this.verifyOneTimeChallengeEthErc1271(
            accountSignInDto.address as EthAddress,
            accountSignInDto.signature,
            accountSignInDto.chainId,
          ))
        ) {
          this.logger.debug(
            `handleBindWalletAndSignInEth: ${accountSignInDto.address} ERC1271 invalid`,
          );
          if (
            !(await this.verifyOneTimeChallengeEthErc6492(
              accountSignInDto.address as EthAddress,
              accountSignInDto.signature,
              accountSignInDto.message,
            ))
          ) {
            this.logger.debug(
              `handleBindWalletAndSignInEth: ${accountSignInDto.address} ERC6492 invalid`,
            );
            throw new HttpException(
              'handleBindWalletAndSignInEth: invalid signature',
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      } else {
        // Normal Signature Recovery Method
        if (
          !(await this.verifyOneTimeChallengeEth(
            accountSignInDto.address as EthAddress,
            accountSignInDto.signature,
          ))
        )
          throw new HttpException(
            'handleSignInEth: invalid signature',
            HttpStatus.BAD_REQUEST,
          );
      }
      // @note at this step, we can verify that the user has actual
      //       custody of this ETH address since the signature is correct

      // 2. Verify UserWallet and UserAccount validity
      const currentWallet: Wallet = await this.walletsRepository.findOne({
        where: {
          address: accountSignInDto.address,
        },
      });
      if (!currentWallet)
        throw new HttpException(
          'handleSignInEth: Wallet not recognised',
          HttpStatus.BAD_REQUEST,
        );
      const currentAccount: Account = await this.accountRepository.findByPk(
        currentWallet.accountId,
      );
      if (!currentAccount)
        throw new HttpException(
          'handleSignInEth: Account not found',
          HttpStatus.BAD_REQUEST,
        );
      this._checkAccountOrThrowException(currentAccount);
      // 3. Returns the JSON web token for this sign-in
      const payload = new LootexJwtPayload(
        currentAccount.id,
        currentAccount.email,
        currentAccount.username,
        currentAccount.avatarUrl,
        currentWallet.id,
      );
      return this.jwtService.signAsync(payload.toObject(), {
        secret: this.configurationService.get('JWT_SECRET'),
        algorithm: this.configurationService.get('JWT_ALGORITHM'),
        expiresIn: this.configurationService.get('JWT_EXPIRES_IN'),
      });
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

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
