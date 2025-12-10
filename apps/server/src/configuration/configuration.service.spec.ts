import { Test, TestingModule } from '@nestjs/testing';
import { ConfigurationService } from '@/configuration/configuration.service';
import { ConfigService } from '@nestjs/config';

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfigurationService, ConfigService],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
