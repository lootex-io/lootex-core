import { Injectable } from '@nestjs/common';
import { GpPoolTopUpDto } from '@/api/v3/account-gp/dto/gp-pool.dto';
import { GpPoolDao } from '@/core/dao/gp-pool-dao';
import { SimpleJson } from '@/common/utils/simple.util';

@Injectable()
export class GpPoolService {
  constructor(private readonly gpPoolDao: GpPoolDao) {}

  topUp(accountId: string, dto: GpPoolTopUpDto) {
    this.gpPoolDao.topUp({
      accountId: accountId,
      amount: dto.amount,
      note: dto.note ?? '',
    });
    return SimpleJson.success({ message: `Top up ${dto.amount} success` });
  }
}
