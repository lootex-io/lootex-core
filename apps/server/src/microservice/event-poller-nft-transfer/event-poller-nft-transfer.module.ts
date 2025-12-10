import { sequelizeProvider } from '@/model/providers';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { CoreModule } from '@/core/core.module';
import { WalletService } from '@/api/v3/wallet/wallet.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { LibsService } from '@/common/libs/libs.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { StorageService } from '@/external/storage/storage.service';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { AccountService } from '@/api/v3/account/account.service';
import { OrderService } from '@/api/v3/order/order.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { QueueService } from '@/external/queue/queue.service';
import { BlockchainService } from '@/external/blockchain';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { EventPollerNftTransferService } from './event-poller-nft-transfer.service';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature(entities),
  ],
  controllers: [],
  providers: [
    QueueService,
    ContractService,
    LibsService,
    CollectionService,
    WalletService,
    TraitService,
    StorageService,
    CurrencyService,
    AccountService,
    OrderService,
    AssetService,
    BlockchainService,
    AssetExtraService,
    EventPollerNftTransferService,
    sequelizeProvider,
  ],
})
export class EventPollerNftTransferModule {}
