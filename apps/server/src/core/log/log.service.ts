import { Injectable } from '@nestjs/common';

@Injectable()
export class LogService {
  constructor() { }
  async log(type: string, action: string, args?: { [key: string]: any }) {
    if (type === LOG_TYPE.COMMON) {
      // await this.smallLogService.log(type, action, args);
    }
  }

  async common(action: string, args?: { [key: string]: any }) {
    // await this.smallLogService.log(LOG_TYPE.COMMON, action, args);
  }
}

export enum LOG_TYPE {
  RPC_EVENT_POLLER = 'rpc_event_poller',
  RPC_SERVICE = 'rpc_service',
  MORALIS = 'moralis',
  COVALENT = 'covalent',
  ARCHEMY = 'alchemy',
  NFTSCAN = 'nftscan',
  COMMON = 'common', // default
}
