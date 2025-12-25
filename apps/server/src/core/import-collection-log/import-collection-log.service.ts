import { Injectable, Logger } from '@nestjs/common';
import { RpcQueryChain } from '@/common/libs/libs.service';
import { CLOUDWATCH_LOGS } from '@/common/utils';
import { ChainUtil } from '@/common/utils/chain.util';

@Injectable()
export class ImportCollectionLogService {
  private readonly logger = new Logger(ImportCollectionLogService.name);

  static CATEGORY_RPC = 'rpc';
  static CATEGORY_MORALIS = 'moralis';
  static CATEGORY_COVALENT = 'covalent';
  static CATEGORY_METADATA = 'metadata';
  static CATEGORY_OTHER = 'other';

  constructor() {}

  async createLog(options: {
    category: string;
    funName: string;
    funParameter: string;
  }) {
    // await this.importCollectionLogRepository.create({
    //   category: options.category,
    //   chainId: -1,
    //   address: '',
    //   tokenId: '',
    //   funName: options.funName,
    //   funParameter: options.funParameter,
    //   rpcEnd: '',
    // });
    const cloudwatchLog = this._convertCategory(options.category);
    this.logger.log(
      `createLog ${cloudwatchLog} ${options.funName} ${options.funParameter}`,
    );
  }

  async createRpcLog(options: {
    chainId: RpcQueryChain;
    address: string;
    tokenId: string;
    funName: string;
    funParameter: string;
  }) {
    this.logger.log(
      `createLog ${CLOUDWATCH_LOGS.RPC_SERVICE} ${
        options.funName
      } chain ${ChainUtil.rpcChainToChainId(options.chainId)} ${
        options.address
      }#${options.tokenId} ${options.funParameter}`,
    );
    // await this.importCollectionLogRepository.create({
    //   category: ImportCollectionLogService.CATEGORY_RPC,
    //   chainId: this._convertChain(options.chainId),
    //   address: options.address,
    //   tokenId: options.tokenId + '',
    //   funName: options.funName,
    //   funParameter: options.funParameter,
    //   rpcEnd: 'blast',
    // });
  }

  async createError(options: {
    category: string;
    content: string;
    parameter: string;
    errorMsg: string;
    errorStack: string;
  }) {
    // await this.importCollectionErrorLogRepository.create({
    //   category: options.category,
    //   chainId: -1,
    //   address: options.content,
    //   tokenId: options.parameter,
    //   errorMsg: options.errorMsg,
    //   errorStack: options.errorStack,
    //   rpcEnd: 'blast',
    // });
    const cloudwatchLog = this._convertCategory(options.category);
    this.logger.log(
      `createError ${cloudwatchLog} ${options.content} ${options.parameter} ${options.errorMsg} ${options.errorStack}`,
    );
  }

  async createRpcError(options: {
    chainId: RpcQueryChain;
    address: string;
    tokenId: string;
    errorMsg: string;
    errorStack: string;
  }) {
    // await this.importCollectionErrorLogRepository.create({
    //   category: ImportCollectionLogService.CATEGORY_RPC,
    //   chainId: this._convertChain(options.chainId),
    //   address: options.address,
    //   tokenId: options.tokenId + '',
    //   errorMsg: options.errorMsg,
    //   errorStack: options.errorStack,
    //   rpcEnd: 'blast',
    // });

    const cloudwatchLog = CLOUDWATCH_LOGS.RPC_SERVICE;
    this.logger.log(
      `createError ${cloudwatchLog} ${ChainUtil.rpcChainToChainId(
        options.chainId,
      )} ${options.address}#${options.tokenId} ${options.errorMsg} ${
        options.errorStack
      }`,
    );
  }

  _convertCategory(category: string) {
    let cloudwatchLog = '';
    if (category === ImportCollectionLogService.CATEGORY_RPC) {
      cloudwatchLog = CLOUDWATCH_LOGS.RPC_SERVICE;
    } else if (category === ImportCollectionLogService.CATEGORY_MORALIS) {
      cloudwatchLog = CLOUDWATCH_LOGS.MORALIS;
    } else if (category === ImportCollectionLogService.CATEGORY_COVALENT) {
      cloudwatchLog = CLOUDWATCH_LOGS.COVALENT;
    } else {
      cloudwatchLog = category;
    }
    return cloudwatchLog;
  }
}
