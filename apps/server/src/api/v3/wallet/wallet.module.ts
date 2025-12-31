import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { providers } from '@/model/providers';
import { JwtService } from '@nestjs/jwt';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { CurrencyService } from '@/core/third-party-api/currency/currency.service';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  providers: [
    WalletService,
    JwtService,
    GatewayService,
    CurrencyService,
    ...providers,
  ],
  controllers: [WalletController],
})
export class WalletModule { }
