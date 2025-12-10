import { Injectable, Logger } from '@nestjs/common';
import {
  BaseEventPollerService,
  EventProject,
} from '@/core/base/event-poller/base-event-poller.service';
import { ethers } from 'ethers';
import {
  GP_PAYMASTER_ABI,
  GP_PAYMASTER_CONTRACT,
} from '@/microservice/event-poller-gp/constants';
import { ENTRYPOINT_ABI } from '@/api/v3/wallet/constants';
import { GpDao } from '@/core/dao/gp-dao';
import { ChainUtil } from '@/common/utils/chain.util';
import { ConfigurationService } from '@/configuration';
import { SdkEnvService } from '@/core/sdk/service/sdk-env.service';
import { SdkEnv } from '@/core/sdk/constants/env-constants';

/**
 * 监控GP 代付 gas tx
 */
@Injectable()
export class EventPollerPaymasterTxService extends BaseEventPollerService {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly gpDao: GpDao,
    private readonly sdkEnvService: SdkEnvService,
  ) {
    super(new Logger(EventPollerPaymasterTxService.name));
  }
  onCreateEventProject() {
    this.eventFilter = {
      topics: [[ethers.utils.id('GasBalanceDeducted(address,uint256)')]],
    };
    const projects = [];
    for (const chainId of ChainUtil.POC_CHAINS) {
      const chainName = ChainUtil.chainIdToChain(chainId).toLowerCase();
      projects.push({
        name: `Game-Point-Tx-${chainName}`,
        chainId: chainId,
        contractAddress: GP_PAYMASTER_CONTRACT,
        abi: GP_PAYMASTER_ABI,
        pollingBatch: 100,
      });
    }
    return projects;
  }

  async handleEvent(
    project: EventProject,
    seaport: ethers.Contract,
    event: ethers.Event,
  ) {
    this.logger.log(
      `handleEvent ${project.name} txHash ${event.transactionHash} `,
    );
    const parsedEvent = seaport.interface.parseLog(event);
    if (parsedEvent.name === 'GasBalanceDeducted') {
      const txHash = event.transactionHash;
      const paymasterId = parsedEvent.args._paymasterId.toLowerCase();
      const paymasterIdEnv = await this.sdkEnvService.getString(
        SdkEnv.GP_PAYMASTER_ID,
      );
      if (paymasterId === paymasterIdEnv) {
        const tx = await event.getTransaction();
        const entrypoint_contractInterface = new ethers.utils.Interface(
          ENTRYPOINT_ABI,
        );

        let entrypointParsedData;
        try {
          entrypointParsedData = entrypoint_contractInterface.parseTransaction({
            data: tx.data.trim(),
          });
        } catch (err) {
          this.logger.error(
            `entrypoint_contractInterface.parseTransaction error, skip this hash ${txHash}, ${err.message}`,
          );
          return;
        }

        const sender = entrypointParsedData.args[0][0][0].toLowerCase();
        const nonce = entrypointParsedData.args[0][0][1].toString();
        const txStatus = (await event.getTransactionReceipt()).status;
        this.logger.log(
          `txHash ${txHash} sender ${sender} nonce ${nonce} paymasterId ${paymasterId} txStatus ${txStatus}`,
        );
        // if (txStatus === 1) { // success
        if (sender && txHash && nonce) {
          await this.gpDao.notifyTransactionHistory({
            chainId: project.chainId,
            txHash,
            sender,
            nonce,
            txStatus,
          });
        }
      }
    }
  }
}
