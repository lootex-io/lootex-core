import { Test, TestingModule } from '@nestjs/testing';
import { sequelizeProvider } from '@/model/providers';
import { ConfigurationModule } from '@/configuration';
import { TraitController } from './trait.controller';
import { TraitService } from './trait.service';
import { StringTraits, NumberTraits, entities } from '@/model/entities';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { SequelizeModule } from '@nestjs/sequelize';

describe('TraitController', () => {
  let controller: TraitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigurationModule,
        TestSequelizeModule.forRootAsync([StringTraits, NumberTraits]),
        SequelizeModule.forFeature(entities),
      ],
      controllers: [TraitController],
      providers: [TraitService, sequelizeProvider],
    }).compile();

    controller = module.get<TraitController>(TraitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
