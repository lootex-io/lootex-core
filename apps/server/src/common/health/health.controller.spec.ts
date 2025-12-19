import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      providers: [
        {
          provide: 'DB_CHECK_ENABLED',
          useValue: true,
        },
        {
          provide: 'REDIS_CHECK_ENABLED',
          useValue: true,
        },
        {
          provide: 'REDIS_HOST',
          useValue: 'localhost',
        },
        {
          provide: 'REDIS_PORT',
          useValue: 6379,
        },
        {
          provide: 'REDIS_PASSWORD',
          useValue: 'password',
        },
      ],
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
