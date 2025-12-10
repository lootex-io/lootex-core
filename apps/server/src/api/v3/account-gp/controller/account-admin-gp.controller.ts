import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '@/api/v3/role/role.decorator';
import { Role } from '@/api/v3/role/role.interface';
import { AuthJwtGuard } from '@/api/v3/auth/auth.jwt.guard';
import { RoleGuard } from '@/api/v3/role/role.guard';
import { AccountAdminGpService } from '@/api/v3/account-gp/service/account-admin-gp.service';
import {
  AccountGpBalanceStatsDto,
  AccountGpTopupDetailDto,
  AccountRefundTxGp,
  AccountStatsOverBalanceDto,
  AccountStatsOverChangeDto,
} from '@/api/v3/account-gp/dto/account-admin-gp.dto';

@ApiTags('Account-admin-gp')
@ApiCookieAuth()
@Controller('api/v3/accounts-admin-gp')
export class AccountAdminGpController {
  constructor(private readonly accountAdminGpService: AccountAdminGpService) {}

  /**
   * 查詢單一用戶 GP history
   */
  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Get('/stats/account-balance')
  accountBalanceStats(@Query() dto: AccountGpBalanceStatsDto) {
    return this.accountAdminGpService.accountBalanceStats(dto);
  }

  /**
   * 查詢充值紀錄
   */
  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Get('/history/topup-detail')
  topupDetail(@Query() dto: AccountGpTopupDetailDto) {
    return this.accountAdminGpService.topupDetail(dto);
  }

  /**
   * 全站 over all data
   * 查詢當前用戶有的 GP 餘額總量排序
   * 使用分頁向下查詢
   */
  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Get('/stats/over-balance')
  overBalanceStats(@Query() dto: AccountStatsOverBalanceDto) {
    return this.accountAdminGpService.overBalanceStats(dto);
  }

  /**
   * 全站 over all data
   * 查詢當前用戶有的 GP 餘額總量排序
   * 使用分頁向下查詢
   */
  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Get('/stats/over-change')
  statsOverChange(@Query() dto: AccountStatsOverChangeDto) {
    return this.accountAdminGpService.overChangeStats(dto);
  }

  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Post('/refund-tx-gp')
  refundTxGp(@Body() dto: AccountRefundTxGp) {
    return this.accountAdminGpService.refundTxGp(dto);
  }
}
