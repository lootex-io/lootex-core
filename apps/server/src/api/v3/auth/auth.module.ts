import { Module, DynamicModule } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from '@/api/v3/auth/auth.controller';
import { AuthService } from '@/api/v3/auth/auth.service';
import { ConfigurationService } from '@/configuration/configuration.service';
import { HttpModule } from '@nestjs/axios';
import { BlockchainService } from '@/external/blockchain/blockchain.service';
import { providers } from '@/model/providers';
import { SendInBlueModule } from '@/external/send-in-blue/send-in-blue.module';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';

import { DiscordStrategy } from './discord.strategy';
import { AccountService } from '../account/account.service';
import { ConfigService } from '@nestjs/config';
import { AssetService } from '../asset/asset.service';
import { AssetExtraService } from '../asset/asset-extra.service';
import { TraitService } from '../trait/trait.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '../collection/collection.service';
import { ContractService } from '../contract/contract.service';
import { QueueService } from '@/external/queue/queue.service';

import { OrderService } from '../order/order.service';
import { CurrencyService } from '../currency/currency.service';
import { StorageService } from '@/external/storage/storage.service';

@Module({})
export class AuthModule {
  public static forRootAsync(options: Record<string, unknown>): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        JwtModule.registerAsync(options),
        HttpModule.registerAsync(options),
        SendInBlueModule,
        SequelizeModule.forFeature(entities),
      ],
      controllers: [AuthController],
      providers: [
        AccountService,
        JwtService,
        ConfigService,
        AssetService,
        AssetExtraService,
        TraitService,
        LibsService,
        CollectionService,
        ContractService,
        QueueService,

        AuthService,
        ConfigurationService,
        BlockchainService,

        DiscordStrategy,
        OrderService,
        CurrencyService,
        StorageService,

        ...providers,
      ],
      exports: [AuthService],
    };
  }
}
