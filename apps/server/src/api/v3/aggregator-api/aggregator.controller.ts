import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  Query,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AggregatorService } from '@/api/v3/aggregator-api/aggregator.service';
import {
  AggregatorSignatureOrderDto,
  AggregatorSyncOrderDto,
} from '@/api/v3/aggregator-api/aggregator.dto';
import { Roles } from '@/api/v3/role/role.decorator';
import { Role } from '@/api/v3/role/role.interface';
import { AuthJwtGuard } from '@/api/v3/auth/auth.jwt.guard';
import { RoleGuard } from '@/api/v3/role/role.guard';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { BotDetectionGuard } from '@/common/guards/bot-detection.guard';
import {
  IsSearchEngineBot,
  BotType,
  UserAgent,
} from '@/common/decorators/bot-detection.decorator';

@ApiTags('Aggregator')
@ApiCookieAuth()
@Controller('api/v3')
export class AggregatorController {
  private readonly logger = new Logger(AggregatorController.name);

  constructor(private readonly aggregatorService: AggregatorService) {}

  @Get('aggregator/status')
  status() {
    return this.aggregatorService.status();
  }

  @Post('aggregator/syncOrder')
  @UseGuards(BotDetectionGuard)
  async syncOrder(
    @Body() dto: AggregatorSyncOrderDto,
    @IsSearchEngineBot() isBot: boolean,
    @BotType() botType: string,
    @UserAgent() userAgent: string,
  ) {
    // 檢查是否為搜索引擎爬蟲訪問
    if (isBot) {
      this.logger.debug(
        `🤖 ${botType} 訪問 aggregator/syncOrder，跳過同步操作`,
      );
      return {
        synced: false,
        msg: 'Skipped for Search Engine Bot',
        reason: `${botType} detected, skipping sync operation to reduce database load`,
        botType: botType,
        cacheTime: 3600, // 1小時緩存
      };
    }

    this.logger.debug(`👤 正常用戶訪問 aggregator/syncOrder，執行同步操作`);
    return this.aggregatorService.syncOrder(dto);
  }

  @Post('aggregator/os/signatures')
  @UseGuards(BotDetectionGuard)
  async syncSignatures(
    @Body() orders: AggregatorSignatureOrderDto[],
    @IsSearchEngineBot() isBot: boolean,
    @BotType() botType: string,
    @UserAgent() userAgent: string,
  ) {
    // 檢查是否為搜索引擎爬蟲訪問
    if (isBot) {
      this.logger.debug(
        `🤖 ${botType} 訪問 aggregator/os/signatures，跳過同步操作`,
      );
      return {
        synced: false,
        msg: 'Skipped for Search Engine Bot',
        reason: `${botType} detected, skipping signatures sync operation`,
        botType: botType,
        cacheTime: 3600, // 1小時緩存
      };
    }

    this.logger.debug(`👤 正常用戶訪問 aggregator/os/signatures，執行同步操作`);
    return this.aggregatorService.syncOsSignatures(orders);
  }

  @Get('aggregator/os/collection-nfts')
  @Cacheable({ seconds: 10 })
  getCollectionNfts(@Query() dto) {
    return this.aggregatorService.getCollectionNfts(dto.slug);
  }

  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Post('aggregator/os/reload-slug')
  reloadSlug(@Body() dto) {
    return this.aggregatorService.reloadSlug(dto.slug);
  }

  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Post('aggregator/os/remove-slug')
  removeSlug(@Body() dto) {
    return this.aggregatorService.removeSlug(dto.slug);
  }

  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Get('aggregator/os/rpc-stats')
  rpcStats() {
    return this.aggregatorService.rpcStats();
  }

  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Get('aggregator/os/rpc-stats-clean')
  rpcStatsClean() {
    return this.aggregatorService.rpcStatsClean();
  }
}
