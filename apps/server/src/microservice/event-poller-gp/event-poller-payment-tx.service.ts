import { Injectable, Logger } from '@nestjs/common';
import {
  BaseEventPollerService,
  EventProject,
} from '@/core/base/event-poller/base-event-poller.service';
import { ethers } from 'ethers';
import { GP_PURCHASE_PROJECTS } from '@/microservice/event-poller-gp/constants';
import { GpDao } from '@/core/dao/gp-dao';

import { ConfigurationService } from '@/configuration';

/**
 * 监控GP 代付 NFT tx
 */
@Injectable()
export class EventPollerPaymentTxService extends BaseEventPollerService {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly gpDao: GpDao,
  ) {
    super(new Logger(EventPollerPaymentTxService.name));
  }
  onCreateEventProject() {
    this.eventFilter = {
      topics: [
        [
          ethers.utils.id(
            'DelegateBuyExecuted(address[],address,uint256[],uint256[],uint256[],uint256[],bytes[][])',
          ),
        ],
      ],
    };
    return GP_PURCHASE_PROJECTS;
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
    if (parsedEvent.name === 'DelegateBuyExecuted') {
      console.log('args ', parsedEvent.args);
      const txHash = event.transactionHash;
      const txStatus = (await event.getTransactionReceipt()).status;

      const consumedGps = parsedEvent.args['consumedGp'].toString().split(',');
      const signatures = parsedEvent.args['adminSignature']
        .toString()
        .split(',');
      for (let i = 0; i < consumedGps.length; i++) {
        const consumedGp = consumedGps[i];
        const data = {
          chainId: project.chainId,
          txHash: txHash,
          sender: parsedEvent.args['requester'].toString(),
          gpAmount: consumedGp,
          endTime: parseInt(parsedEvent.args['endTime'].toString()),
          txStatus: txStatus,
          signatures: signatures.slice(i * 3, i * 3 + 3),
        };
        await this.gpDao.notifyPaymentTransactionHistory(data);
      }
    }
  }
}
