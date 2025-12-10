import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AccountGpBalance } from '@/model/entities/gp/account-gp-balance.entitiy';
import { GpBalanceHistoryQueryDto } from '@/api/v3/account-gp/dto/account-gp.dto';
import { Account, Blockchain } from '@/model/entities';
import { AccountGpBalanceHistory } from '@/model/entities/gp/account-gp-balance-history.entity';
import { Op } from 'sequelize';
import { pagination } from '@/common/utils/pagination';

@Injectable()
export class AccountGpHistoryService {
  protected readonly logger = new Logger(AccountGpHistoryService.name);

  constructor(
    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,
    @InjectModel(Account)
    private accountRepository: typeof Account,
    @InjectModel(AccountGpBalance)
    private accountGpBalanceRepository: typeof AccountGpBalance,
    @InjectModel(AccountGpBalanceHistory)
    private accountGpBalanceHistoryRepository: typeof AccountGpBalanceHistory,
  ) {}

  async list(accountId: string, filter: GpBalanceHistoryQueryDto) {
    console.log(filter);
    let where = {};
    if (filter.event && filter.event.length > 0) {
      where = { ...where, event: { [Op.in]: filter.event } };
    }
    const { rows, count } =
      await this.accountGpBalanceHistoryRepository.findAndCountAll({
        where: where,
        include: [
          {
            required: true,
            model: AccountGpBalance,
            as: 'accountGpBalance',
            attributes: [],
            where: { accountId: accountId },
          },
        ],
        limit: filter.limit,
        offset: (filter.page - 1) * filter.limit,
        order: [['created_at', 'desc']],
      });
    return {
      items: rows.map((row) => {
        delete row.accountGpBalance;
        console.log('row ', row);
        return row;
      }),
      pagination: pagination(count, filter.page, filter.limit),
    };
  }
}
