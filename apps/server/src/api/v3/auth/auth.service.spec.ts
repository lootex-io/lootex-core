import { randomBytes } from 'crypto';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { ConfigurationModule, ConfigurationService } from '@/configuration';
import { entities } from '@/model/entities';
import { providers } from '@/model/providers';
import { CacheModule } from '@/common/cache';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { BlockchainService, EthAddress } from '@/external/blockchain';
import { AuthSupportedChainFamily } from './auth.interface';
import { ethers } from 'ethers';

JwtModule.register({}),
  HttpModule.register({}),
  SequelizeModule.forFeature(entities),
      ],
providers: [
  AuthService,
  BlockchainService,
  ConfigurationService,
  ...providers,
],
    }).compile();

service = module.get<AuthService>(AuthService);

const oneTimePrivateKey = `0x${randomBytes(32).toString('hex')}`;
testingWallet = new ethers.Wallet(oneTimePrivateKey);
testingEthAddr = (await testingWallet.getAddress()) as EthAddress;
  });

it('should be a defined service instance', () => {
  expect(service).toBeDefined();
});

it('should return a randomised number', () => {
  expect(typeof service.getSecureRandomNumber() === 'number').toBeTruthy();
});

it(`should generate different challenge with same ETH address`, () => {
  expect(
    service.getOneTimeChallenge(
      testingEthAddr,
      'ETH' as AuthSupportedChainFamily,
    ) ===
    service.getOneTimeChallenge(
      testingEthAddr,
      'ETH' as AuthSupportedChainFamily,
    ),
  ).toBeFalsy();
});

it('should verify the challenge correctly (ETH, EOA)', async () => {
  const challenge = await service.getOneTimeChallenge(
    testingEthAddr,
    'ETH' as AuthSupportedChainFamily,
  );
  const signature = await testingWallet.signMessage(challenge);
  expect(
    await service.verifyOneTimeChallengeEth(testingEthAddr, signature),
  ).toBeTruthy();
});
});
