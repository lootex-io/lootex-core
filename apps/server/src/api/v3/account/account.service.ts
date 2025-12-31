import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Account,
  Asset,
  AssetAsEthAccount,
  Contract,
  Wallet,
} from '@/model/entities';
import {
  AccountAttributes,
  AccountMinAttributes,
  GetAccountQuery,
  GetAccountsQuery,
  GetAccountsResponse,
} from '@/api/v3/account/account.interface';
import { cast, col, Op, Sequelize, WhereOptions } from 'sequelize';
import * as _ from 'lodash';
import { InjectModel } from '@nestjs/sequelize';
import { BlockStatus } from '@/model/entities/constant-model';
import { ProviderTokens } from '@/model/providers';
import {} from './account.dto';
import { QUEUE_ENV, QUEUE_STATUS } from '@/common/utils';

import { SimpleException } from '@/common/utils/simple.util';

export interface ReturnAccount extends Account {}

@Injectable()
export class AccountService {
  protected readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectModel(Asset)
    private readonly assetRepository: typeof Asset,

    @InjectModel(AssetAsEthAccount)
    private readonly assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(Account)
    private readonly accountRepository: typeof Account,

    @InjectModel(Wallet)
    private readonly walletRepository: typeof Wallet,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,
  ) {}

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
        attributes: AccountAttributes,
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
        ],
      });

      const returnAccount = account.toJSON() as ReturnAccount;

      return returnAccount;
    } catch (err) {
      return Promise.reject(err);
    }
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
        ],
        where: query.username
          ? {
              username: query.username,
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
        ],
      });

      if (!account) {
        return;
      }

      return account.toJSON() as ReturnAccount;
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
