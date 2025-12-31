import { ConfigurationModule } from './configuration';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '@/app.controller';

describe('AppController', () => {
  let appController: AppController;

  const buildId = 'test-build-id';

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationModule],
      controllers: [AppController],
    }).compile();

    process.env.BUILD_ID = buildId;
    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('should return "build id"', () => {
      expect(appController.version()).toStrictEqual({ build: buildId });
    });
  });
});
