import { Module } from '@nestjs/common';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';
import { AccountService } from '../account/account.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { StorageModule } from '@/external/storage/storage.module';
import { providers } from '@/model/providers';
import { AssetService } from '../asset/asset.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigurationService } from '@/configuration';
import { ConfigService } from '@nestjs/config';
import { AssetExtraService } from '../asset/asset-extra.service';
import { BlockchainService } from '@/external/blockchain';
import { TraitService } from '../trait/trait.service';
import { LibsService } from '@/common/libs/libs.service';
import { QueueService } from '@/external/queue/queue.service';
import { CollectionService } from '../collection/collection.service';
import { ContractService } from '../contract/contract.service';
import { CurrencyService } from '../currency/currency.service';

import { OrderService } from '../order/order.service';

import { SendInBlueModule } from '@/external/send-in-blue/send-in-blue.module';
import { StudioUploadService } from './upload/service/studio-upload.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    StorageModule,
    SendInBlueModule,
    SequelizeModule.forFeature(entities),
    AuthModule,
  ],
  providers: [
    StudioService,
    AccountService,
    AuthService,
    JwtService,
    ConfigService,
    ConfigurationService,
    AssetService,
    AssetExtraService,
    BlockchainService,
    TraitService,
    LibsService,
    CollectionService,
    ContractService,
    QueueService,

    OrderService,
    CurrencyService,
    StudioUploadService,

    ...providers,
  ],
  controllers: [StudioController],
  exports: [StudioService],
})
export class StudioModule {}
