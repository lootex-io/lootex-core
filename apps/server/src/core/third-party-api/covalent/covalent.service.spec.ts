// import { Test, TestingModule } from '@nestjs/testing';
// import { HttpModule } from '@nestjs/axios';
// import { ConfigurationModule } from '@/configuration/configuration.module';
// import { Chain } from '@/common/libs/libs.service';
// import { ConfigurationService } from '@/configuration';
// import { CovalentService } from '@/core/third-party-api/covalent/covalent.service';
// import {
//   Env,
//   MoralisQueryFormat,
// } from '@/core/third-party-api/moralis/constants';
// import { Nft } from '@/core/third-party-api/gateway/gateway.interface';
// import { CWLogService } from '@/core/third-party-api/cloudwatch-log/cw-log.service';
// import { Logger } from '@nestjs/common';
// import { CLOUDWATCH_LOGS } from '@/common/utils';
// import { CacheModule } from '@/common/cache';
// import * as redisStore from 'cache-manager-ioredis';
//
// describe('CovalentService', () => {
//   let service: CovalentService;
//
//   beforeAll(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       imports: [
//         HttpModule,
//         ConfigurationModule,
//         CacheModule.forRootAsync({
//           useFactory: () => ({
//             store: redisStore,
//             host: 'localhost',
//             port: '6379',
//             password: '',
//           }),
//         }),
//       ],
//       providers: [
//         CovalentService,
//         {
//           provide: CWLogService,
//           useValue: {
//             log(
//               logger: Logger,
//               logType: string,
//               event: string,
//               args: any[] = [],
//             ) {
//               const message = `${
//                 CLOUDWATCH_LOGS.CLOUDWATCH_LOGS
//               } ${logType} ${event} ${args.join(' ')}`;
//               console.log(message);
//             },
//           },
//         },
//         {
//           provide: ConfigurationService,
//           useValue: {
//             get(key: string) {
//               if (key === Env.COVALENT_URL) {
//                 return 'https://api.covalenthq.com';
//               } else if (key === Env.COVALENT_API_KEY) {
//                 return 'cqt_rQvyyGWw9QVM394M7vqwvgb7469h';
//               } else if (key === Env.COVALENT_API_BACKUP_KEY) {
//                 return 'cqt_wFC3dgbxfpGXpdtGYDqcHbcXrBPj';
//               }
//               return key;
//             },
//           },
//         },
//       ],
//     }).compile();
//     service = module.get<CovalentService>(CovalentService);
//   });
//
//   it('should be defined', () => {
//     expect(service).toBeDefined();
//   });
//
//   it('test : get nfts from contract-address', async () => {
//     const contract = '0xcf995797cb2e65cc290e084f0127b1e8ebc692c8';
//     const res = await service.getNftsByContract(
//       Chain.MANTLE,
//       contract,
//       2,
//       '',
//       MoralisQueryFormat.DECIMAL,
//       (page: number, nfts: Nft[]) => {
//         console.log(`onPageFetched nfts ${JSON.stringify(nfts)}`);
//       },
//     );
//
//     // expect(res).toEqual(true);
//   });
//
//   it('test : auto switch api key', async () => {
//     const res = await service.getNftsByOwner(
//       Chain.MANTLE,
//       '0xe2c8029957d65242a651177667a7F45B0b83FB92',
//       10,
//       '',
//       (page: number, nfts: Nft[]) => {
//         console.log(`onPageFetched nfts ${JSON.stringify(nfts)}`);
//       },
//     );
//
//     // expect(res).toEqual(true);
//   }, 30000);
// });
