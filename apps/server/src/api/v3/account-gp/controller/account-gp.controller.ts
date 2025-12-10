import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser, CurrentWallet } from '@/api/v3/auth/auth.decorator';
import { Account, Wallet } from '@/model/entities';
import { AccountGpService } from '@/api/v3/account-gp/service/account-gp.service';
import {
  GpBalanceCostDTO,
  GpBalanceHistoryQueryDto,
  GpPaymentCostDto,
  GpPaymentSignatureDto,
  PaymasterCheckerDTO,
  PaymasterCheckerPlusDTO,
} from '@/api/v3/account-gp/dto/account-gp.dto';
import {
  AuthJwtGuard,
  AuthJwtGuardOptional,
} from '@/api/v3/auth/auth.jwt.guard';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { AccountGpHistoryService } from '@/api/v3/account-gp/service/account-gp-history.service';
import { AccountGpQuestService } from '@/api/v3/account-gp/service/account-gp-quest.service';
import { GpQuestType } from '@/model/entities/gp/account-gp-quest.entity';
import { AccountGpPaymentService } from '@/api/v3/account-gp/service/account-gp-payment.service';
import { AccountGpPaymentMutilSignatureService } from '@/api/v3/account-gp/service/account-gp-payment-mutil-signature.service';
import { TradeRewardService } from '@/api/v3/account-gp/service/trade-reward.service';
import { GpOrderRewardDto } from '@/api/v3/account-gp/dto/reward.dto';
import { AccountGpQuestCollectionService } from '@/api/v3/account-gp/service/collection-quest/account-gp-quest-collection.service';

@ApiTags('Account-gp')
@ApiCookieAuth()
@Controller('api/v3/accounts-gp')
export class AccountGpController {
  constructor(
    private readonly accountGpService: AccountGpService,
    private readonly accountGpHistoryService: AccountGpHistoryService,
    private readonly accountGpQuestService: AccountGpQuestService,
    private readonly accountGpPaymentService: AccountGpPaymentService,
    private readonly accountGpPaymentMutilSignatureService: AccountGpPaymentMutilSignatureService,
    private readonly tradeRewardService: TradeRewardService,
    private readonly accountGpQuestCollectionService: AccountGpQuestCollectionService,
  ) {}

  // @Get('/exchange-rate')
  // @Cacheable({ seconds: 5 })
  // exchangeRate() {
  //   return this.accountGpService.getExchangeRate();
  // }

  @Get('/payment-cost')
  getPaymentCost(@Query() dto: GpPaymentCostDto) {
    return this.accountGpPaymentService.getPaymentCost(dto);
  }

  @Get('/payment-cost-invert')
  getPaymentCostInvert(@Query() dto: GpPaymentCostDto) {
    dto.invert = true;
    return this.accountGpPaymentService.getPaymentCost(dto);
  }

  // @UseGuards(AuthJwtGuard)
  // @Post('/payment-signature')
  // getPaymentSignature(
  //   @CurrentUser() user: Account,
  //   @CurrentWallet() wallet: Wallet,
  //   @Body() dto: GpPaymentSignatureDto,
  // ) {
  //   // if (wallet.address.toLowerCase() !== dto.accountAddress.toLowerCase()) {
  //   //   throw SimpleException.error('accountAddress invalid.');
  //   // }
  //   // return this.accountGpPaymentService.getPaymentSignature(
  //   //   '7de77d93-5a2f-4cc7-afb4-b88d0f7b9d3c',
  //   //   dto,
  //   // );
  //   return this.accountGpPaymentService.getPaymentSignature(user.id, dto);
  // }

  @UseGuards(AuthJwtGuard)
  @Post('/payment-multi-signature')
  getPaymentMultiSignature(
    @CurrentUser() user: Account,
    @CurrentWallet() wallet: Wallet,
    @Body() dto: GpPaymentSignatureDto,
  ) {
    // return this.accountGpPaymentMutilSignatureService.getPaymentSignature(
    //   '7de77d93-5a2f-4cc7-afb4-b88d0f7b9d3c',
    //   dto,
    // );
    return this.accountGpPaymentMutilSignatureService.getPaymentSignature(
      user.id,
      dto,
    );
  }

  @UseGuards(AuthJwtGuard)
  @Post('/balance-cost')
  @Cacheable({ seconds: 10 })
  gpBalanceCost(@Body() dto: GpBalanceCostDTO) {
    return this.accountGpService.getGpBalanceCost(dto);
  }

  @Post('/paymaster-checker')
  paymasterChecker(@Body() dto: PaymasterCheckerDTO) {
    return this.accountGpService.paymasterCheckerCallback(dto);
  }

  @Post('/paymaster-checker-plus')
  paymasterCheckerPlus(@Body() dto: PaymasterCheckerPlusDTO) {
    console.log('paymaster-checker-plus dto ', JSON.stringify(dto));
    return this.accountGpService.paymasterCheckerPlusCallback(dto);
  }

  @UseGuards(AuthJwtGuard)
  @Get('/balance')
  accountBalance(@CurrentUser() user: Account) {
    return this.accountGpService.getAccountGpBalance(user.id);
  }

