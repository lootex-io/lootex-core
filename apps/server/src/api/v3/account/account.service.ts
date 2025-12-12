import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Account,
  AccountAccountFollow,
  AccountFeatured,
  AccountFeaturedAsset,
  AccountReferral,
  AccountRenameLog,
  AccountSocialToken,
  Asset,
  AssetAsEthAccount,
  AssetExtra,
  AvatarDecoration,
  Badge,
  Blockchain,
  Collection,
  Contract,
  Wallet,
} from '@/model/entities';
import {
  AccountAttributes,
  AccountMinAttributes,
  FeaturedAssetSection,
  GetAccountFollow,
  GetAccountQuery,
  GetAccountsQuery,
  GetAccountsResponse,
} from '@/api/v3/account/account.interface';
import { cast, col, Op, Sequelize, WhereOptions } from 'sequelize';
import * as _ from 'lodash';
import { AssetService } from '../asset/asset.service';
import { InjectModel } from '@nestjs/sequelize';
import { HttpService } from '@nestjs/axios';
import { BlockStatus } from '@/model/entities/constant-model';
import { ProviderTokens } from '@/model/providers';
import * as promise from 'bluebird';
import { } from './account.dto';
import { CacheKeys, CacheService } from '@/common/cache';

import { ConfigService } from '@nestjs/config';
import { AssetOwnersUpdateQueue } from '@/api/v3/asset/asset.interface';
import {
  AWS_SQS_WALLET_SUMMARY_URL,
  QUEUE_ENV,
  QUEUE_STATUS,
} from '@/common/utils';

import { WalletSummary } from '@/model/entities/wallet-summary.entity';
import { WalletNftSummary } from '@/model/entities/wallet-nft-summary.entity';
import { AccountChainSummaryStats } from '@/model/entities/account-chain-summary-stats.entity';
import { SimpleException } from '@/common/utils/simple.util';

export interface ReturnAccount extends Account {
  follower: number;
  following: number;
  renameCount?: number;
}

@Injectable()
export class AccountService {
  protected readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectModel(Asset)
    private readonly assetRepository: typeof Asset,

    @InjectModel(AssetAsEthAccount)
    private readonly assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(Blockchain)
    private readonly blockchainRepository: typeof Blockchain,

    @InjectModel(Account)
    private readonly accountRepository: typeof Account,

    @InjectModel(Wallet)
    private readonly walletRepository: typeof Wallet,

    @InjectModel(AccountAccountFollow)
    private readonly accountAccountFollowRepository: typeof AccountAccountFollow,

    @InjectModel(AccountFeatured)
    private readonly accountFeaturedRepository: typeof AccountFeatured,

    @InjectModel(AccountFeaturedAsset)
    private readonly accountFeaturedAssetRepository: typeof AccountFeaturedAsset,

    @InjectModel(AccountSocialToken)
    private readonly accountSocialTokenRepository: typeof AccountSocialToken,

    @InjectModel(AccountReferral)
    private readonly accountReferralRepository: typeof AccountReferral,

    @InjectModel(WalletSummary)
    private readonly walletSummaryRepository: typeof WalletSummary,

    @InjectModel(WalletNftSummary)
    private readonly walletNftSummaryRepository: typeof WalletNftSummary,

    @InjectModel(AccountChainSummaryStats)
    private readonly accountChainSummaryStatsRepository: typeof AccountChainSummaryStats,

    @InjectModel(AccountRenameLog)
    private readonly accountRenameLogRepository: typeof AccountRenameLog,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly assetService: AssetService,

    private readonly httpService: HttpService,

    private readonly cacheService: CacheService,

