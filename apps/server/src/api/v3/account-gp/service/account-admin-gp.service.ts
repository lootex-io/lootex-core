import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Account, Blockchain, Wallet } from '@/model/entities';
import { AccountGpBalance } from '@/model/entities/gp/account-gp-balance.entitiy';
import { AccountGpBalanceHistory } from '@/model/entities/gp/account-gp-balance-history.entity';
import { SimpleException } from '@/common/utils/simple.util';
import { Op, QueryTypes } from 'sequelize';
import { GpTxEvent } from '@/model/entities/constant-model';
import { pagination } from '@/common/utils/pagination';
import {
  AccountGpBalanceStatsDto,
  AccountGpTopupDetailDto,
  AccountRefundTxGp,
  AccountStatsOverBalanceDto,
  AccountStatsOverChangeDto,
} from '@/api/v3/account-gp/dto/account-admin-gp.dto';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import * as moment from 'moment';
import { GpDao } from '@/core/dao/gp-dao';

@Injectable()
export class AccountAdminGpService {
  constructor(
    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,
    @InjectModel(Account)
    private accountRepository: typeof Account,
    @InjectModel(AccountGpBalance)
    private accountGpBalanceRepository: typeof AccountGpBalance,
    @InjectModel(AccountGpBalanceHistory)
    private accountGpBalanceHistoryRepository: typeof AccountGpBalanceHistory,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly gpDao: GpDao,
  ) {}
  async accountBalanceStats(dto: AccountGpBalanceStatsDto) {
    let account: Account;
    if (dto.username) {
      account = await this.accountRepository.findOne({
        where: { username: dto.username },
      });
    } else if (dto.walletAddress) {
      account = await this.accountRepository.findOne({
        subQuery: false,
        include: [
          {
            model: Wallet,
            where: {
              address: dto.walletAddress.toLowerCase(),
            },
            attributes: ['id'],
          },
        ],
      });
    }
    if (!account) {
      throw SimpleException.error('Account not found.');
    }
    const accountGpBalance = await this.accountGpBalanceRepository.findOne({
      where: { accountId: account.id },
    });
    let where: any = {
      gpBalanceId: accountGpBalance.id,
    };
    if (dto.startTime && dto.endTime) {
      where = {
        ...where,
        createdAt: {
          [Op.gte]: new Date(+dto.startTime),
          [Op.lte]: new Date(+dto.endTime),
        },
      };
    }
    const ins = await this.accountGpBalanceHistoryRepository.sum('amount', {
      where: {
        ...where,
        event: { [Op.not]: GpTxEvent.TRANSACTION },
      },
    });
    const outs = await this.accountGpBalanceHistoryRepository.sum('amount', {
      where: { ...where, event: GpTxEvent.TRANSACTION },
    });
    const limit = dto.limit;
    const offset = (dto.page - 1) * dto.limit;
    const { rows, count } =
      await this.accountGpBalanceHistoryRepository.findAndCountAll({
        where: where,
        limit: limit,
        offset: offset,
        order: [['createdAt', 'desc']],
      });
    const data = {
      ins: ins ?? 0,
      outs: outs ?? 0,
      items: rows,
      pagination: pagination(count, dto.page, limit),
    };
    return data;
  }

  async topupDetail(dto: AccountGpTopupDetailDto) {
    const history = await this.accountGpBalanceHistoryRepository.findOne({
      where: {
        chain: dto.chainId,
        txHash: dto.txHash,
      },
    });
    return { object: history };
  }

  async overBalanceStats(dto: AccountStatsOverBalanceDto) {
    const limit = dto.limit;
    const offset = (dto.page - 1) * dto.limit;
    const { rows, count } =
      await this.accountGpBalanceRepository.findAndCountAll({
        subQuery: false,
        include: [
          {
            model: Account,
            attributes: ['id', 'username'],
          },
        ],
        limit: limit,
        offset: offset,
        order: [['availableBalance', 'desc']],
      });
    const data = {
      items: rows,
      pagination: pagination(count, dto.page, limit),
    };
    return data;
  }

  async overChangeStats(dto: AccountStatsOverChangeDto) {
    let where = '';
    let order = 'asc';
    if (dto.sortBy === '-in') {
      where = `not history.event = :event`;
      order = 'desc';
    } else if (dto.sortBy === 'in') {
      where = `not history.event = :event`;
      order = 'asc';
    } else if (dto.sortBy === '-out') {
      where = `history.event = :event`;
      order = 'desc';
    } else if (dto.sortBy === 'out') {
      where = `history.event = :event`;
      order = 'asc';
    } else {
      throw SimpleException.error('Parameters Error.');
    }

    if (!dto.startTime || !dto.endTime) {
      throw SimpleException.error('Parameters Error.');
    }

    where += ' and history.created_at BETWEEN :startTime AND :endTime';

    const formatStr = 'YYYY-MM-DD HH:mm:ss Z';
    const limit = dto.limit;
    const offset = (dto.page - 1) * dto.limit;
    const countSql = `
        SELECT COUNT(DISTINCT history.gp_balance_id)  AS total_count FROM account_gp_balance_history history where ${where}
    `;
    const sql = `
        SELECT u.username, SUM(ABS(history.amount)) AS total FROM account_gp_balance_history history
         inner join account_gp_balance agb on  history.gp_balance_id = agb.id
         inner join user_accounts u on  u.id = agb.account_id
         where ${where}
         GROUP BY u.username ORDER BY total ${order} limit :limit offset :offset;
    `;
    const queryOption = {
      replacements: {
        event: GpTxEvent.TRANSACTION,
        startTime: moment(+dto.startTime).utcOffset(0).format(formatStr),
        endTime: moment(+dto.endTime).utcOffset(0).format(formatStr),
        limit: limit,
        offset: offset,
      },
      type: QueryTypes.SELECT,
    };
    const countRes = await this.sequelizeInstance.query(countSql, queryOption);
    const count = parseInt((countRes[0] as any).total_count);
    const res = await this.sequelizeInstance.query(sql, queryOption);

    const data = {
      items: res,
      pagination: pagination(count, dto.page, limit),
    };
    return data;
  }

  async refundTxGp(dto: AccountRefundTxGp) {
    let refundedCount = 0;
    if (dto.historyIds) {
      if (dto.historyIds.length > 20) {
        throw SimpleException.error(
          'The number of GP records cannot exceed 20',
        );
      }
      const histories = await this.accountGpBalanceHistoryRepository.findAll({
        where: { id: dto.historyIds, event: GpTxEvent.TRANSACTION },
      });
      for (const history of histories) {
        if (history.txStatus != null) {
          if (history.txStatus == -1) {
            throw SimpleException.error('Record has been refunded.');
          } else if (history.txStatus == 1) {
            throw SimpleException.error(
              'Record has been executed on the chain.',
            );
          }
        }
        await this.gpDao.notifyRefundPaymentTransactionHistory(history);
        refundedCount++;
      }
    }
    return { updatedCount: refundedCount };
  }
}
