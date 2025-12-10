import {
  Controller,
  Get,
  HttpException,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrencyAllPairs } from '@/api/v3/currency/currency.interface';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { CurrencyService as ThirdPartyCurrencyService } from '@/core/third-party-api/currency/currency.service';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { Roles } from '../role/role.decorator';
import { Role } from '../role/role.interface';
import { AuthJwtGuard } from '../auth/auth.jwt.guard';

@ApiTags('Currency')
@ApiCookieAuth()
@Controller('api/v3')
export class CurrencyController {
  constructor(
    private readonly currencyService: CurrencyService,
    private readonly thirdPartyCurrencyService: ThirdPartyCurrencyService,
  ) {}

  @Get('currency/all-pairs')
  @Cacheable({
    key: 'currency:all-pairs',
    seconds: 10,
  })
  async getCurrencyAllPairs(): Promise<CurrencyAllPairs> {
    try {
      return await this.currencyService.getAllPairs();
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('currency/pair/:symbol')
  @Cacheable({
    key: 'currency:pair',
    seconds: 10,
  })
  async getCurrencyPair(@Param('symbol') symbol: string) {
    try {
      return await this.currencyService.getCachePrice(symbol);
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('currency/history')
  @Cacheable({
    key: 'currency-history',
    seconds: 60,
  })
  async getCurrencyHistory(
    @Query('symbol') symbol: string,
    @Query('time') time: string,
    @Query('limit') limit = 50,
  ) {
    try {
      return {
        currencyPriceHistory: await this.currencyService.getCurrencyHistory(
          symbol,
          time,
          limit,
        ),
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard)
  @Put('currency/history')
  async putCurrencyHistory(
    @Query('symbol') symbol: string,
    @Query('startTime') startTime: Date,
    @Query('endTime') endTime: Date,
  ) {
    try {
      return {
        currencyPriceHistory: await this.currencyService.putCurrencyHistory(
          symbol,
          startTime,
          endTime,
        ),
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('currency/test')
  async gettest() {
    // return await this.thirdPartyCurrencyService.updateDefrogsPriceToCache();
    return await this.thirdPartyCurrencyService.updateAllPriceToCacheByMulticall();
    //   try {
    //     // const timestamps = this.currencyService.generateTimestampsFrom(
    //     //   new Date('2024-03-10T00:00:00Z'),
    //     //   // new Date('2024-03-14T00:00:00Z'),
    //     // );
    //     // 19432516
    //     const timestamps = this.currencyService.generateTimestampsFrom(
    //       new Date('2024-03-13T00:00:00Z'),
    //       new Date('2024-03-14T00:00:00Z'),
    //     );
    //     console.log(timestamps);
    //     const blocks = await promise.map(timestamps, async (timestamp) => {
    //       return await this.currencyService.calculateEthBlockAtTimestamp(
    //         timestamp,
    //       );
    //     });
    //     console.log(blocks);
    //     const allPrices = await promise.map(
    //       blocks,
    //       async (block) => {
    //         console.log(block);
    //         return {
    //           block: block,
    //           price: await this.currencyService.getAllPriceAtEthBlock(block),
    //         };
    //       },
    //       { concurrency: 3 },
    //     );
    //     return allPrices;
    //   } catch (err) {
    //     throw new HttpException(err.message, 400);
    //   }
  }
}
