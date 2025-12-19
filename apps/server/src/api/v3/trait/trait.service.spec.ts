import { Test, TestingModule } from '@nestjs/testing';
import { sequelizeProvider } from '@/model/providers';
import { ConfigurationModule } from '@/configuration';
import { literal } from 'sequelize';
import { TraitService } from './trait.service';
import { entities } from '@/model/entities';
import { TraitQuery } from '@/api/v3/trait/trait.interface';
import { Asset, Contract, Blockchain } from '@/model/entities';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { seeder } from '@/../test/utils/seeder';
import { ChainId } from '@/common/utils/types';
import { SequelizeModule } from '@nestjs/sequelize';

describe('TraitService', () => {
  let service: TraitService;

  beforeEach(async () => {
    async function cleanup() {
      await Asset.destroy({ truncate: true, cascade: true });
      await Contract.destroy({ truncate: true, cascade: true });
      await Blockchain.destroy({ truncate: true, cascade: true });
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigurationModule,
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
      providers: [TraitService, sequelizeProvider],
    }).compile();

    service = module.get<TraitService>(TraitService);

    await cleanup();

    await seeder.down({ to: 0 as const });
    await seeder.up();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTrait', () => {
    const contract1 = {
      address: '0x4d09927377b48151692f64f0ab62ddc7d53d4d9d',
      name: 'PaperPlanesToTheMoon',
      slug: 'PaperPlanesToTheMoon',
      symbol: 'PPM',
      schemaName: 'ERC721',
      allowedCurrency: ['wrapped'],
      blockchainId: null,
      chainId: 137,
    };

    const asset1Metadata1 = {
      value: 'Epic Pink',
      traitType: 'Background',
      displayType: '',
    };
    const asset1Metadata2 = {
      value: 'Peach',
      traitType: 'Core',
      displayType: '',
    };
    const asset1Metadata3 = {
      value: 'Peach',
      traitType: 'LeftWing',
      displayType: '',
    };
    const asset1Metadata4 = {
      value: 'Plane',
      traitType: 'Plane',
      displayType: '',
    };
    const asset1Metadata5 = {
      value: 1,
      traitType: 'ID',
      displayType: 'number',
    };

    const asset1 = {
      tokenId: 1,
      name: 'Paper Plane 1',
      traits: [
        asset1Metadata1,
        asset1Metadata2,
        asset1Metadata3,
        asset1Metadata4,
        asset1Metadata5,
      ],
      contractId: null,
      xtrait: [],
      chainId: contract1.chainId,
    };

    const asset2Metadata1 = {
      value: 'Baby Blue',
      traitType: 'Background',
      displayType: '',
    };
    const asset2Metadata2 = {
      value: 'Milk White',
      traitType: 'Core',
      displayType: '',
    };
    const asset2Metadata3 = {
      value: 'Forrest Green',
      traitType: 'Tail',
      displayType: '',
    };
    const asset2Metadata4 = {
      value: 'Plane',
      traitType: 'Plane',
      displayType: '',
    };
    const asset2Metadata5 = {
      value: 2,
      traitType: 'ID',
      displayType: 'number',
    };
    const asset2 = {
      tokenId: 2,
      name: 'Paper Plane 2',
      traits: [
        asset2Metadata1,
        asset2Metadata2,
        asset2Metadata3,
        asset2Metadata4,
        asset2Metadata5,
      ],
      contractId: null,
      xtrait: [],
      chainId: contract1.chainId,
    };

    it('should get string object', async () => {
      const blockchain = await Blockchain.findOne({
        where: { chainId: contract1.chainId },
      });

      const contract = await Contract.create({
        ...contract1,
        blockchainId: blockchain.id,
      });

      await Asset.create({
        ...asset1,
        contractId: contract.id,
      });
      await Asset.create({
        ...asset2,
        contractId: contract.id,
      });

      const traits = await service.getTrait({
        chainId: String(contract1.chainId) as ChainId,
        collectionAddress: contract1.address,
      });

      expect(traits).toMatchObject({
        numberTrait: {
          ID: {
            count: 2,
            max: 2,
            min: 1,
          },
        },
        stringTrait: {
          Background: {
            [asset1Metadata1.value]: 1,
            [asset2Metadata1.value]: 1,
          },
          Core: { [asset1Metadata2.value]: 1, [asset1Metadata2.value]: 1 },
          Plane: {
            [asset1Metadata4.value]: 2,
          },
          Tail: {
            [asset2Metadata3.value]: 1,
          },
        },
      });
    });
  });

  describe('getParameter', () => {
    const stringType1 = 'Attribute';
    const stringType2 = 'Type';
    const stringValue1 = ['Purple Hair', 'Eye Patch'];
    const stringValue2 = ['Male'];

    const numberType1 = 'Number';
    const numberType2 = 'Rank';
    const numberValue1 = [1, 500];
    const numberValue2 = [100, 500];
    const [val1Min, val1Max] = numberValue1;
    const [val2Min, val2Max] = numberValue2;

    it('should get string object', () => {
      const traits: TraitQuery = {
        stringTraits: {
          [stringType1]: stringValue1,
          [stringType2]: stringValue2,
        },
      };

      const result = service.getParameter(traits);
      expect(result).toMatchObject({
        stringTraitKey0: stringType1,
        stringTraitValue0: stringValue1,
        stringTraitKey1: stringType2,
        stringTraitValue1: stringValue2,
      });
    });

    it('should get number object', () => {
      const traits: TraitQuery = {
        numberTraits: {
          [numberType1]: numberValue1,
          [numberType2]: numberValue2,
        },
      };

      const result = service.getParameter(traits);
      expect(result).toMatchObject({
        numberTraitKey0: numberType1,
        numberTraitKey1: numberType2,
        numberTraitMin0: val1Min,
        numberTraitMax0: val1Max,
        numberTraitMin1: val2Min,
        numberTraitMax1: val2Max,
      });
    });

    it('should get string and number object', () => {
      const traits: TraitQuery = {
        stringTraits: {
          [stringType1]: stringValue1,
          [stringType2]: stringValue2,
        },
        numberTraits: {
          [numberType1]: numberValue1,
          [numberType2]: numberValue2,
        },
      };

      const result = service.getParameter(traits);
      expect(result).toMatchObject({
        stringTraitKey0: stringType1,
        stringTraitValue0: stringValue1,
        stringTraitKey1: stringType2,
        stringTraitValue1: stringValue2,
        numberTraitKey0: numberType1,
        numberTraitKey1: numberType2,
        numberTraitMin0: val1Min,
        numberTraitMax0: val1Max,
        numberTraitMin1: val2Min,
        numberTraitMax1: val2Max,
      });
    });
  });

  describe('getTraitLiteral', () => {
    const stringType1 = 'Attribute';
    const stringType2 = 'Type';
    const stringValue1 = ['Purple Hair', 'Eye Patch'];
    const stringValue2 = ['Male'];

    const numberType1 = 'Number';
    const numberType2 = 'Rank';
    const numberValue1 = [1, 500];
    const numberValue2 = [100, 500];

    const traitSQL = `with asset_trait as (
          select a.id,
          attr->>'traitType' as traitType,
          attr->>'displayType' as displayType,
          attr->>'value' as value
          from asset a
          cross join jsonb_array_elements(traits) as attr
          join contract c on a.contract_id = c.id
          where c.address = :contractAddress
          and c.chain_id = :chainId
        ), number_traits as (
          select id, traitType, displayType, value::numeric
          from asset_trait
          where displayType = ANY('{number,boost_number}')
        ), string_traits as (
          select * from asset_trait
          where NOT displayType = ANY('{number,boost_number}')
        )
        `;

    it('should get string SQL', () => {
      const traits: TraitQuery = {
        stringTraits: {
          [stringType1]: stringValue1,
          [stringType2]: stringValue2,
        },
      };

      const result = service.getTraitLiteral(traits);

      expect(result).toStrictEqual(
        literal(`
      (
        ${traitSQL}
            select id from string_traits
            where traitType = :stringTraitKey0
            and value in (:stringTraitValue0) intersect
            select id from string_traits
            where traitType = :stringTraitKey1
            and value in (:stringTraitValue1)
      )
      `),
      );
    });

    it('should get number SQL', () => {
      const traits: TraitQuery = {
        numberTraits: {
          [numberType1]: numberValue1,
          [numberType2]: numberValue2,
        },
      };

      const result = service.getTraitLiteral(traits);

      expect(result).toStrictEqual(
        literal(`
      (
        ${traitSQL}
            select id from number_traits
            where traitType = :numberTraitKey0
            and value between :numberTraitMin0 and :numberTraitMax0 intersect
            select id from number_traits
            where traitType = :numberTraitKey1
            and value between :numberTraitMin1 and :numberTraitMax1
      )
      `),
      );
    });

    it('should get string and number SQL', () => {
      const traits: TraitQuery = {
        stringTraits: {
          [stringType1]: stringValue1,
          [stringType2]: stringValue2,
        },
        numberTraits: {
          [numberType1]: numberValue1,
          [numberType2]: numberValue2,
        },
      };

      const result = service.getTraitLiteral(traits);

      expect(result).toStrictEqual(
        literal(`
      (
        ${traitSQL}
            select id from string_traits
            where traitType = :stringTraitKey0
            and value in (:stringTraitValue0) intersect
            select id from string_traits
            where traitType = :stringTraitKey1
            and value in (:stringTraitValue1) intersect
            select id from number_traits
            where traitType = :numberTraitKey0
            and value between :numberTraitMin0 and :numberTraitMax0 intersect
            select id from number_traits
            where traitType = :numberTraitKey1
            and value between :numberTraitMin1 and :numberTraitMax1
      )
      `),
      );
    });
  });
});
