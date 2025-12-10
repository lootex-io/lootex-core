import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { ethers } from 'ethers';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
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
  AUTH_APTOS_SIGNUP_TEMPLATE,
  AUTH_CHALLENGE_CACHE_KEY_TEMPLATE,
  AUTH_EMAIL_OTP_KEY_TEMPLATE,
} from '@/common/utils/constants';
import {
  AccountAuthBaseDto,
  AccountNewWalletSignUpDto,
  AccountPrivySignUpDto,
  AccountSignUpDto,
  AccountTorusNewWalletSignUpDto,
  AccountTorusSignUpDto,
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
import {
  EmailRecipient,
  EmailSentResult,
} from '@/external/send-in-blue/send-in-blue.interface';
import { SendInBlueService } from '@/external/send-in-blue/send-in-blue.service';
import { Account } from '@/model/entities/account.entity';
import { Wallet } from '@/model/entities/wallet.entity';
import {
  AptosAddress,
  BlockchainService,
  EthAddress,
  SolAddress,
  SuiAddress,
} from '@/external/blockchain';
import { StringOfLength } from '@/common/utils/utils.interface';
import { JwtService } from '@nestjs/jwt';
import { Op, Sequelize, Transaction } from 'sequelize';
import { getOtpEmailHtmlTemplate } from './constants';
import { AccountReferral, AccountSocialToken } from '@/model/entities';
import { firstValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/sequelize';
import { ProviderTokens } from '@/model/providers';
import { BlockStatus } from '@/model/entities/constant-model';
import { AccountService } from '../account/account.service';
import { PrivyClient, WalletWithMetadata } from '@privy-io/server-auth';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Torus = require('@toruslabs/torus-embed');
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
import { createAuth, LoginPayload } from 'thirdweb/auth';
import { createThirdwebClient, ThirdwebClient } from 'thirdweb';
import { privateKeyToAccount } from 'thirdweb/wallets';
import { Account as ThirdwebAccount } from 'thirdweb/wallets';

@Injectable()
export class AuthService {
  private readonly ERC1271_MATCH_VALUE = '0x1626ba7e';
  private readonly logger = new Logger(AuthService.name);

  private readonly thirdwebClient: ThirdwebClient;
  private readonly thirdwebAdminAccount: ThirdwebAccount;
  private readonly thirdwebAuth: ReturnType<typeof createAuth>;

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

    private readonly sendInBlueService: SendInBlueService,

    private readonly accountService: AccountService,

    private readonly gatewayService: GatewayService,

    private readonly rpcHandlerService: RpcHandlerService,
  ) {
    // this.testGenerateJwtToken('icesimon', '180d').then((res) =>
    //   console.log('jwt-token ', res),
    // );
    this.thirdwebClient = createThirdwebClient({
      clientId:
        configurationService.get<string>('BIRU_THIRDWEB_CLIENT_ID') || '',
    });

    this.thirdwebAdminAccount = privateKeyToAccount({
      client: this.thirdwebClient,
      privateKey:
        configurationService.get<string>('BIRU_THIRDWEB_PRIVATE_KEY') || '',
    });

    this.thirdwebAuth = createAuth({
      domain:
        configurationService.get<string>('NODE_ENV') == 'development'
          ? 'preview.lootex.dev'
          : 'lootex.io',
      client: this.thirdwebClient,
      adminAccount: this.thirdwebAdminAccount,
    });
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
    email: string,
    username: string,
    transport: AuthSupportedWalletTransport,
    provider: AuthSupportedWalletProviderEnum,
    chainFamily: AuthSupportedChainFamily,
    address: AuthSupportedAddress,
    option?: {
      privyUserId?: string;
      ip?: string;
      area?: string;
    },
  ): Promise<[Account, Wallet]> {
    try {
      return await this.sequelizeInstance.transaction(
        async (t: Transaction) => {
          const newAccount: Account = await this.accountRepository.create(
            {
              email,
              username,
              referralCode: await this.generateReferralCode(),
              privyUserId: option?.privyUserId,
              registerIp: option?.ip,
              registerArea: option?.area,
            },
            { transaction: t },
          );

          const newWallet: Wallet = await this.walletsRepository.create(
            {
              accountId: newAccount.id,
              transport,
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

  /**
   * @async
   * @function verifyOneTimeChallengeSol
   * @summary verify Solana challenge signature
   * @param {SolAddress} address Solana wallet address
   * @param {string} signature signature of the challenge
   * @param {string} publicKey Solana wallet key
   * @return {Promise<Boolean>} isValid
   */
  async verifyOneTimeChallengeSol(
    address: SolAddress,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    const challenge: string = await this.cacheService.getCache(
      AUTH_CHALLENGE_CACHE_KEY_TEMPLATE.replace('%c', 'SOL').replace(
        '%a',
        address,
      ),
    );
    if (!challenge)
      throw new TypeError('verifyOneTimeChallengeSol: where data?');
    return nacl.sign.detached.verify(
      new TextEncoder().encode(challenge),
      bs58.decode(signature),
      bs58.decode(publicKey),
    );
  }

  /**
   * @async
   * @function verifyOneTimeChallengeAptos
   * @summary verify Aptos challenge signature
   * @param {AptosAddress} address Aptos wallet address
   * @param {string} signature WARNING: is signature of `fullMessage`
   * @param {StringOfLength<64, 66>} publicKey
   * @return {Promise<Boolean>} isValid
   */
  async verifyOneTimeChallengeAptos(
    address: AptosAddress,
    signature: string,
    publicKey: StringOfLength<64, 66>,
  ): Promise<boolean> {
    const challenge: string = await this.cacheService.getCache(
      AUTH_CHALLENGE_CACHE_KEY_TEMPLATE.replace('%c', 'APTOS').replace(
        '%a',
        address,
      ),
    );
    if (!challenge)
      throw new TypeError('verifyOneTimeChallengeAptos: where data?');
    const trimmedPublicKey: string =
      publicKey.length === 66 ? publicKey.slice(2, 66) : publicKey;
    const signedMessage = AUTH_APTOS_SIGNUP_TEMPLATE.replace('%c', challenge);
    return nacl.sign.detached.verify(
      Buffer.from(signedMessage),
      Buffer.from(signature, 'hex'),
      Buffer.from(trimmedPublicKey, 'hex'),
    );
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

  /**
   * @async
   * @function verifyOneTimeChallengeSui
   * @summary verify Sui challenge signature
   * @param {SuiAddress} address Sui wallet address
   * @param {string} signature SerializedSignature from Sui standards
   * @return {Promise<Boolean>} isValid
   */
  async verifyOneTimeChallengeSui(
    address: SuiAddress,
    signature: string,
  ): Promise<boolean> {
    const challenge: string = await this.cacheService.getCache(
      AUTH_CHALLENGE_CACHE_KEY_TEMPLATE.replace('%c', 'SUI').replace(
        '%a',
        address,
      ),
    );
    if (!challenge)
      throw new TypeError('verifyOneTimeChallengeSui: where data?');
    // @dev change after 0.3.3 sui.js release
    const verifyMessage = (_, __) => false;
    return verifyMessage(
      Buffer.from(challenge, 'binary').toString('base64'), // requires input to be base64
      signature,
    );
  }

  /**
   * @async
   * @function generateOtpAndSendEmail
   * @summary generates a single OTP passcode, and then send the email for you
   * @param {String} email the email address to request the OTP code
   * @return {Promise<EmailSentResult>} EmailSentResult
   */
  async generateOtpAndSendEmail(email: string): Promise<EmailSentResult> {
    const n: string = this.getSecureRandomNumberStr();
    const recipient: EmailRecipient = new EmailRecipient(
      email,
      'Lootex ID User',
    );
    const _startTime = new Date().getTime();
    const emailRes = await this.sendInBlueService.sendPlainEmail(
      recipient,
      `[Lootex] Your 6-Digit One-Time Authorization Code: ${n}`,
      getOtpEmailHtmlTemplate(n),
    );
    const _endTime = new Date().getTime();
    this.logger.log(
      `sendEmailOTP sendEmail time ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')} ${(_endTime - _startTime) / 1000}s`,
    );
    return this.cacheService
      .setCache(AUTH_EMAIL_OTP_KEY_TEMPLATE.replace('%a', email), n, 3600)
      .then(() => ({
        ...emailRes,
      }));
  }

  /**
   * @async
   * @function verifyEmailOTP
   * @summary verified the email's OTP code and return bool for result. clears the cache too
   * @param {String} email the email address to request verification
   * @param {String | Number} otpCode code to verify with
   * @param {Boolean} clearCache (optional) clear the cache if valid?
   * @return {Promise<Boolean>} result
   */
  async verifyEmailOTP(
    email: string,
    otpCode: string | number,
    clearCache = true,
  ): Promise<boolean> {
    const toMatch = typeof otpCode === 'number' ? String(otpCode) : otpCode;
    const cacheKey = AUTH_EMAIL_OTP_KEY_TEMPLATE.replace('%a', email);
    const n = String(await this.cacheService.getCache(cacheKey));
    if (!n) throw new TypeError('verifyEmailOTP: code not found');
    if (n === toMatch) {
      if (clearCache) await this.cacheService.setCache(cacheKey, '', 1);
      return true;
    }
    return false;
  }

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
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleSignUpEth: invalid OTP code');
    // 2. Signature verification
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
          `handleBindWalletAndSignInEth: ${accountSignUpDto.address} ERC1271 invalid`,
        );
        if (
          !(await this.verifyOneTimeChallengeEthErc6492(
            accountSignUpDto.address as EthAddress,
            accountSignUpDto.signature,
            accountSignUpDto.message,
          ))
        ) {
          this.logger.debug(
            `handleBindWalletAndSignInEth: ${accountSignUpDto.address} ERC6492 invalid`,
          );
          throw new TypeError(
            'handleBindWalletAndSignInEth: invalid signature',
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
    // 3. Unique field verification
    if (
      await this.isEmailOrUsernameAlreadyUsed(
        accountSignUpDto.email,
        accountSignUpDto.username,
      )
    )
      throw new TypeError('handleSignUpEth: email or username not unique');
    // 3.5 Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: accountSignUpDto.address },
      })
    )
      throw new TypeError('handleSignUpEth: wallet exists, sign in instead');
    // 4. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      accountSignUpDto.email,
      accountSignUpDto.username,
      accountSignUpDto.transport,
      accountSignUpDto.provider,
      accountSignUpDto.chainFamily,
      accountSignUpDto.address,
      { ip, area },
    );
  }

  /**
   * @async
   * @function handleSignUpEth
   * @description handles sign-up by Ethereum Wallet, either EOA or ERC-1271 contracts，給指定情境使用
   * @param {AccountSignUpDto} accountSignUpDto sign up payload
   * @return {Promise<[Account, Wallet]>} [account, wallet]
   */
  async handleSignUpEthPrivate(
    accountSignUpDto: AccountSignUpDto,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. OTP Code verification
    // if (
    //   !(await this.verifyEmailOTP(
    //     accountSignUpDto.email,
    //     accountSignUpDto.otpCode,
    //   ))
    // )
    //   throw new TypeError('handleSignUpEth: invalid OTP code');
    // 2. Signature verification
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
          `handleBindWalletAndSignInEth: ${accountSignUpDto.address} ERC1271 invalid`,
        );
        if (
          !(await this.verifyOneTimeChallengeEthErc6492(
            accountSignUpDto.address as EthAddress,
            accountSignUpDto.signature,
            accountSignUpDto.message,
          ))
        ) {
          this.logger.debug(
            `handleBindWalletAndSignInEth: ${accountSignUpDto.address} ERC6492 invalid`,
          );
          throw new TypeError(
            'handleBindWalletAndSignInEth: invalid signature',
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
    // 3. Unique field verification
    if (
      await this.isEmailOrUsernameAlreadyUsed(
        accountSignUpDto.email,
        accountSignUpDto.username,
      )
    )
      throw new TypeError('handleSignUpEth: email or username not unique');
    // 3.5 Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: accountSignUpDto.address },
      })
    )
      throw new TypeError('handleSignUpEth: wallet exists, sign in instead');
    // 4. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      accountSignUpDto.email,
      accountSignUpDto.username,
      accountSignUpDto.transport,
      accountSignUpDto.provider,
      accountSignUpDto.chainFamily,
      accountSignUpDto.address,
    );
  }

  /**
   * @async
   * @function handleSignUpTorus
   * @description handles sign-up by Torus Custodial Ethereum Wallet, EOA
   * @param {AccountTorusSignUpDto} accountSignUpDto sign up payload
   * @return {Promise<[Account, Wallet]>} [account, wallet]
   */
  async handleSignUpTorus(
    accountSignUpDto: AccountTorusSignUpDto,
  ): Promise<[Account, Wallet]> {
    const torusVerifier = accountSignUpDto.verifier as AuthTorusVerifierTypes;
    // 1. Torus service infomation retrieval
    const torus = new Torus();
    const torusServiceResult = await torus.getPublicAddress({
      verifier: torusVerifier,
      verifierId: accountSignUpDto.verifierId,
    }); // as unknown as AuthTorusPubAddrResponse;
    if (!torusServiceResult.success) {
      throw new TypeError('handleSignUpTorus: invalid verifier payload');
    }
    console.log(
      'handleSignUpTorus:\n  -- verifier:',
      torusVerifier,
      '\n  -- verifierId:',
      accountSignUpDto.verifierId,
    );
    console.log(
      '  -- passed address:',
      accountSignUpDto.address,
      "\n  -- Torus' address:",
      torusServiceResult.data,
    );
    if (
      torusServiceResult.data?.address?.toLowerCase() !==
      accountSignUpDto.address.toLowerCase()
    ) {
      throw new TypeError('handleSignUpTorus: address mismatch, access denied');
    }
    // 2. Signature Recovery
    if (
      !(await this.verifyOneTimeChallengeEth(
        accountSignUpDto.address as EthAddress,
        accountSignUpDto.signature,
      ))
    )
      throw new TypeError('handleSignUpTorus: invalid signature');
    // 3. Unique field verification
    if (
      await this.isEmailOrUsernameAlreadyUsed(
        accountSignUpDto.email,
        accountSignUpDto.username,
      )
    )
      throw new TypeError('handleSignUpTorus: email or username not unique');
    // 3.5 Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: accountSignUpDto.address },
      })
    )
      throw new TypeError('handleSignUpTorus: wallet exists, sign in instead');
    // 4. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      accountSignUpDto.email,
      accountSignUpDto.username,
      accountSignUpDto.transport,
      accountSignUpDto.provider,
      accountSignUpDto.chainFamily,
      accountSignUpDto.address,
    );
  }
  /**
   * @async
   * @function handleSignUpPrivy
   * @description handles sign-up by Privy Custodial Ethereum Wallet, EOA
   * @param {AccountPrivySignUpDto} accountSignUpDto sign up payload
   * @return {Promise<[Account, Wallet]>} [account, wallet]
   */
  async handleSignUpPrivy(
    username: string,
    privyJwt: string,
    ip?: string,
    area?: string,
  ): Promise<[Account, Wallet]> {
    const privyClient = await this.privyClient();
    const PrivyVerifier = await privyClient.verifyAuthToken(privyJwt);

    // 1. Privy service infomation retrieval
    if (!PrivyVerifier) {
      throw new TypeError('handleSignUpPrivy: invalid verifier payload');
    }

    const privyUserId = PrivyVerifier.userId;
    const isPrivyUserIdExist = !!(await this.accountRepository.findOne({
      where: { privyUserId },
    }));
    if (isPrivyUserIdExist) {
      throw new TypeError('handleSignUpPrivy: privyUserId already exist');
    }

    const privyUser = await privyClient.getUser(PrivyVerifier.userId);
    if (!privyUser) {
      throw new TypeError('handleSignUpPrivy: invalid privyUser');
    }

    const privyEmail =
      privyUser.email?.address ||
      privyUser.google?.email ||
      privyUser.discord?.email ||
      privyUser.apple?.email;
    if (!privyEmail) {
      throw new TypeError('handleSignUpPrivy: invalid privyEmail');
    }

    // 驗證 email 網域是否在 EMAIL_BLACKLIST
    const emailBlockList = this.configurationService.get('EMAIL_BLACKLIST');
    if (emailBlockList.includes(privyEmail.split('@')[1])) {
      throw new TypeError('handleSignUpPrivy: email is blacklisted');
    }

    // for Wallet Pregenerating
    const privyAppId = this.configurationService.get('PRIVY_APP_ID');
    const privyAppSecret = this.configurationService.get('PRIVY_APP_SECRET');
    const privyUserLinkedAccounts = privyUser.linkedAccounts;

    const privyEmbedWallet = (
      privyUserLinkedAccounts.filter((account) => {
        return (
          account.type === 'wallet' && account.connectorType === 'embedded'
        );
      })[0] as WalletWithMetadata
    )?.address?.toLowerCase();
    if (!privyEmbedWallet) {
      throw new TypeError('handleSignUpPrivy: invalid privyWallet');
    }

    // 3. Unique field verification
    if (await this.isEmailOrUsernameAlreadyUsed(privyEmail, username))
      throw new TypeError('handleSignUpPrivy: email or username not unique');
    // 3.5 Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: privyEmbedWallet },
      })
    )
      throw new TypeError('handleSignUpPrivy: wallet exists, sign in instead');
    // 4. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      privyEmail,
      username,
      AuthSupportedWalletTransport.LIBRARY,
      AuthSupportedWalletProviderEnum.PRIVY_LIBRARY,
      AuthSupportedChainFamily.ETH,
      privyEmbedWallet as AuthSupportedAddress,
      { privyUserId, ip, area },
    );
  }

  /**
   * @async
   * @function handleSignUpSol
   * @description handles sign-up by Solana wallets
   * @param {AccountSignUpDto} accountSignUpDto sign up payload
   * @return {Promise<[Account, Wallet]>} [account, wallet]
   */
  async handleSignUpSol(
    accountSignUpDto: AccountSignUpDto,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleSignUpSol: invalid OTP code');
    // 2. Signature verification
    if (
      !(await this.verifyOneTimeChallengeSol(
        accountSignUpDto.address as SolAddress,
        accountSignUpDto.signature,
        accountSignUpDto.publicKey,
      ))
    )
      throw new TypeError('handleSignUpSol: invalid signature');
    // 3. Unique field verification
    if (
      await this.isEmailOrUsernameAlreadyUsed(
        accountSignUpDto.email,
        accountSignUpDto.username,
      )
    )
      throw new TypeError('handleSignUpSol: email or username not unique');
    // 3.5 Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: accountSignUpDto.address },
      })
    )
      throw new TypeError('handleSignUpSol: wallet exists, sign in instead');
    // 4. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      accountSignUpDto.email,
      accountSignUpDto.username,
      accountSignUpDto.transport,
      accountSignUpDto.provider,
      accountSignUpDto.chainFamily,
      accountSignUpDto.address,
    );
  }

  /**
   * @async
   * @function handleSignUpAptos
   * @description handles sign-up by Aptos wallets
   * @param {AccountSignUpDto} accountSignUpDto sign up payload
   * @return {Promise<[Account, Wallet]>} [account, wallet]
   */
  async handleSignUpAptos(
    accountSignUpDto: AccountSignUpDto,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleSignUpAptos: invalid OTP code');
    // 2. Signature verification
    if (
      !(await this.verifyOneTimeChallengeAptos(
        accountSignUpDto.address as AptosAddress,
        accountSignUpDto.signature,
        accountSignUpDto.publicKey as StringOfLength<64, 66>,
      ))
    )
      throw new TypeError('handleSignUpAptos: invalid signature');
    // 3. Unique field verification
    if (
      await this.isEmailOrUsernameAlreadyUsed(
        accountSignUpDto.email,
        accountSignUpDto.username,
      )
    )
      throw new TypeError('handleSignUpAptos: email or username not unique');
    // 3.5 Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: accountSignUpDto.address },
      })
    )
      throw new TypeError('handleSignUpAptos: wallet exists, sign in instead');
    // 4. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      accountSignUpDto.email,
      accountSignUpDto.username,
      accountSignUpDto.transport,
      accountSignUpDto.provider,
      accountSignUpDto.chainFamily,
      accountSignUpDto.address,
    );
  }

  /**
   * @async
   * @function handleSignUpFlow
   * @description handles sign-up by Flow wallets
   * @param {AccountSignUpDto} accountSignUpDto sign up payload
   * @return {Promise<[Account, Wallet]>} [account, wallet]
   */
  async handleSignUpFlow(
    accountSignUpDto: AccountSignUpDto,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleSignUpFlow: invalid OTP code');
    // 2. Signature verification
    // const isChallengeValid = await this.verifyOneTimeChallengeFlow(
    //   accountSignUpDto.address as FlowAddress,
    //   accountSignUpDto.compositeSignatures,
    // );
    // if (!isChallengeValid)
    //   throw new TypeError('handleSignUpFlow: invalid signature');
    // // 3. Unique field verification
    if (
      await this.isEmailOrUsernameAlreadyUsed(
        accountSignUpDto.email,
        accountSignUpDto.username,
      )
    )
      throw new TypeError('handleSignUpFlow: email or username not unique');
    // 3.5 Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: accountSignUpDto.address },
      })
    )
      throw new TypeError('handleSignUpFlow: wallet exists, sign in instead');
    // 4. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      accountSignUpDto.email,
      accountSignUpDto.username,
      accountSignUpDto.transport,
      accountSignUpDto.provider,
      accountSignUpDto.chainFamily,
      accountSignUpDto.address,
    );
  }

  /**
   * @async
   * @function handleSignUpSui
   * @description handles sign-up by Sui wallets
   * @param {AccountSignUpDto} accountSignUpDto sign up payload
   * @return {Promise<[Account, Wallet]>} [account, wallet]
   */
  async handleSignUpSui(
    accountSignUpDto: AccountSignUpDto,
  ): Promise<[Account, Wallet]> {
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleSignUpSui: invalid OTP code');
    // 2. Signature verification
    if (
      !(await this.verifyOneTimeChallengeSui(
        accountSignUpDto.address as SuiAddress,
        accountSignUpDto.signature,
      ))
    )
      throw new TypeError('handleSignUpSui: invalid signature');
    // 3. Unique field verification
    if (
      await this.isEmailOrUsernameAlreadyUsed(
        accountSignUpDto.email,
        accountSignUpDto.username,
      )
    )
      throw new TypeError('handleSignUpSui: email or username not unique');
    // 3.5 Wallet Verification
    if (
      await this.walletsRepository.findOne({
        where: { address: accountSignUpDto.address },
      })
    )
      throw new TypeError('handleSignUpSui: wallet exists, sign in instead');
    // 4. Create new UserAccount & UserWallet for the caller
    return this.createUserAccountAndWallet(
      accountSignUpDto.email,
      accountSignUpDto.username,
      accountSignUpDto.transport,
      accountSignUpDto.provider,
      accountSignUpDto.chainFamily,
      accountSignUpDto.address,
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
   * @function handleSignInSol
   * @description handles sign-in by Solana wallets
   * @param {AccountAuthBaseDto} accountSignInDto sign in payload
   * @return {Promise<string>} jwt_string
   */
  async handleSignInSol(accountSignInDto: AccountAuthBaseDto): Promise<string> {
    // @note Refer to STORY-090215 for spec.
    // 1. Signature verification
    if (
      !(await this.verifyOneTimeChallengeSol(
        accountSignInDto.address as SolAddress,
        accountSignInDto.signature,
        accountSignInDto.publicKey,
      ))
    )
      throw new TypeError('handleSignInSol: invalid signature');
    // @note at this step, we can verify that the user has actual
    //       custody of this SOL address since the signature is correct

    // 2. Verify UserWallet and UserAccount validity
    const currentWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignInDto.address,
      },
    });
    if (!currentWallet)
      throw new TypeError('handleSignInSol: Wallet not recognised');
    const currentAccount: Account = await this.accountRepository.findByPk(
      currentWallet.accountId,
    );
    if (!currentAccount)
      throw new TypeError('handleSignInSol: Account not found');
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
  }

  /**
   * @async
   * @function handleSignInAptos
   * @description handles sign-in by Aptos wallets
   * @param {AccountAuthBaseDto} accountSignInDto sign in payload
   * @return {Promise<string>} jwt_string
   */
  async handleSignInAptos(
    accountSignInDto: AccountAuthBaseDto,
  ): Promise<string> {
    // @note Refer to STORY-090215 for spec.
    // 1. Signature verification
    if (
      !(await this.verifyOneTimeChallengeAptos(
        accountSignInDto.address as AptosAddress,
        accountSignInDto.signature,
        accountSignInDto.publicKey as StringOfLength<64, 66>,
      ))
    )
      throw new TypeError('handleSignInAptos: invalid signature');
    // @note at this step, we can verify that the user has actual
    //       custody of this APTOS address since the signature is correct

    // 2. Verify UserWallet and UserAccount validity
    const currentWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignInDto.address,
      },
    });
    if (!currentWallet)
      throw new TypeError('handleSignInAptos: Wallet not recognised');
    const currentAccount: Account = await this.accountRepository.findByPk(
      currentWallet.accountId,
    );
    if (!currentAccount)
      throw new TypeError('handleSignInAptos: Account not found');
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
  }

  /**
   * @async
   * @function handleSignInFlow
   * @description handles sign-in by Flow wallets
   * @param {AccountAuthBaseDto} accountSignInDto sign in payload
   * @return {Promise<string>} jwt_string
   */
  async handleSignInFlow(
    accountSignInDto: AccountAuthBaseDto,
  ): Promise<string> {
    // @note Refer to STORY-090215 for spec.
    // 1. Signature verification
    // if (
    //   !(await this.verifyOneTimeChallengeFlow(
    //     accountSignInDto.address as FlowAddress,
    //     accountSignInDto.compositeSignatures,
    //   ))
    // )
    //   throw new TypeError('handleSignInFlow: invalid signature');
    // @note at this step, we can verify that the user has actual
    //       custody of this FLOW address since the signature is correct

    // 2. Verify UserWallet and UserAccount validity
    const currentWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignInDto.address,
      },
    });
    if (!currentWallet)
      throw new TypeError('handleSignInFlow: Wallet not recognised');
    const currentAccount: Account = await this.accountRepository.findByPk(
      currentWallet.accountId,
    );
    if (!currentAccount)
      throw new TypeError('handleSignInFlow: Account not found');
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
  }

  /**
   * @async
   * @function handleSignInSui
   * @description handles sign-in by Sui wallets
   * @param {AccountAuthBaseDto} accountSignInDto sign in payload
   * @return {Promise<string>} jwt_string
   */
  async handleSignInSui(accountSignInDto: AccountAuthBaseDto): Promise<string> {
    // 1. Signature verification
    if (
      !(await this.verifyOneTimeChallengeSui(
        accountSignInDto.address as SuiAddress,
        accountSignInDto.signature,
      ))
    )
      throw new TypeError('handleSignInSui: invalid signature');
    // 2. Verify UserWallet and UserAccount validity
    const currentWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignInDto.address,
      },
    });
    if (!currentWallet)
      throw new TypeError('handleSignInSui: Wallet not recognised');
    const currentAccount: Account = await this.accountRepository.findByPk(
      currentWallet.accountId,
    );
    if (!currentAccount)
      throw new TypeError('handleSignInSui: Account not found');
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
  }

  /**
   * @async
   * @function handleBindWalletAndSignInEth
   * @summary creates a new ETH wallet record for the account to sign in with
   * @param {AccountNewWalletSignUpDto} accountSignUpDto payload, sign up format
   * @return {Promise<[Account,Wallet]>} newWallet
   */
  async handleBindWalletAndSignInEth(
    accountSignUpDto: AccountNewWalletSignUpDto,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleBindWalletAndSignInEth: invalid OTP code');
    // 2. Signature verification
    if (accountSignUpDto.isErc1271Wallet) {
      // ERC-1271 Contract Wallet Standard
      this.logger.debug('handleBindWalletAndSignInEth: ERC-1271 Wallet');
      if (
        !(await this.verifyOneTimeChallengeEthErc1271(
          accountSignUpDto.address as EthAddress,
          accountSignUpDto.signature,
          accountSignUpDto.chainId,
        ))
      ) {
        this.logger.debug(
          `handleBindWalletAndSignInEth: ${accountSignUpDto.address} ERC1271 invalid`,
        );
        if (
          !(await this.verifyOneTimeChallengeEthErc6492(
            accountSignUpDto.address as EthAddress,
            accountSignUpDto.signature,
            accountSignUpDto.message,
          ))
        ) {
          this.logger.debug(
            `handleBindWalletAndSignInEth: ${accountSignUpDto.address} ERC6492 invalid`,
          );
          throw new TypeError(
            'handleBindWalletAndSignInEth: invalid signature',
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
        throw new TypeError('handleBindWalletAndSignInEth: invalid signature');
    }
    // 3. Verify that the target UserAccount exists
    const currentAccount: Account = await this.accountRepository.findOne({
      where: {
        email: accountSignUpDto.email,
      },
    });
    if (!currentAccount) {
      throw new TypeError(
        'handleBindWalletAndSignInEth: account does not exist',
      );
    }
    this._checkAccountOrThrowException(currentAccount);
    // 4. Create new UserWallet for the user
    let matchingWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignUpDto.address,
      },
    });
    if (!matchingWallet) {
      matchingWallet = await this.walletsRepository.create({
        accountId: currentAccount.id,
        transport: accountSignUpDto.transport,
        provider: accountSignUpDto.provider,
        chainFamily: accountSignUpDto.chainFamily,
        address: accountSignUpDto.address,
        isMainWallet: false,
      });
    }
    return [currentAccount, matchingWallet];
  }

  /**
   * @async
   * @function handleBindWalletAndSignInEthTorus
   * @summary creates a new Torus wallet record for the account to sign in with
   * @param {AccountTorusNewWalletSignUpDto} accountSignUpDto payload, sign up format
   * @return {Promise<[Account,Wallet]>} newWallet
   */
  async handleBindWalletAndSignInEthTorus(
    accountSignUpDto: AccountTorusNewWalletSignUpDto,
  ): Promise<[Account, Wallet]> {
    const torusVerifier = accountSignUpDto.verifier as AuthTorusVerifierTypes;
    // 1. Torus service infomation retrieval
    const torus = new Torus();
    const torusServiceResult = await torus.getPublicAddress({
      verifier: torusVerifier,
      verifierId: accountSignUpDto.verifierId,
    }); // as unknown as AuthTorusPubAddrResponse;
    if (!torusServiceResult.success) {
      throw new TypeError(
        'handleBindWalletAndSignInEthTorus: invalid verifier payload',
      );
    }
    console.log(
      'handleBindWalletAndSignInEthTorus:\n                  \n  -- verifier:',
      torusVerifier,
      '\n  -- verifierId:',
      accountSignUpDto.verifierId,
    );
    console.log(
      '  -- passed address:',
      accountSignUpDto.address,
      "\n  -- Torus' address:",
      torusServiceResult.data,
    );
    if (
      torusServiceResult.data?.address?.toLowerCase() !==
      accountSignUpDto.address.toLowerCase()
    ) {
      throw new TypeError(
        'handleBindWalletAndSignInEthTorus: address mismatch, access denied',
      );
    }
    // 2. Signature Recovery
    if (
      !(await this.verifyOneTimeChallengeEth(
        accountSignUpDto.address as EthAddress,
        accountSignUpDto.signature,
      ))
    )
      throw new TypeError(
        'handleBindWalletAndSignInEthTorus: invalid signature',
      );
    // 3. Verify that the target UserAccount exists
    const currentAccount: Account = await this.accountRepository.findOne({
      where: {
        email: accountSignUpDto.email,
      },
    });
    if (!currentAccount) {
      throw new TypeError(
        'handleBindWalletAndSignInEthTorus: account does not exist',
      );
    }
    this._checkAccountOrThrowException(currentAccount);
    // 4. Create new UserWallet for the user, if it doesn't exist yet
    let matchingWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignUpDto.address,
      },
    });
    if (!matchingWallet) {
      matchingWallet = await this.walletsRepository.create({
        accountId: currentAccount.id,
        transport: accountSignUpDto.transport,
        provider: accountSignUpDto.provider,
        chainFamily: accountSignUpDto.chainFamily,
        address: accountSignUpDto.address,
        isMainWallet: false,
      });
    }
    return [currentAccount, matchingWallet];
  }

  /**
   * @async
   * @function handleBindWalletAndSignInSol
   * @summary creates a new SOL wallet record for the account to sign in with
   * @param {AccountNewWalletSignUpDto} accountSignUpDto payload, sign up format
   * @return {Promise<[Account,Wallet]>} newWallet
   */
  async handleBindWalletAndSignInSol(
    accountSignUpDto: AccountNewWalletSignUpDto,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleBindWalletAndSignInSol: invalid OTP code');
    // 2. Signature verification
    if (
      !(await this.verifyOneTimeChallengeSol(
        accountSignUpDto.address as SolAddress,
        accountSignUpDto.signature,
        accountSignUpDto.publicKey,
      ))
    )
      throw new TypeError('handleBindWalletAndSignInSol: invalid signature');
    // 3. Verify that the target UserAccount exists
    const currentAccount: Account = await this.accountRepository.findOne({
      where: {
        email: accountSignUpDto.email,
      },
    });
    if (!currentAccount) {
      throw new TypeError(
        'handleBindWalletAndSignInSol: account does not exist',
      );
    }
    this._checkAccountOrThrowException(currentAccount);
    // 4. Create new UserWallet for the user
    let matchingWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignUpDto.address,
      },
    });
    if (!matchingWallet) {
      matchingWallet = await this.walletsRepository.create({
        accountId: currentAccount.id,
        transport: accountSignUpDto.transport,
        provider: accountSignUpDto.provider,
        chainFamily: accountSignUpDto.chainFamily,
        address: accountSignUpDto.address,
        isMainWallet: false,
      });
    }
    return [currentAccount, matchingWallet];
  }
  /**
   * @async
   * @function handleBindWalletAndSignInAptos
   * @summary creates a new APTOS wallet record for the account to sign in with
   * @param {AccountNewWalletSignUpDto} accountSignUpDto payload, sign up format
   * @return {Promise<[Account,Wallet]>} newWallet
   */
  async handleBindWalletAndSignInAptos(
    accountSignUpDto: AccountNewWalletSignUpDto,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleBindWalletAndSignInAptos: invalid OTP code');
    // 2. Signature verification
    if (
      !(await this.verifyOneTimeChallengeAptos(
        accountSignUpDto.address as AptosAddress,
        accountSignUpDto.signature,
        accountSignUpDto.publicKey as StringOfLength<64, 66>,
      ))
    )
      throw new TypeError('handleBindWalletAndSignInAptos: invalid signature');
    // 3. Verify that the target UserAccount exists
    const currentAccount: Account = await this.accountRepository.findOne({
      where: {
        email: accountSignUpDto.email,
      },
    });
    if (!currentAccount) {
      throw new TypeError(
        'handleBindWalletAndSignInAptos: account does not exist',
      );
    }
    this._checkAccountOrThrowException(currentAccount);
    // 4. Create new UserWallet for the user
    let matchingWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignUpDto.address,
      },
    });
    if (!matchingWallet) {
      matchingWallet = await this.walletsRepository.create({
        accountId: currentAccount.id,
        transport: accountSignUpDto.transport,
        provider: accountSignUpDto.provider,
        chainFamily: accountSignUpDto.chainFamily,
        address: accountSignUpDto.address,
        isMainWallet: false,
      });
    }
    return [currentAccount, matchingWallet];
  }

  /**
   * @async
   * @function handleBindWalletAndSignInFlow
   * @summary creates a new FLOW wallet record for the account to sign in with
   * @param {AccountNewWalletSignUpDto} accountSignUpDto payload, sign up format
   * @return {Promise<[Account,Wallet]>} newWallet
   */
  async handleBindWalletAndSignInFlow(
    accountSignUpDto: AccountNewWalletSignUpDto,
  ): Promise<[Account, Wallet]> {
    // @note Refer to STORY-090215 for spec.
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleBindWalletAndSignInFlow: invalid OTP code');
    // 2. Signature verification
    // if (
    //   !(await this.verifyOneTimeChallengeFlow(
    //     accountSignUpDto.address as FlowAddress,
    //     accountSignUpDto.compositeSignatures,
    //   ))
    // )
    //   throw new TypeError('handleBindWalletAndSignInFlow: invalid signature');
    // 3. Verify that the target UserAccount exists
    const currentAccount: Account = await this.accountRepository.findOne({
      where: {
        email: accountSignUpDto.email,
      },
    });
    if (!currentAccount) {
      throw new TypeError(
        'handleBindWalletAndSignInFlow: account does not exist',
      );
    }
    this._checkAccountOrThrowException(currentAccount);
    // 4. Create new UserWallet for the user
    let matchingWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignUpDto.address,
      },
    });
    if (!matchingWallet) {
      matchingWallet = await this.walletsRepository.create({
        accountId: currentAccount.id,
        transport: accountSignUpDto.transport,
        provider: accountSignUpDto.provider,
        chainFamily: accountSignUpDto.chainFamily,
        address: accountSignUpDto.address,
        isMainWallet: false,
      });
    }
    return [currentAccount, matchingWallet];
  }

  /**
   * @async
   * @function handleBindWalletAndSignInSui
   * @summary creates a new Sui wallet record for the account to sign in with
   * @param {AccountNewWalletSignUpDto} accountSignUpDto payload, sign up format
   * @return {Promise<[Account,Wallet]>} newWallet
   */
  async handleBindWalletAndSignInSui(
    accountSignUpDto: AccountNewWalletSignUpDto,
  ): Promise<[Account, Wallet]> {
    // 1. OTP Code verification
    if (
      !(await this.verifyEmailOTP(
        accountSignUpDto.email,
        accountSignUpDto.otpCode,
      ))
    )
      throw new TypeError('handleBindWalletAndSignInSui: invalid OTP code');
    // 2. Signature verification
    if (
      !(await this.verifyOneTimeChallengeSui(
        accountSignUpDto.address as SuiAddress,
        accountSignUpDto.signature,
      ))
    )
      throw new TypeError('handleBindWalletAndSignInSui: invalid signature');
    // 3. Verify that the target UserAccount exists
    const currentAccount: Account = await this.accountRepository.findOne({
      where: {
        email: accountSignUpDto.email,
      },
    });
    if (!currentAccount) {
      throw new TypeError(
        'handleBindWalletAndSignInSui: account does not exist',
      );
    }
    this._checkAccountOrThrowException(currentAccount);
    // 4. Create new UserWallet for the user
    let matchingWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: accountSignUpDto.address,
      },
    });
    if (!matchingWallet) {
      matchingWallet = await this.walletsRepository.create({
        accountId: currentAccount.id,
        transport: accountSignUpDto.transport,
        provider: accountSignUpDto.provider,
        chainFamily: accountSignUpDto.chainFamily,
        address: accountSignUpDto.address,
        isMainWallet: false,
      });
    }
    return [currentAccount, matchingWallet];
  }

  async handleBindWalletAndSignInPrivy(
    privyJwt: string,
  ): Promise<[Account, Wallet]> {
    const privyUserInfo = await this.getPrivyUserInfoByPrivyJwt(privyJwt);
    const privyUserId = privyUserInfo.id;
    const existingAccount = await this.accountRepository.findOne({
      where: {
        privyUserId,
      },
    });

    if (existingAccount) {
      throw new HttpException(
        'Privy account already binded',
        HttpStatus.BAD_REQUEST,
      );
    }

    let account: Account;
    let privyEmail =
      privyUserInfo.email?.address ||
      privyUserInfo.google?.email ||
      privyUserInfo.discord?.email ||
      privyUserInfo.apple?.email;
    if (privyUserInfo) {
      privyEmail = modifyGmail({ value: privyEmail });
    }

    const walletAddresses = [];

    if (!privyEmail) {
      privyUserInfo.linkedAccounts.map((account) => {
        if (account.type === 'wallet') {
          walletAddresses.push(account.address.toLowerCase());
        }
      });
      const accounts = await this.accountRepository.findAll({
        include: [
          {
            model: Wallet,
            where: {
              address: walletAddresses,
            },
          },
        ],
      });

      if (accounts.length > 1) {
        throw new HttpException(
          `Multiple accounts found username: ${accounts.map(
            (account) => account.username,
          )}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      account = accounts[0];
    }

    if (privyEmail) {
      account = await this.accountRepository.findOne({
        where: {
          email: privyEmail,
        },
      });
    }

    if (!account) {
      throw new HttpException('Account not found', HttpStatus.BAD_REQUEST);
    }

    if (account.privyUserId) {
      const privyUserInfo = await this.getPrivyUserInfoByPrivyUserId(
        account.privyUserId,
      );

      const suggestedEmails = privyUserInfo.linkedAccounts
        .map((linkedAccount) => {
          switch (linkedAccount.type) {
            case 'email':
              return `email: ${linkedAccount.address}`;
            case 'google_oauth':
              return `Google: ${linkedAccount.email}`;
            case 'apple_oauth':
              return `Apple: ${linkedAccount.email}`;
            case 'discord_oauth':
              return `Discord: ${linkedAccount.email}`;
            case 'wallet':
              if (linkedAccount.connectorType != 'embedded') {
                return `Wallet: ${linkedAccount.address}`;
              }
              break;
            default:
              null;
          }
        })
        .filter((item) => !!item)
        .join('\n');

      throw new HttpException(
        `Privy account already binded, suggested login by:\n${suggestedEmails}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // for Wallet Pregenerating
    const privyAppId = this.configurationService.get('PRIVY_APP_ID');
    const privyAppSecret = this.configurationService.get('PRIVY_APP_SECRET');
    const privyUserLinkedAccounts = privyUserInfo.linkedAccounts;

    if (!privyUserLinkedAccounts) {
      throw new HttpException(
        'Privy Pregenerating embed address failed',
        HttpStatus.BAD_REQUEST,
      );
    }

    const privyEmbedWallet = (
      privyUserLinkedAccounts.filter((account) => {
        return (
          account.type === 'wallet' && account.connectorType === 'embedded'
        );
      })[0] as WalletWithMetadata
    )?.address?.toLowerCase();

    if (!privyEmbedWallet) {
      throw new HttpException(
        'Privy address not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const saWalletAddress = await this.generateSAAddress(privyEmbedWallet);

    if (!saWalletAddress) {
      throw new HttpException(
        'Privy address not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    // transaction
    return this.sequelizeInstance.transaction(async (transaction) => {
      const embedWallet = await this.walletsRepository.create(
        {
          accountId: account.id,
          transport: AuthSupportedWalletTransport.LIBRARY,
          provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY,
          chainFamily: AuthSupportedChainFamily.ETH,
          address: privyEmbedWallet,
          isMainWallet: false,
        },
        { transaction },
      );

      const saWallet = await this.walletsRepository.create(
        {
          accountId: account.id,
          transport: AuthSupportedWalletTransport.LIBRARY,
          provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
          chainFamily: AuthSupportedChainFamily.ETH,
          address: saWalletAddress,
          isMainWallet: false,
        },
        { transaction },
      );

      account.set('privyUserId', privyUserId);
      await account.save({ transaction });

      return [account, embedWallet];
    });
  }

  async generateSAAddress(privyEmbedWallet: string) {
    // generate SA address
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(1);
    const signer = provider.getSigner(privyEmbedWallet);
    const ecdsaModuleConfig = { signer };

    const defaultValidationModule =
      await createECDSAOwnershipValidationModule(ecdsaModuleConfig);

    const bundlerKey = this.configurationService.get('BICONOMY_BUNDLER_KEY');

    const bundlerUrl = `https://bundler.biconomy.io/api/v2/1/${bundlerKey}`;

    // Signer for smart account taken from the module
    const smartAccount = await createSmartAccountClient({
      bundlerUrl,
      defaultValidationModule, // Alternatively this can be ommitted, as it is the default validation module used when accounts are created
    });
    const saWalletAddress = (
      await smartAccount.getAccountAddress()
    ).toLowerCase();
    return saWalletAddress;
  }

  async preGenerateSAAddresses(emails: string[]) {
    const privy = await this.privyClient();
    return Promise.all(
      emails.map(async (email) => {
        const user = await privy.importUser({
          linkedAccounts: [
            {
              type: 'email',
              address: email,
            },
          ],
          createEmbeddedWallet: true,
        });
        const embedWalletAddress = user.wallet.address;
        const saWalletAddress =
          await this.generateSAAddress(embedWalletAddress);
        return {
          email,
          embedWalletAddress,
          saWalletAddress,
        };
      }),
    );
  }

  async isReferralCodeExists(referralCode: string): Promise<boolean> {
    const referralCodeExists = await this.accountRepository.findOne({
      where: {
        referralCode,
      },
    });
    return !!referralCodeExists;
  }

  async updateReferral(
    referralId: string,
    referralCode: string,
    userIP: string,
  ) {
    const referrer = await this.accountRepository.findOne({
      where: { referralCode },
    });

    if (!referrer) {
      // delete account if referral fails
      throw SimpleException.fail({ debug: 'Referrer(referralCode) not found' });
    }

    const existReferredAccount = await this.referralRepository.findOne({
      where: { referralId },
    });

    if (existReferredAccount) {
      throw SimpleException.fail({ debug: 'Referral already exists' });
    }

    const referredAccount = await this.referralRepository.create({
      referralId,
      referrerId: referrer.id,
      category: '202408-BaseSummer',
      ip: userIP,
    });

    this.logger.debug(
      `referral completed referral:${referralId} referrer:${referrer.id}`,
    );

    return SimpleJson.success({
      data: {
        referrerUsername: referrer.username,
        referrerCode: referrer.referralCode,
        category: referredAccount.category,
      },
    });
  }

  /**
   * 注意：這個方法僅限註冊時使用
   */
  async completeReferral(
    referralId: string,
    referralCode: string,
    userIP: string,
  ): Promise<Account> {
    try {
      const referrer = await this.accountRepository.findOne({
        where: { referralCode },
      });

      if (!referrer) {
        // delete account if referral fails
        this.accountRepository.destroy({
          where: { id: referralId },
        });
        throw new HttpException(
          'Referrer(referralCode) not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const referredAccount = await this.referralRepository.create({
        referralId,
        referrerId: referrer.id,
        category: '202408-BaseSummer',
        ip: userIP,
      });
      this.logger.debug(
        `referral completed referral:${referralId} referrer:${referrer.id}`,
      );
      return referrer;
    } catch (error) {
      throw new Error(error);
    }
  }

  /**
   * generate not exist 6 digit random referral code (A-Z, 0-9)
   * !! if sign-up > 36^6 = 2,176,782,336 while loop will be executed!!
   * @returns {string} random code
   */
  async generateReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let flag = true;

    while (flag) {
      for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        const randomChar = characters[randomIndex];
        code += randomChar;
      }
      const codeExists = await this.isReferralCodeExists(code);
      if (!codeExists) {
        flag = false;
      }
    }

    return code;
  }

  // ===========================
  // ========== Privy ==========
  // ===========================
  async privyClient() {
    const privy = new PrivyClient(
      this.configurationService.get('PRIVY_APP_ID'),
      this.configurationService.get('PRIVY_APP_SECRET'),
    );
    if (!privy) {
      throw new HttpException('Privy client not found', HttpStatus.BAD_REQUEST);
    }

    return privy;
  }

  async privyVerify(authToken: string) {
    const privy = await this.privyClient();
    try {
      const verifiedClaims = await privy.verifyAuthToken(authToken);
      return verifiedClaims;
    } catch (error) {
      this.logger.debug(`Token verification failed with error ${error}.`);
      return null;
    }
  }

  async getPrivyUserInfoByPrivyJwt(privyJwt: string) {
    const privy = await this.privyClient();
    try {
      const verifiedClaims = await privy.verifyAuthToken(privyJwt);
      const privyUserInfo = await privy.getUser(verifiedClaims.userId);
      if (!privyUserInfo) {
        throw new HttpException(
          'privyUserInfo not found',
          HttpStatus.BAD_REQUEST,
        );
      }
      return privyUserInfo;
    } catch (error) {
      this.logger.debug(`Token verification failed with error ${error}.`);
      return null;
    }
  }

  async getPrivyUserInfoByPrivyUserId(privyUserId: string) {
    const privy = await this.privyClient();
    try {
      const privyUserInfo = await privy.getUser(privyUserId);
      if (!privyUserInfo) {
        throw new HttpException(
          'privyUserInfo not found',
          HttpStatus.BAD_REQUEST,
        );
      }
      return privyUserInfo;
    } catch (error) {
      this.logger.debug(error);
      return null;
    }
  }

  async privyIsBound(privyJwt: string) {
    try {
      const privyUserInfo = await this.getPrivyUserInfoByPrivyJwt(privyJwt);
      if (!privyUserInfo) {
        throw new HttpException(
          'privyUserInfo not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const privyEmbedWallet = privyUserInfo.linkedAccounts
        .filter((linkedAccount) => {
          return (
            linkedAccount.type === 'wallet' &&
            linkedAccount.walletClientType === 'privy' &&
            linkedAccount.connectorType === 'embedded'
          );
        })
        .map((filteredAccount: WalletWithMetadata) =>
          filteredAccount.address.toLowerCase(),
        )[0];

      if (!privyEmbedWallet) {
        throw new HttpException(
          'privyEmbedWallet not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const account = await this.accountRepository.findOne({
        attributes: ['id', 'email', 'username'],
        include: [
          {
            attributes: ['id', 'address', 'provider'],
            model: Wallet,
            as: 'wallets',
            where: {
              address: privyEmbedWallet,
            },
          },
        ],
      });

      if (!account) {
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async handleSignInPrivy(authToken: string) {
    const verifiedClaims = await this.privyVerify(authToken);
    if (!verifiedClaims) {
      throw new HttpException(
        'Token verification failed',
        HttpStatus.BAD_REQUEST,
      );
    }

    const account = await this.accountRepository.findOne({
      attributes: ['id', 'email', 'username', 'avatarUrl'],
      where: {
        privyUserId: verifiedClaims.userId,
      },
      include: [
        {
          attributes: ['id', 'address', 'provider'],
          model: Wallet,
          as: 'wallets',
          where: {
            provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY,
          },
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

  async syncPrivyWallets(privyJwt: string) {
    const privyUserInfo = await this.getPrivyUserInfoByPrivyJwt(privyJwt);
    if (!privyUserInfo) {
      throw new HttpException(
        'privyUserInfo not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const privyWalletAddresses = privyUserInfo.linkedAccounts
      .filter((linkedAccount) => {
        return (
          linkedAccount.type === 'wallet' &&
          linkedAccount.walletClientType !== 'privy'
        );
      })
      .map((filteredAccount: WalletWithMetadata) =>
        filteredAccount.address.toLowerCase(),
      );

    const existingWallets = await this.walletsRepository.findAll({
      attributes: ['id', 'address', 'provider'],
      where: {
        address: {
          [Op.in]: privyWalletAddresses,
        },
      },
    });
    const newWalletAddresses = privyWalletAddresses.filter(
      (walletAddress) =>
        !existingWallets.find(
          (existingWallet) => existingWallet.address === walletAddress,
        ),
    );

    const account = await this.accountRepository.findOne({
      where: {
        privyUserId: privyUserInfo.id,
      },
    });
    if (!account) {
      throw new HttpException('Account not found', HttpStatus.BAD_REQUEST);
    }

    const newWallets = await promise.map(
      newWalletAddresses,
      async (address) => {
        return await this.walletsRepository.create({
          accountId: account.id,
          transport: AuthSupportedWalletTransport.INJECTED,
          provider: AuthSupportedWalletProviderEnum.METAMASK_INJECTED,
          chainFamily: AuthSupportedChainFamily.ETH,
          address,
          isMainWallet: false,
        });
      },
    );

    return newWallets.map((wallet) => wallet.address);
  }

  // ====================================
  // ========== Social Connect ==========
  // ====================================
  async socialConnect(accountId: string, socialConnect: SocialConnect) {
    let name = '';
    let email = '';
    let picture = '';
    let providerAccountId = '';
    if (socialConnect.provider === SocialPlatform.FACEBOOK) {
      // {
      //   "id": "1234567899473607",
      //   "name": "XXX",
      //   "email": "XXX@gmail.com",
      //   "picture": {
      //     "data": {
      //       "height": 50,
      //       "is_silhouette": false,
      //       "url": "https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=1234567899473607&height=50&width=50&ext=1689154933&hash=AeTWpqArnI3GWO8Wy_E",
      //       "width": 50
      //     }
      //   }
      // }
      const res = await firstValueFrom(
        this.httpService.get(
          `https://graph.facebook.com/me?access_token=${socialConnect.accessToken}&fields=id,name,email,picture`,
        ),
      );

      if (res.data.error) {
        throw new HttpException(res.data.error.message, HttpStatus.BAD_REQUEST);
      }

      res.data.name ? (name = res.data.name) : '';
      res.data.email ? (email = res.data.email) : '';
      res.data.picture.data.url ? (picture = res.data.picture.data.url) : '';
      res.data.id ? (providerAccountId = res.data.id) : '';

      if (
        await this.isSocialAccountExists(
          socialConnect.provider,
          providerAccountId,
        )
      ) {
        throw new HttpException(
          'Social account already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      const accountSocialConnect =
        await this.accountSocialTokenRepository.create({
          accountId,
          name,
          email,
          picture,
          provider: socialConnect.provider,
          providerAccountId: socialConnect.providerAccountId,
          accessToken: socialConnect.accessToken,
          refreshToken: socialConnect.refreshToken,
          expires_at: socialConnect.expires_at,
        });

      return {
        provider: accountSocialConnect.provider,
        providerAccountId: accountSocialConnect.providerAccountId,
        name: accountSocialConnect.name,
        email: accountSocialConnect.email,
        picture: accountSocialConnect.picture,
      };
    }

    if (socialConnect.provider === SocialPlatform.DISCORD) {
      // {
      //   "id": "1234567899473607",
      //   "username": "XXX",
      //   "avatar": "XXX",
      //   "discriminator": "XXX",
      //   "public_flags": 0,
      //   "flags": 0,
      //   "locale": "en-US",
      //   "mfa_enabled": false,
      //   "email": "XXX@gmail,com",
      //   "verified": true
      // }
      const res = await firstValueFrom(
        this.httpService.get(`https://discord.com/api/v8/users/@me`, {
          headers: {
            Authorization: `Bearer ${socialConnect.accessToken}`,
          },
        }),
      );

      if (res.data.error) {
        throw new HttpException(res.data.error.message, HttpStatus.BAD_REQUEST);
      }

      if (
        await this.isSocialAccountExists(socialConnect.provider, res.data.id)
      ) {
        throw new HttpException(
          'Social account already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      res.data.username ? (name = res.data.username) : '';
      res.data.email ? (email = res.data.email) : '';
      res.data.avatar
        ? (picture = `https://cdn.discordapp.com/avatars/${res.data.id}/${res.data.avatar}.png`)
        : '';
      res.data.id ? (providerAccountId = res.data.id) : '';

      await this.accountSocialTokenRepository.create({
        accountId,
        name,
        email,
        picture,
        provider: socialConnect.provider,
        providerAccountId,
        accessToken: socialConnect.accessToken,
        refreshToken: socialConnect.refreshToken,
        expires_at: socialConnect.expires_at,
      });

      const accountSocialConnect =
        await this.accountSocialTokenRepository.findOne({
          where: {
            accountId,
            provider: socialConnect.provider,
          },
        });

      return {
        provider: accountSocialConnect.provider,
        providerAccountId: accountSocialConnect.providerAccountId,
        name: accountSocialConnect.name,
        email: accountSocialConnect.email,
        picture: accountSocialConnect.picture,
      };
    }

    if (socialConnect.provider === SocialPlatform.TWITTER) {
      // {
      //   "id": "1234567899473607",
      //   "name": "XXX",
      //   "username": "XXX",
      //   "profile_image_url": "XXX",
      //   "profile_image_url_https": "XXX"
      // }
      const res = await firstValueFrom(
        this.httpService.get(
          `https://api.twitter.com/2/users/${socialConnect.providerAccountId}`,
          {
            headers: {
              Authorization: `Bearer ${socialConnect.accessToken}`,
            },
          },
        ),
      );

      if (res.data.errors) {
        throw new HttpException(
          res.data.errors[0].message,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        await this.isSocialAccountExists(socialConnect.provider, res.data.id)
      ) {
        throw new HttpException(
          'Social account already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      res.data.name ? (name = res.data.name) : '';
      res.data.username ? (email = res.data.username) : '';
      res.data.profile_image_url_https
        ? (picture = res.data.profile_image_url_https)
        : '';
      res.data.id ? (providerAccountId = res.data.id) : '';

      await this.accountSocialTokenRepository.create({
        accountId,
        name,
        email,
        picture,
        provider: socialConnect.provider,
        providerAccountId,
        accessToken: socialConnect.accessToken,
        refreshToken: socialConnect.refreshToken,
        expires_at: socialConnect.expires_at,
      });

      const accountSocialConnect =
        await this.accountSocialTokenRepository.findOne({
          where: {
            accountId,
            provider: socialConnect.provider,
          },
        });

      return {
        provider: accountSocialConnect.provider,
        providerAccountId: accountSocialConnect.providerAccountId,
        name: accountSocialConnect.name,
        email: accountSocialConnect.email,
        picture: accountSocialConnect.picture,
      };
    }
  }

  async socialConnectDiscord(accountId: string, socialConnect: SocialConnect) {
    if (
      await this.isSocialAccountExists(
        socialConnect.provider,
        socialConnect.providerAccountId,
      )
    ) {
      throw new HttpException(
        'Social account already exists',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.accountSocialTokenRepository.create({
      accountId: accountId,
      provider: socialConnect.provider,
      providerAccountId: socialConnect.providerAccountId,
      accessToken: socialConnect.accessToken,
      refreshToken: socialConnect.refreshToken,
      name: socialConnect.name,
      email: socialConnect.email,
      picture: socialConnect.picture,
      expires_at: socialConnect.expires_at,
    });

    const accountSocialConnect =
      await this.accountSocialTokenRepository.findOne({
        where: {
          accountId,
          provider: socialConnect.provider,
        },
      });

    return {
      provider: accountSocialConnect.provider,
      providerAccountId: accountSocialConnect.providerAccountId,
      name: accountSocialConnect.name,
      email: accountSocialConnect.email,
      picture: accountSocialConnect.picture,
    };
  }

  async socialConnectTwitter(user: {
    accountId: string;
    providerAccountId: string;
    name: string;
    picture: string;
    accessToken: string;
    refreshToken: string;
  }): Promise<{
    success: boolean;
    reason?: string;
  }> {
    const expireDate = new Date();
    expireDate.setSeconds(expireDate.getSeconds() + 7200);

    const existSocialAccount = await this.accountSocialTokenRepository.findOne({
      attributes: ['id'],
      where: {
        providerAccountId: user.providerAccountId,
        provider: SocialPlatform.TWITTER,
      },
    });

    if (existSocialAccount) {
      return {
        success: false,
        reason: 'Social account already binded with another account',
      };
    }

    const accountSocialConnect = await this.accountSocialTokenRepository.create(
      {
        accountId: user.accountId,
        name: user.name,
        picture: user.picture,
        provider: SocialPlatform.TWITTER,
        providerAccountId: user.providerAccountId,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        expired_at: expireDate,
      },
    );

    return {
      success: true,
    };
  }

  async socialDisconnect(
    accountId: string,
    provider: SocialPlatform,
  ): Promise<boolean> {
    const socialAccount = await this.accountSocialTokenRepository.findOne({
      where: {
        accountId,
        provider,
      },
    });
    if (!socialAccount) {
      throw new HttpException(
        'Social account does not exist',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.accountSocialTokenRepository.destroy({
      where: {
        accountId,
        provider,
      },
    });
    return true;
  }

  async isSocialAccountExists(
    provider: SocialPlatform,
    providerAccountId: string,
  ): Promise<boolean> {
    const socialAccountExists = await this.accountSocialTokenRepository.findOne(
      {
        attributes: ['id'],
        where: {
          provider,
          providerAccountId,
        },
      },
    );
    return !!socialAccountExists;
  }

  async getSocialConnectStatus(accountId: string): Promise<any> {
    const socialConnectStatus = await this.accountSocialTokenRepository.findOne(
      {
        attributes: [
          'provider',
          'providerAccountId',
          'name',
          'email',
          'picture',
        ],
        where: {
          accountId,
        },
      },
    );

    return socialConnectStatus;
  }

  _checkAccountOrThrowException(account: Account) {
    if (account.block === BlockStatus.BLOCKED) {
      throw new HttpException('Account FORBIDDEN', HttpStatus.FORBIDDEN);
    }
  }

  // Lootex Puls 註冊登入流程（不用 email, username）
  async getOneTimeChallengePlus(address: string): Promise<LoginPayload> {
    try {
      const payload = await this.thirdwebAuth.generatePayload({
        address: address,
        chainId: 1,
      });

      return payload;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async verifyOneTimeChallengePlus(dto) {
    //: FizzpopLoginChallengeDto) {
    const { walletAddress, signature, loginPayload } = dto;

    const isSignatureValid = await this.verifyLoginChallenge(
      signature,
      loginPayload,
    );

    if (!isSignatureValid) {
      throw SimpleException.fail({
        message: 'Invalid signature or payload',
      });
    }

    const isWalletRegistered =
      await this.isWalletAddressRegistered(walletAddress);

    if (isWalletRegistered) {
      return await this.signInWithPlus(walletAddress);
    } else {
      return await this.signUpWithPlus(walletAddress);
    }
  }

  async verifyLoginChallenge(signature: string, loginPayload: LoginPayload) {
    try {
      const payload = await this.thirdwebAuth.verifyPayload({
        payload: loginPayload,
        signature: signature,
      });

      if (!payload) {
        throw SimpleException.fail({
          message: 'Invalid signature or payload',
        });
      }

      // Here you can handle the login logic, e.g., create or update user in the database
      // For now, we just return the payload
      return payload.valid;
    } catch (error) {
      this.logger.error('Verify Login Challenge failed:', error);
      throw SimpleException.fail({
        message: 'Verify Login Challenge failed',
      });
    }
  }

  async isWalletAddressRegistered(address: string): Promise<boolean> {
    address = address?.toLowerCase();
    const wallet = await this.walletsRepository.findOne({
      attributes: ['id'],
      where: {
        address,
      },
    });

    return !!wallet;
  }

  async signUpWithPlus(walletAddress: string) {
    const mockEmail = `plus${walletAddress.slice(2, 10)}@lootex.io`; // Mock email for registration
    const mockUsername = `plus${walletAddress.slice(2, 10)}`; // Mock username for registration

    const [currentAccount, currentWallet] =
      await this.createUserAccountAndWallet(
        mockEmail,
        mockUsername,
        AuthSupportedWalletTransport.INJECTED,
        AuthSupportedWalletProviderEnum.METAMASK_INJECTED,
        AuthSupportedChainFamily.ETH,
        walletAddress as AuthSupportedAddress,
      );

    const payload = new LootexJwtPayload(
      currentAccount.id,
      currentAccount.email,
      currentAccount.username,
      currentAccount.avatarUrl,
      currentWallet.id,
    );

    this._checkAccountOrThrowException(currentAccount);

    return this.jwtService.signAsync(payload.toObject(), {
      secret: this.configurationService.get('JWT_SECRET'),
      algorithm: this.configurationService.get('JWT_ALGORITHM'),
      expiresIn: this.configurationService.get('JWT_EXPIRES_IN'),
    });
  }

  async signInWithPlus(walletAddress: string) {
    const currentWallet: Wallet = await this.walletsRepository.findOne({
      where: {
        address: walletAddress?.toLowerCase(),
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
  }
}
