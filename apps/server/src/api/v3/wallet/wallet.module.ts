import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { providers } from '@/model/providers';
import { JwtService } from '@nestjs/jwt';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { CollectionService } from '../collection/collection.service';
import { AssetService } from '../asset/asset.service';
import { AssetExtraService } from '../asset/asset-extra.service';
import { AccountService } from '../account/account.service';
import { ContractService } from '../contract/contract.service';
import { LibsService } from '@/common/libs/libs.service';
import { OrderService } from '../order/order.service';
import { BlockchainService } from '@/external/blockchain';
import { TraitService } from '../trait/trait.service';


import { CurrencyService } from '@/core/third-party-api/currency/currency.service';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  providers: [
    WalletService,
    JwtService,
    GatewayService,
    CollectionService,
    AssetService,
    AssetExtraService,
    AccountService,
    ContractService,
    LibsService,
    OrderService,
    BlockchainService,
    TraitService,


    CurrencyService,
    ...providers,
  ],
  controllers: [WalletController],
})
export class WalletModule { }
