/**
 * Blockchain Module
 * @module
 */
import { DynamicModule, Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

@Module({})
export class BlockchainModule {
  static forRootAsync(): DynamicModule {
    return {
      module: BlockchainModule,
      providers: [BlockchainService],
      exports: [BlockchainService],
    };
  }
}