  @UseGuards(AuthJwtGuard)
  @Get('/history')
  history(
    @CurrentUser() user: Account,
    @Query() dto: GpBalanceHistoryQueryDto,
  ) {
    // return this.accountGpHistoryService.list(
    //   'c96fc022-0ade-40a7-ae1c-b18161199ddf',
    //   dto,
    // );
    return this.accountGpHistoryService.list(user.id, dto);
  }

  // @UseGuards(AuthJwtGuardOptional)
  // @Get('/quest/status')
  // questStatus(@CurrentUser() user: Account) {
  //   // return this.accountGpQuestService.getQuestStatus(
  //   //   '41fb76c1-6e1b-438d-8825-4e06af44e327',
  //   // );
  //   return this.accountGpQuestService.getQuestStatus(user?.id);
  // }

  @UseGuards(AuthJwtGuardOptional)
  @Get('/quest/status-daily')
  questStatusDaily(@CurrentUser() user: Account) {
    // return this.accountGpQuestService.getQuestStatus(
    //   '41fb76c1-6e1b-438d-8825-4e06af44e327',
    //   GpQuestType.DAILY,
    // );
    return this.accountGpQuestService.getQuestStatus(
      user?.id,
      GpQuestType.DAILY,
    );
  }

  @UseGuards(AuthJwtGuardOptional)
  @Get('/quest/status-one-off')
  getQuestStatusOneOff(@CurrentUser() user: Account) {
    // return this.accountGpQuestService.getQuestStatus(
    //   '41fb76c1-6e1b-438d-8825-4e06af44e327',
    //   GpQuestType.ONEOFF,
    // );
    return this.accountGpQuestService.getQuestStatus(
      user?.id,
      GpQuestType.ONEOFF,
    );
  }

  @UseGuards(AuthJwtGuardOptional)
  @Get('/quest/status-trade')
  getQuestStatusTrade(@CurrentUser() user: Account) {
    // return this.accountGpQuestService.getQuestStatus(
    //   '41fb76c1-6e1b-438d-8825-4e06af44e327',
    //   GpQuestType.TRADE,
    // );
    return this.accountGpQuestService.getQuestStatus(
      user?.id,
      GpQuestType.TRADE,
    );
  }

  @UseGuards(AuthJwtGuardOptional)
  @Get('/quest/status-recommend')
  getQuestStatusRecommend(@CurrentUser() user: Account) {
    // return this.accountGpQuestService.getQuestStatus(
    //   '41fb76c1-6e1b-438d-8825-4e06af44e327',
    //   GpQuestType.RECOMMEND,
    // );
    return this.accountGpQuestService.getQuestStatus(
      user?.id,
      GpQuestType.RECOMMEND,
    );
  }

  /**
   * 返回referral reward, trade reward
   * @param user
   */
  @UseGuards(AuthJwtGuardOptional)
  @Get('/quest/status-reward')
  getQuestStatusReward(@CurrentUser() user: Account) {
    // return this.accountGpQuestService.getQuestStatus(
    //   '41fb76c1-6e1b-438d-8825-4e06af44e327',
    //   GpQuestType.RECOMMEND,
    // );
    return this.tradeRewardService.getRewardStatus(
      // 'cb8b79a0-f1dd-4b24-b1a4-8c8f84aa8027',
      user?.id,
    );
  }

  @UseGuards(AuthJwtGuardOptional)
  @Get('/quest/status-collection')
  getQuestStatusCollection(@CurrentUser() user: Account) {
    return this.accountGpQuestCollectionService.getQuestStatus(
      // '6935441d-e83d-4704-b554-8a9ebadb80d0', // slider
      // 'cb8b79a0-f1dd-4b24-b1a4-8c8f84aa8027', // erin
      // '56797655-50cd-4698-8a02-7359ce888bc0', // yoshimi
      user?.id,
    );
  }

  @UseGuards(AuthJwtGuard)
  @Post('/quest/:questIndex/claim')
  questClaim(
    @CurrentUser() user: Account,
    @Param('questIndex') questIndex: number,
  ) {
    // return this.accountGpQuestService.claimQuestReward(
    //   // '6935441d-e83d-4704-b554-8a9ebadb80d0', // slider
    //   // 'cb8b79a0-f1dd-4b24-b1a4-8c8f84aa8027', // erin
    //   +questIndex,
    // );
    return this.accountGpQuestService.claimQuestReward(user.id, +questIndex);
  }

  @UseGuards(AuthJwtGuard)
  @Get('/referral-stats')
  @Cacheable({ seconds: 5 })
  getTradeRewards(@CurrentUser() user: Account) {
    return this.tradeRewardService.accountTradeRewardStats(
      // '56797655-50cd-4698-8a02-7359ce888bc0',
      user.id,
    );
  }

  /**
   * 计算订单reward
   */
  @UseGuards(AuthJwtGuard)
  @Post('/reward/cal-tx-reward')
  @Cacheable({ seconds: 5 })
  calOrderReward(@CurrentUser() user: Account, @Body() dto: GpOrderRewardDto) {
    return this.tradeRewardService.calOrderReward(
      // '56797655-50cd-4698-8a02-7359ce888bc0',
      user.id,
      dto,
    );
  }

  // @Get('/trade-stats-test')
  // getTradeRewardsTest(@CurrentUser() user: Account) {
  //   return this.tradeRewardService.test();
  // }
}
