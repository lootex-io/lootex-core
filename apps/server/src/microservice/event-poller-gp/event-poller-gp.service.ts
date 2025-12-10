import { Injectable, Logger } from '@nestjs/common';
import {
  BaseEventPollerService,
  EventProject,
} from '@/core/base/event-poller/base-event-poller.service';
import { ethers } from 'ethers';
import { ConfigurationService } from '@/configuration';
import { GP_TOPUP_PROJECTS } from '@/microservice/event-poller-gp/constants';
import { BigNumber } from 'bignumber.js';
import { GpDao } from '@/core/dao/gp-dao';
import { WalletService } from '@/api/v3/wallet/wallet.service';
import { ChainId } from '@/common/utils/types';
import { SdkEnvService } from '@/core/sdk/service/sdk-env.service';
import { SdkEnv } from '@/core/sdk/constants/env-constants';

/**
 * 监控 GP TOP—UP success
 */
@Injectable()
export class EventPollerGpService extends BaseEventPollerService {
  constructor(
    private readonly walletService: WalletService,
    private readonly configService: ConfigurationService,
    private readonly gpDao: GpDao,
    private readonly sdkEnvService: SdkEnvService,
  ) {
    super(new Logger(EventPollerGpService.name));
  }

  onCreateEventProject() {
    this.latestBlockOffset = 1;
    this.eventFilter = {
      topics: [[ethers.utils.id('Deposit(address,address,uint256)')]],
    };
    return GP_TOPUP_PROJECTS;
  }

  async handleEvent(
    project: EventProject,
    seaport: ethers.Contract,
    event: ethers.Event,
  ) {
    console.log('event ', event);
    const rateLootGp = await this.sdkEnvService.getNumber(
      SdkEnv.GP_EXCHANGE_LOOT_GP,
    );
    const gpTokenDecimal = await this.sdkEnvService.getNumber(
      SdkEnv.GP_TOKEN_DECIMAL,
    );
    const parsedEvent = seaport.interface.parseLog(event);
    console.log('parsedEvent ', parsedEvent);
    if (parsedEvent.name === 'Deposit') {
      const txHash = event.transactionHash;
      const toAddress = parsedEvent.args._to;
      const gpTokenAmount = Math.floor(
        new BigNumber(parsedEvent.args._lootAmount.toString())
          .shiftedBy(-gpTokenDecimal) // /
          .times(rateLootGp) // x
          .toNumber(),
      );
      this.logger.log(
        `txHash ${txHash}, toAddress ${toAddress}, gpTokenAmount ${gpTokenAmount}`,
      );
      await this.gpDao
        .createTopUpHistory({
          address: toAddress,
          chainId: project.chainId,
          amount: gpTokenAmount.toString(),
          lootAmount: parsedEvent.args._lootAmount.toString(),
          txHash: txHash,
        })
        .finally(() => {
          this.logger.log(
            `handleEvent recodeWalletHistoryByTxHash ${project.chainId} ${txHash}`,
          );
          this.walletService.recodeWalletHistoryByTxHash(
            project.chainId.toString() as ChainId,
            txHash,
          );
        });
    }
  }
}
