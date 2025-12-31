import * as _ from 'lodash';
import {
  OrderListResponse,
  OrderHistoryListResponse,
  Category,
} from './order.interface';
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
  Put,
  HttpException,
  Param,
  Req,
  Ip,
} from '@nestjs/common';
import {
  CreateOrderDTO,
  GetAccountOrderReceiveDTO,
  GetOrderDTO,
  GetOrderHistoryDTO,
  SyncOrderDTO,
  SyncTransactionDto,
  DisableOrdersDTO,
} from './order.dto';
import { OrderService } from './order.service';
import { AuthJwtGuard } from '@/api/v3/auth/auth.jwt.guard';
import { OrderList, OrderHistoryList } from './order.interceptor';
import { CurrentUser } from '@/api/v3/auth/auth.decorator';
import { Account } from '@/model/entities';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { ChainId } from '@/common/utils/types';
import { NewAssetList } from '../asset/asset.interceptor';
import * as promise from 'bluebird';

@ApiTags('Order')
@ApiCookieAuth()
@Controller('api/v3')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }
  @Post('orders')
  async createSeaportOrder(@Body() createOrderDto: CreateOrderDTO, @Req() req) {
    try {
      const apiKey = req.headers['x-api-key'];

      const seaportOrder =
        this.orderService.getSeaportOrderStructureByCreateOrderDTO(
          createOrderDto,
        );

      const isSignatureValid =
        await this.orderService.isValidateSeaportOrdersSignature(
          +createOrderDto.chainId,
          createOrderDto.exchangeAddress.toLowerCase(),
          [seaportOrder],
        );

      if (!isSignatureValid) {
        throw new HttpException('Invalid signature', 400);
      }

      return await this.orderService.createOrder(createOrderDto, {
        apiKey,
      });
    } catch (error) {
      throw new HttpException(error.message, 400);
    }
  }

  @Post('orders/bulk')
  async createBulkSeaportOrder(
    @Body() createOrderDtos: CreateOrderDTO[],
    @Req() req,
  ) {
    try {
      const apiKey = req.headers['x-api-key'];

      const seaportOrders = createOrderDtos.map((order) =>
        this.orderService.getSeaportOrderStructureByCreateOrderDTO(order),
      );

      const isSignatureValid =
        await this.orderService.isValidateSeaportOrdersSignature(
          +createOrderDtos[0].chainId,
          createOrderDtos[0].exchangeAddress.toLowerCase(),
          seaportOrders,
        );

      if (!isSignatureValid) {
        throw new HttpException('Invalid signature', 400);
      }

      const successOrders = [];

      // Group orders by asset to avoid race condition on asset_extra update
      const groupedOrders = _.groupBy(createOrderDtos, (order) => {
        let item;
        // ItemType 2: ERC721, 3: ERC1155, 4: ERC721_WITH_CRITERIA, 5: ERC1155_WITH_CRITERIA
        const isNft = (i) => i.itemType >= 2 && i.itemType <= 5;

        if (order.category === Category.LISTING) {
          item = order.offer.find(isNft);
        } else {
          // For offers, the NFT is in consideration
          item = order.consideration.find(isNft);
        }

        if (item) {
          return `${item.token.toLowerCase()}:${item.identifierOrCriteria}`;
        }
        // Fallback for unknown or non-NFT orders (shouldn't happen for valid orders)
        return 'misc';
      });

      const orderGroups = Object.values(groupedOrders);

      await promise.map(
        orderGroups,
        async (orders: CreateOrderDTO[]) => {
          // Process orders for the same asset sequentially
          for (const order of orders) {
            successOrders.push(
              await this.orderService.createOrder(order, { apiKey }),
            );
          }
        },
        { concurrency: 5 },
      );

      return successOrders;
    } catch (error) {
      throw new HttpException(error.message, 400);
    }
  }

  @Get('orders')
  @UseInterceptors(OrderList)
  async getSeaportOrder(
    @Query() getOrderDto: GetOrderDTO,
  ): Promise<OrderListResponse> {
    const { orders, count } = await this.orderService.getOrder(getOrderDto);
    return { orders, count };
  }

  @Get('orders/history')
  @UseInterceptors(OrderHistoryList)
  async getSeaportOrderHistory(
    @Query() getOrderHistoryDto: GetOrderHistoryDTO,
  ): Promise<OrderHistoryListResponse> {
    const { ordersHistory, count } =
      await this.orderService.getOrderHistory(getOrderHistoryDto);
    return { ordersHistory, count };
  }

  @Get('orders/account/received-offer')
  @UseInterceptors(NewAssetList)
  async getAccountReceived(
    @Query() GetAccountOrderReceiveDTO: GetAccountOrderReceiveDTO,
  ) {
    return this.orderService.getAccountOrderReceived(GetAccountOrderReceiveDTO);
  }

  @Get('orders/sync')
  async syncSeaportOrder(@Query() params: SyncOrderDTO): Promise<boolean> {
    try {
      return await this.orderService.syncOrderByHash(
        params.hash,
        params.chainId,
        params.exchangeAddress,
      );
    } catch (error) {
      throw new HttpException(error.message, 400);
    }
  }

  @Get('orders/event-poller/status')
  @Cacheable({
    seconds: 10,
  })
  async getEventPollerStatus() {
    return await this.orderService.getEventPollerStatus();
  }

  @Put('orders/sync/:chainId/:txHash')
  async syncSeaportOrderByTxHash(
    @Ip() ip,
    @Param('chainId')
    chainId: ChainId,
    @Param('txHash') txHash: string,
    @Body() dto: SyncTransactionDto,
  ) {
    try {
      dto.ip = ip;
      dto.ipCountry = null;
      return await this.orderService.syncSeaportOrderByTxHash(
        chainId,
        txHash,
        dto,
      );
    } catch (error) {
      throw new HttpException(error.message, 400);
    }
  }

  // check orders/offerer/assets for certification
  @Post('orders/certification')
  async getOrdersCertification(@Body() syncOrdersDTO: SyncOrderDTO[]) {
    return await this.orderService.getOrdersCertification(syncOrdersDTO);
  }

  @Get('orders/collection-offer')
  async getCollectionOffer(
    @Query('slug') slug: string,
    @Query('force') force?: boolean,
  ) {
    return {
      bestCollectionOfferOrder: await this.orderService.getBestCollectionOffer(
        slug,
        force,
      ),
    };
  }

  @Put('orders/disable')
  @UseGuards(AuthJwtGuard)
  async disableOrder(
    @Query() options: DisableOrdersDTO,
    @CurrentUser() user: Account,
  ) {
    return await this.orderService.disableOrder(user.id, options);
  }

  @Put('orders/best-listing')
  async cacheBestListing(
    @Query('chainId') chainId?: ChainId,
    @Query('contractAddress') contractAddress?: string,
  ) {
    return await this.orderService.updateCollectionBestListingToCache(
      contractAddress,
      chainId,
      {
        force: true,
      },
    );
  }

  @Get('orders/platform-fee')
  @Cacheable({ key: 'platformFee', seconds: 60 })
  async getPlatformFee() {
    return await this.orderService.getPlatformFee();
  }
}