    private readonly configService: ConfigService,
  ) { }

  async getOwners(options: GetAccountsQuery): Promise<GetAccountsResponse> {
    if (options.chainId && options.contractAddress && options.tokenId) {
      try {
        const asset = await this.assetRepository.findOne({
          attributes: ['id'],
          where: {
            tokenId: options.tokenId,
            chainId: options.chainId,
          },
          include: [
            {
              attributes: ['id'],
              model: Contract,
              where: {
                address: options.contractAddress.toLowerCase(),
              },
            },
          ],
        });

        const { rows, count } =
          await this.assetAsEthAccountRepository.findAndCountAll({
            attributes: ['ownerAddress', 'quantity', 'updatedAt'],
            where: {
              assetId: asset.id,
              quantity: {
                [Op.ne]: '0',
              },
            },
            include: [
              {
                attributes: ['id'],
                model: Wallet,
                include: [
                  {
                    attributes: ['id', 'username', 'avatarUrl'],
                    model: Account,
                    include: [
                      {
                        attributes: ['name'],
                        model: Badge,
                      },
                      {
                        attributes: ['name'],
                        model: AvatarDecoration,
                      },
                    ],
                  },
                ],
              },
            ],
            limit: options.limit,
            offset: (options.page - 1) * options.limit,
            order: [[cast(col('quantity'), 'DECIMAL(78, 0)'), 'DESC']], // quantity is a string
          });

        const accounts = rows.map((owner) => {
          return {
            id: owner.Wallet?.Account.id,
            username: owner.Wallet?.Account.username,
            avatarUrl: owner.Wallet?.Account.avatarUrl,
            address: owner.ownerAddress,
            quantity: owner.quantity,
            badge: owner.Wallet?.Account.Badge?.name,
            avatarDecoration: owner.Wallet?.Account.AvatarDecoration?.name,
            updatedAt: owner.updatedAt,
          };
        });
        return { accounts, count };
      } catch (err) {
        return Promise.reject(err);
      }
    }
  }

  async getProfile(username) {
    try {
      const account = await this.getAccountByUsername(username);
      if (!account) {
        throw new Error(`account username ${username} not found`);
      }
      if (account.block === BlockStatus.BLOCKED) {
        throw new HttpException('Account FORBIDDEN', HttpStatus.FORBIDDEN);
      }
      const chainStats = await this.accountChainSummaryStatsRepository.findOne({
        where: { accountId: account.id },
      });
      const renameCount = await this.getAccountRenameCount(account.id);

      (account as any).chainDataVisibility = chainStats?.visibility ?? true;
      (account as any).renameCount = renameCount;
      return account;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async getAccountByUsername(username: string): Promise<ReturnAccount> {
    try {
      const account = await this.accountRepository.findOne({
        attributes: [...AccountAttributes, 'email'],
        where: {
          username,
          deletedAt: null,
        },
        include: [
          {
            model: Wallet,
            where: {
              status: 'ACTIVE',
            },
            attributes: ['address', 'isMainWallet', 'chainFamily', 'provider'],
          },
          {
            model: Badge,
          },
          {
            model: AvatarDecoration,
          },
          {
            model: AccountSocialToken,
            attributes: [
              'provider',
              'providerAccountId',
              'name',
              'email',
              'picture',
            ],
          },
        ],
      });

      const follower = await AccountAccountFollow.count({
        where: {
          followingId: account.id,
          isFollow: true,
        },
      });

      const following = await AccountAccountFollow.count({
        where: {
          followerId: account.id,
          isFollow: true,
        },
      });

      const returnAccount = account.toJSON() as ReturnAccount;
      returnAccount.follower = follower;
      returnAccount.following = following;

      return returnAccount;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async updateAccountUsername(accountId: string, username: string) {
    const account = await this.accountRepository.findOne({
      where: {
        id: accountId,
      },
    });
    if (!account) {
      throw SimpleException.fail({ debug: 'Account NOT FOUND' });
    }

    const existingAccount = await this.accountRepository.findOne({
      attributes: ['id'],
      where: {
        username,
      },
    });

    if (existingAccount) {
      throw SimpleException.fail({ debug: 'Username already exists' });
    }

    const beforeUsername = account.username;
    const afterUsername = username;

    // 確認更新次數
    const renameCount = await this.getAccountRenameCount(accountId);
    if (renameCount >= 1) {
      throw SimpleException.fail({ debug: 'Rename count exceeded' });
    }

    // 更新

    const updated = await this.accountRepository.update(
      { username },
      {
        where: {
          id: accountId,
        },
      },
    );

    if (updated[0] === 0) {
      throw SimpleException.fail({ debug: 'update failed' });
    }

    // 紀錄更新次數
    return await this.accountRenameLogRepository.create({
      accountId,
      beforeUsername,
      afterUsername,
    });
  }

  async getAccountRenameCount(accountId: string) {
    return await this.accountRenameLogRepository.count({
      where: {
        accountId,
      },
    });
  }

  async getUserInfo(query: GetAccountQuery) {
    try {
      if (_.isEmpty(query)) {
        throw new Error('query parameter is required');
      }
      const account = await this.getAccountByQuery(query);
      if (!account) {
        throw new HttpException('Account NOT FOUND', HttpStatus.NOT_FOUND);
      }
      if (account.block === BlockStatus.BLOCKED) {
        throw new HttpException('Account FORBIDDEN', HttpStatus.FORBIDDEN);
      }
      const chainStats = await this.accountChainSummaryStatsRepository.findOne({
        where: { accountId: account.id },
      });
      (account as any).chainDataVisibility = chainStats?.visibility ?? true;
      return account;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async getSimpleAccountByQuery(query: GetAccountQuery) {
    try {
      return await this.accountRepository.findOne({
        subQuery: false,
        attributes: AccountMinAttributes,
        include: [
          {
            model: Wallet,
            where: query.walletAddress
              ? {
                address: query.walletAddress.toLowerCase(),
              }
              : {},
            attributes: ['address', 'isMainWallet', 'chainFamily', 'provider'],
          },
          {
            attributes: ['name'],
            model: AvatarDecoration,
          },
        ],
        where: query.email
          ? {
            email: query.email,
          }
          : query.username
            ? {
              username: query.username,
            }
            : query.referralCode
              ? {
                referralCode: query.referralCode,
              }
              : {},
      });
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async getAccountByQuery(query: GetAccountQuery): Promise<ReturnAccount> {
    const where: WhereOptions = {};

    if (query.username) {
      where.username = query.username;
    }
    if (query.email) {
      where.email = query.email;
    }
    if (query.walletAddress) {
      const wallet = await Wallet.findOne({
        where: {
          address: query.walletAddress,
        },
      });
      if (!wallet) {
        return;
      }
      where.id = wallet.accountId;
    }
    if (query.referralCode) {
      where.referralCode = query.referralCode;
    }

    try {
      const account = await this.accountRepository.findOne({
        attributes: AccountAttributes,
        where,
        include: [
          {
            model: Wallet,
            where: {
              status: 'ACTIVE',
            },
            attributes: ['address', 'isMainWallet', 'chainFamily', 'provider'],
          },
          {
            model: Badge,
          },
          {
            model: AvatarDecoration,
          },
          {
            model: AccountSocialToken,
            attributes: [
              'provider',
              'providerAccountId',
              'name',
              'email',
              'picture',
            ],
          },
        ],
      });

      if (!account) {
        return;
      }

      const follower = await AccountAccountFollow.count({
        where: {
          followingId: account.id,
          isFollow: true,
        },
      });

      const following = await AccountAccountFollow.count({
        where: {
          followerId: account.id,
          isFollow: true,
        },
      });

      const returnAccount = account.toJSON() as ReturnAccount;
      returnAccount.follower = follower;
      returnAccount.following = following;

      return returnAccount;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async followAccount(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    {
      const accountFollow = await this.accountAccountFollowRepository.findOne({
        where: {
          followerId,
          followingId,
        },
      });

      if (accountFollow) {
        if (accountFollow.isFollow) {
          await this.accountAccountFollowRepository.update(
            { isFollow: false },
            {
              where: {
                followerId,
                followingId,
              },
            },
          );
          await this.updateAccountFollower(followingId);
          return false;
        } else {
          await this.accountAccountFollowRepository.update(
            { isFollow: true },
            {
              where: {
                followerId,
                followingId,
              },
            },
          );
        }
        await this.updateAccountFollower(followingId);
        return true;
      } else {
        await this.accountAccountFollowRepository.create({
          followerId,
          followingId,
          isFollow: true,
        });
        await this.updateAccountFollower(followingId);
        return true;
      }
    }
  }

  async updateAccountFollower(accountId: string) {
    const followerCount = await AccountAccountFollow.count({
      where: {
        followingId: accountId,
        isFollow: true,
      },
    });
    // this.logger.debug(`updateAccountFollower ${accountId} ${followerCount}`);
    await this.accountRepository.update(
      { follower: followerCount },
      { where: { id: accountId } },
    );
  }

  async getUserFollowingAccounts(opts: GetAccountFollow) {
    const follower = await this.accountRepository.findOne({
      where: {
        username: opts.username,
      },
    });
    const following = await this.accountAccountFollowRepository.findAll({
      where: {
        followerId: follower.id,
        isFollow: true,
      },
    });

    const followingIds = following.map((follow) => {
      return follow.followingId;
    });

    const { rows, count } = await this.accountRepository.findAndCountAll({
      where: {
        id: followingIds,
      },
      include: [
        {
          model: AvatarDecoration,
        },
        {
          model: Badge,
        },
      ],
      limit: opts.limit,
      offset: (opts.page - 1) * opts.limit,
    });

    const accounts = await this.getReturnAccountList(rows, '');

    return { accounts, count };
  }

  async getUserFollowingAccountsByAccountId(
    opts: GetAccountFollow,
    accountId: string,
  ) {
    const follower = await this.accountRepository.findOne({
      where: {
        username: opts.username,
      },
    });
    const following = await this.accountAccountFollowRepository.findAll({
      where: {
        followerId: follower.id,
        isFollow: true,
      },
    });

    const followingIds = following.map((follow) => {
      return follow.followingId;
    });

    const { rows, count } = await this.accountRepository.findAndCountAll({
      where: {
        id: followingIds,
      },
      include: [
        {
          model: AvatarDecoration,
        },
        {
          model: Badge,
        },
      ],
      limit: opts.limit,
      offset: (opts.page - 1) * opts.limit,
    });

    const accounts = await this.getReturnAccountList(rows, accountId);

    return { accounts, count };
  }

  async getUserFollowerAccounts(opts: GetAccountFollow) {
    const following = await this.accountRepository.findOne({
      where: {
        username: opts.username,
      },
    });
    const follower = await this.accountAccountFollowRepository.findAll({
      where: {
        followingId: following.id,
        isFollow: true,
      },
    });

    const followerIds = follower.map((follow) => {
      return follow.followerId;
    });

    const { rows, count } = await this.accountRepository.findAndCountAll({
      where: {
        id: followerIds,
      },
      include: [
        {
          model: AvatarDecoration,
        },
        {
          model: Badge,
        },
      ],
      limit: opts.limit,
      offset: (opts.page - 1) * opts.limit,
    });

    const accounts = await this.getReturnAccountList(rows, '');

    return { accounts, count };
  }

  async getUserFollowerAccountsByAccountId(
    opts: GetAccountFollow,
    accountId: string,
  ) {
    const following = await this.accountRepository.findOne({
      where: {
        username: opts.username,
      },
    });
    const follower = await this.accountAccountFollowRepository.findAll({
      where: {
        followingId: following.id,
        isFollow: true,
      },
    });

    const followerIds = follower.map((follow) => {
      return follow.followerId;
    });

    const { rows, count } = await this.accountRepository.findAndCountAll({
      where: {
        id: followerIds,
      },
      include: [
        {
          model: AvatarDecoration,
        },
        {
          model: Badge,
        },
      ],
      limit: opts.limit,
      offset: (opts.page - 1) * opts.limit,
    });

    const accounts = await this.getReturnAccountList(rows, accountId);
    return { accounts, count };
  }

  async getReturnAccountList(rows, accountId) {
    return await Promise.all(
      rows.map(async (account) => {
        const followerCount = await AccountAccountFollow.count({
          where: {
            followingId: account.id,
            isFollow: true,
          },
        });
        return {
          accountId: account.id,
          username: account.username,
          avatarUrl: account.avatarUrl,
          introduction: account.introduction,
          externalLinks: account.externalLinks,
          badge: account.Badge?.name || null,
          avatarDecoration: account.AvatarDecoration?.name || null,
          follower: followerCount,
          isFollowing:
            accountId !== ''
              ? await this.isFollowingAccount(accountId, account.id)
              : false,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        };
      }),
    );
  }

  async isFollowingAccount(followerId: string, followingId: string) {
    const accountFollow = await this.accountAccountFollowRepository.findOne({
      where: {
        followerId,
        followingId,
      },
    });

    if (accountFollow) {
      return accountFollow.isFollow;
    } else {
      return false;
    }
  }

  async getFeaturedAssets(username: string) {
    const account = await this.accountRepository.findOne({
      where: {
        username,
      },
    });

    const accountFeatureds = await this.accountFeaturedRepository.findAll({
      where: {
        accountId: account.id,
      },
      include: [
        {
          model: AccountFeaturedAsset,
        },
      ],
      order: [['rank', 'ASC']],
    });

    const features: FeaturedAssetSection[] = await Promise.all(
      accountFeatureds.map(async (accountFeatured) => {
        const featuredAssets = await Promise.all(
          accountFeatured.AccountFeaturedAssets.map(
            async (accountFeaturedAsset) => {
              try {
                const asset = await this.assetService.findById(
                  accountFeaturedAsset.assetId,
                );

                return {
                  name: accountFeaturedAsset.name,
                  description: accountFeaturedAsset.description,
                  assetId: accountFeaturedAsset.assetId,
                  rank: accountFeaturedAsset.rank,
                  asset: this.assetService.parseAsset(asset),
                };
              } catch (err) {
                // 為了在 findById error 時（可能是 blocked），不會影響到其他 featured asset
                null;
              }
            },
          ),
        );
        featuredAssets.sort((a, b) => a.rank - b.rank);

        return {
          name: accountFeatured.name,
          description: accountFeatured.description,
          rank: accountFeatured.rank,
          featuredAssets,
        };
      }),
    );

    return features;
  }

  async updateFeaturedAssets(
    accountId: string,
    featuredAssetsSection: FeaturedAssetSection[],
  ) {
    if (featuredAssetsSection.length > 4) {
      throw new HttpException(
        'Featured section count is over 4',
        HttpStatus.BAD_REQUEST,
      );
    }

    const account = await this.accountRepository.findOne({
      where: {
        id: accountId,
      },
      include: [
        {
          model: Wallet,
        },
      ],
    });

    for (const section of featuredAssetsSection) {
      if (section.featuredAssets.length > 10) {
        throw new HttpException(
          'Asset count is over 10',
          HttpStatus.BAD_REQUEST,
        );
      }

      let dbSection = await this.accountFeaturedRepository.findOne({
        where: {
          accountId,
          rank: section.rank,
        },
      });
      // if not found section, create new section
      // if exist section, delete old section and create new section
      if (!dbSection) {
        dbSection = await this.accountFeaturedRepository.create({
          accountId,
          rank: section.rank,
          name: section.name || '',
          description: section.description || '',
        });
      } else {
        await this.accountFeaturedRepository.update(
          {
            name: section.name || '',
            description: section.description || '',
          },
          {
            where: {
              id: dbSection.id,
            },
          },
        );
        await this.accountFeaturedAssetRepository.destroy({
          where: {
            accountFeaturedId: dbSection.id,
          },
        });
      }

      if (section.featuredAssets.length === 0) {
        await this.accountFeaturedRepository.destroy({
          where: {
            id: dbSection.id,
          },
        });
        continue;
      }

      for (const asset of section.featuredAssets) {
        if (!asset.assetId) {
          continue;
        }

        const AssetAsEthAccount =
          await this.assetAsEthAccountRepository.findOne({
            where: {
              assetId: asset.assetId,
              ownerAddress: account.wallets.map((wallet) => {
                return wallet.address;
              }),
            },
          });
        if (!AssetAsEthAccount) {
          throw new HttpException(
            `not asset ${asset.assetId} owner`,
            HttpStatus.BAD_REQUEST,
          );
        }

        await this.accountFeaturedAssetRepository.create({
          accountFeaturedId: dbSection.id,
          assetId: asset.assetId,
          name: asset.name || '',
          description: asset.description || '',
          rank: asset.rank,
        });
      }
    }
    return true;
  }

  // check account feature asset is owner
  async syncFeaturedAssets(username: string) {
    const account = await this.accountRepository.findOne({
      attributes: ['id', 'username'],
      where: {
        username,
      },
      include: [
        {
          attributes: ['address'],
          model: Wallet,
        },
      ],
    });
    const accountFeatureds = await this.accountFeaturedRepository.findAll({
      attributes: ['id'],
      where: {
        accountId: account.id,
      },
      include: [
        {
          attributes: ['id', 'assetId'],
          required: true,
          model: AccountFeaturedAsset,
          include: [
            {
              attributes: ['block'],
              model: AssetExtra,
              include: [
                {
                  attributes: ['block'],
                  model: Collection,
                },
              ],
            },
          ],
        },
      ],
      order: [['rank', 'ASC']],
    });

    if (accountFeatureds.length === 0) {
      return 'no featured asset';
    }

    // for delete blocked asset
    const needDeleteBlockedFeaturedAssetIds = accountFeatureds.flatMap(
      (accountFeatured) =>
        accountFeatured.AccountFeaturedAssets.filter(
          (featuredAsset) =>
            featuredAsset.AssetExtra.block === BlockStatus.BLOCKED ||
            featuredAsset.AssetExtra.Collection.block === BlockStatus.BLOCKED,
        ).map((filteredAsset) => filteredAsset.id),
    );

    // because blocked is global, so all to delete
    const deletedBlockedCount =
      await this.accountFeaturedAssetRepository.destroy({
        where: {
          id: needDeleteBlockedFeaturedAssetIds,
        },
      });

    // for delete non hold asset
    const assetAsEthAccount = await this.assetAsEthAccountRepository.findAll({
      where: {
        ownerAddress: account.wallets.map((wallet) => {
          return wallet.address;
        }),
      },
    });

    const ownedAssetIds = assetAsEthAccount.map((asset) => {
      return asset.assetId;
    });

    const featuredAssetIds = accountFeatureds
      .map((accountFeatured) => {
        return accountFeatured.AccountFeaturedAssets.map((asset) => {
          return asset.assetId;
        });
      })
      .flat();

    const exclusiveFeaturedAssetIds = featuredAssetIds.filter(
      (featuredAssetId) =>
        !ownedAssetIds.some((ownedAsset) => ownedAsset === featuredAssetId),
    );

    const needDeleteFeaturedAssets =
      await this.accountFeaturedAssetRepository.findAll({
        attributes: ['id'],
        where: {
          assetId: exclusiveFeaturedAssetIds,
        },
        include: [
          {
            attributes: ['id'],
            model: AccountFeatured,
            where: {
              accountId: account.id,
            },
          },
        ],
      });

    const deletedNonHoldCount =
      await this.accountFeaturedAssetRepository.destroy({
        where: {
          id: needDeleteFeaturedAssets.map((featuredAsset) => featuredAsset.id),
        },
      });

    const accountFeaturedAssets = await this.accountFeaturedRepository.findAll({
      attributes: ['id'],
      where: {
        accountId: account.id,
      },
      include: [
        {
          attributes: ['id'],
          model: AccountFeaturedAsset,
        },
      ],
    });

    const needDeleteGlobalEmptyFeatured = accountFeaturedAssets.filter(
      (featured) => featured.AccountFeaturedAssets.length === 0,
    );

    const deletedGlobalEmptyFeaturedCount =
      await this.accountFeaturedRepository.destroy({
        where: {
          id: needDeleteGlobalEmptyFeatured.map((featured) => featured.id),
        },
      });

    return {
      deletedBlockedCount,
      deletedNonHoldCount,
      deletedGlobalEmptyFeaturedCount,
    };
  }

  async updateAccountLastLogin({
    id,
    username,
    address,
    ip,
    area,
  }: {
    id?: string;
    username?: string;
    address?: string;
    ip?: string;
    area?: string;
  }) {
    if (!id && !username && !address) {
      this.logger.error('updateAccountLastLogin: no id, username, address');
    }

    if (
      (id && username) ||
      (id && address) ||
      (username && address) ||
      (id && username && address)
    ) {
      this.logger.error(
        `updateAccountLastLogin: too many options ${id}, ${username}, ${address}`,
      );
    }

    let account: Account;

    if (id) {
      account = await this.accountRepository.findOne({
        where: {
          id,
        },
      });
    }

    if (username) {
      account = await this.accountRepository.findOne({
        where: {
          username,
        },
      });
    }

    if (address) {
      account = await this.accountRepository.findOne({
        include: [
          {
            model: Wallet,
            where: {
              address: address.toLowerCase(),
            },
          },
        ],
      });
    }

    if (!account) {
      this.logger.error(
        `updateAccountLastLogin: account not found ${id}, ${username}, ${address}`,
      );
    }

    await this.accountRepository.update(
      {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginArea: area,
      },
      {
        where: {
          id: account.id,
        },
      },
    );

    this.logger.log(
      `account login: ${username} at ${new Date().toISOString()}`,
    );
  }
}
