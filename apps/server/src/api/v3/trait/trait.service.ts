import { Injectable, Inject, Logger } from '@nestjs/common';
import { literal, Op, QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  StringTraits,
  NumberTraits,
  AssetTraits,
  Collection,
} from '@/model/entities';
import { GetTraitDTO, GetTraitsListDTO, GetTraitsTFDTO } from './trait.dto';
import {
  GetAssetIdsByTrait,
  TraitQuery,
  ThirdPartyAttribute,
} from './trait.interface';
import { groupBy } from 'ramda';
import { Literal } from 'sequelize/types/utils';
import { ProviderTokens } from '@/model/providers';
import { InjectModel } from '@nestjs/sequelize';
import { Promise as promise } from 'bluebird';
import * as _ from 'lodash';

@Injectable()
export class TraitService {
  protected readonly logger = new Logger(TraitService.name);

  constructor(
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    @InjectModel(AssetTraits)
    private readonly assetTraitsRepository: typeof AssetTraits,

    @InjectModel(Collection)
    private readonly collectionRepository: typeof Collection,
  ) {}

  async updateAssetsTraits(
    assets: {
      assetId: string;
      collectionId: string;
      traits: ThirdPartyAttribute[];
    }[],
  ) {
    this.logger.debug(`update asset traits ${JSON.stringify(assets)}`);
    // [{"value": "Human Pupils", "trait_type": "Eyes"}, {"value": "Human", "trait_type": "DNA"}, {"value": "Light", "trait_type": "Human"}, {"value": "Vibrant Eyeshadow", "trait_type": "Eyes"}, {"value": "Original", "trait_type": "Balaclava"}, {"value": "Gray", "trait_type": "Balaclava Style"}, {"value": "Bandana Tied-Front", "trait_type": "Headwear"}, {"value": "Blue Paisley", "trait_type": "Bandana Front"}, {"value": "Shirt Dress", "trait_type": "Top"}, {"value": "Shirt Dress", "trait_type": "Bottom"}, {"value": "Pink & Plaid", "trait_type": "Shirt Dress"}, {"value": "Pink & Plaid", "trait_type": "Shirt Dress"}, {"value": "Shell-Toe Sneakers", "trait_type": "Footwear"}, {"value": "Black & White", "trait_type": "Shell-Toe Sneakers"}, {"value": "Michelin Markets", "trait_type": "Beasthood"}]
    const assetTraitsCreate: {
      assetId: string;
      collectionId: string;
      traitType: string;
      displayType: string;
      value: string;
    }[] = [];

    // TODO: promise.all to concurrency
    assets.map((asset) => {
      asset.traits.map((trait) => {
        const haveTraitType = Object.keys(trait).some(
          (key) => key === 'trait_type' || key === 'traitType',
        );
        const haveDisplayType = Object.keys(trait).some(
          (key) => key === 'display_type' || key === 'displayType',
        );
        const haveValue = Object.keys(trait).some((key) => key === 'value');
        const traitType = trait.trait_type ? trait.trait_type : '';
        const displayType = trait.display_type ? trait.display_type : '';
        const value = trait.value ? trait.value : '';
        this.logger.debug(
          `assetId: ${asset.assetId} haveTraitType: ${haveTraitType} haveDisplayType: ${haveDisplayType} haveValue: ${haveValue} traitType: ${traitType} displayType: ${displayType} value: ${value}`,
        );
        if (!haveTraitType && !haveDisplayType && !haveValue) {
          Object.entries(trait).map(([key, value]) =>
            assetTraitsCreate.push({
              assetId: asset.assetId,
              collectionId: asset.collectionId,
              traitType: key,
              displayType: '',
              value: value.toString(),
            }),
          );
        }

        assetTraitsCreate.push({
          assetId: asset.assetId,
          collectionId: asset.collectionId,
          traitType,
          displayType,
          value,
        });
      });
    });

    // TODO: promise.all to concurrency, and delete old asset traits need change to update
    try {
      await this.sequelizeInstance.transaction(async (transaction) => {
        await this.assetTraitsRepository.destroy({
          where: {
            assetId: {
              [Op.in]: assets.map((asset) => asset.assetId),
            },
          },
          transaction,
        });

        await this.assetTraitsRepository.bulkCreate(assetTraitsCreate, {
          transaction,
        });
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  async getTraitsByCollection(getCollectionTraitsDto: GetTraitsListDTO) {
    if (
      !getCollectionTraitsDto.collectionId &&
      !getCollectionTraitsDto.collectionSlug
    ) {
      return {
        traits: {},
      };
    }

    let collectionId = getCollectionTraitsDto.collectionId;
    if (!collectionId) {
      collectionId = (
        await this.collectionRepository.findOne({
          attributes: ['id'],
          where: {
            slug: getCollectionTraitsDto.collectionSlug,
          },
        })
      ).id;
    }

    if (!collectionId) {
      return {
        traits: {},
      };
    }

    const strTraitsList = (await this.sequelizeInstance.query(
      `
      SELECT
        "trait_type" AS "traitType",
        "display_type" AS "displayType",
        "rarity_percent" AS "rarityPercent",
        "value", COUNT("value") AS "countValue"
      FROM "asset_traits" AS "AssetTraits"
      WHERE "AssetTraits"."collection_id" = :collectionId
        AND "AssetTraits"."trait_type" != ''
        AND "AssetTraits".display_type NOT IN ('number', 'date')
      GROUP BY "traitType", "displayType", "value", "rarity_percent"
      ORDER BY "traitType" ASC, "countValue" DESC, "AssetTraits"."value" ASC; 
    `,
      {
        replacements: {
          collectionId,
        },
        type: QueryTypes.SELECT,
      },
    )) as any as {
      traitType: string;
      displayType: string;
      rarityPercent: string;
      value: string;
      countValue: string;
    }[];

    const numTraitsList = (await this.sequelizeInstance.query(
      `
      SELECT
        "trait_type" AS "traitType",
        "display_type" AS "displayType",
        MIN(value::NUMERIC(78, 17)),
        MAX(value::NUMERIC(78, 17))
      FROM "asset_traits" AS "AssetTraits"
      WHERE "AssetTraits"."collection_id" = :collectionId
        AND "AssetTraits"."trait_type" != ''
        AND "AssetTraits".display_type IN ('number', 'date')
      GROUP BY "traitType", "displayType"
      ORDER BY "traitType" ASC;
    `,
      {
        replacements: {
          collectionId,
        },
        type: QueryTypes.SELECT,
      },
    )) as any as {
      traitType: string;
      displayType: string;
      min: string;
      max: string;
    }[];

    const strTraitsGroup = groupBy((traits) => {
      return traits.traitType;
    }, strTraitsList);
    const numTraitsGroup = groupBy((traits) => {
      return traits.traitType;
    }, numTraitsList);

    const traits = {};

    // "Accessories": {
    //     "No": 216,
    //     "Beanie Red": 30,
    //     "Collar": 28,
    //     "Crown": 18...
    // },
    // "BG": {
    //     "Plain Blue": 70,
    //     "Plain Green": 70,
    //     "Plain Grey": 70,
    //     "Plain Light Blue": 70,
    //     "Plain Sand": 70...
    // },
    // "Body": {
    //     "Body 1": 268,
    //     "Body 2": 172,
    //     "Special Body": 50,
    //     "Abominable Snowman": 2,
    //     "Big Cat": 2...
    // },
    for (const [key, value] of Object.entries(strTraitsGroup)) {
      traits[key] = {};
      const tmp = value.map((trait) => {
        return {
          [trait['value']]: {
            count: +trait['countValue'],
            rarityPercent: +trait['rarityPercent'],
          },
        };
      });

      const res = {};
      Object.assign(res, ...tmp);
      Object.assign(traits[key], res);
    }

    for (const [key, value] of Object.entries(numTraitsGroup)) {
      traits[key] = {};
      const tmp = value.map((trait) => {
        return {
          ['min']: +trait['min'],
          ['max']: +trait['max'],
        };
      });

      const res = {};
      Object.assign(res, ...tmp);
      Object.assign(traits[key], res);
    }

    return {
      traits,
    };
  }

  async getTraitsByCollectionUserOwned(
    getCollectionTraitsDto: GetTraitsListDTO,
  ) {
    if (
      !getCollectionTraitsDto.collectionId &&
      !getCollectionTraitsDto.collectionSlug
    ) {
      return {
        traits: {},
      };
    }

    let collectionId = getCollectionTraitsDto.collectionId;
    if (!collectionId) {
      collectionId = (
        await this.collectionRepository.findOne({
          attributes: ['id'],
          where: {
            slug: getCollectionTraitsDto.collectionSlug,
          },
        })
      ).id;
    }

    if (!collectionId) {
      return {
        traits: {},
      };
    }

    const strTraitsList = (await this.sequelizeInstance.query(
      `
      SELECT
        "trait_type" AS "traitType",
        "display_type" AS "displayType",
        "value",
        "rarity_percent" AS "rarityPercent",
        COUNT("value") AS "countValue"
      FROM "asset_traits" AS "AssetTraits"
      LEFT JOIN "asset_as_eth_account" AS "AssetAsEthAccount" ON "AssetTraits"."asset_id" = "AssetAsEthAccount"."asset_id"
      WHERE "AssetTraits"."collection_id" = :collectionId
        AND "AssetTraits"."trait_type" != ''
        AND "AssetTraits".display_type NOT IN ('number', 'date')
        AND "AssetAsEthAccount"."owner_address" IN (:ownerAddresses)
        AND "AssetAsEthAccount"."quantity" != '0'
      GROUP BY "traitType", "displayType", "value", "rarity_percent"
      ORDER BY "traitType" ASC, "countValue" DESC, "AssetTraits"."value" ASC; 
    `,
      {
        replacements: {
          collectionId,
          ownerAddresses: getCollectionTraitsDto.ownerAddresses,
        },
        type: QueryTypes.SELECT,
      },
    )) as any as {
      traitType: string;
      displayType: string;
      value: string;
      countValue: string;
    }[];

    const numTraitsList = (await this.sequelizeInstance.query(
      `
      SELECT "trait_type" AS "traitType", "display_type" AS "displayType", MIN(value::NUMERIC(78, 17)), MAX(value::NUMERIC(78, 17))
      FROM "asset_traits" AS "AssetTraits"
      LEFT JOIN "asset_as_eth_account" AS "AssetAsEthAccount" ON "AssetTraits"."asset_id" = "AssetAsEthAccount"."asset_id"
      WHERE "AssetTraits"."collection_id" = :collectionId
        AND "AssetTraits"."trait_type" != ''
        AND "AssetTraits".display_type IN ('number', 'date')
        AND "AssetAsEthAccount"."owner_address" IN (:ownerAddresses)
        AND "AssetAsEthAccount"."quantity" != '0'
      GROUP BY "traitType", "displayType"
      ORDER BY "traitType" ASC;
    `,
      {
        replacements: {
          collectionId,
          ownerAddresses: getCollectionTraitsDto.ownerAddresses,
        },
        type: QueryTypes.SELECT,
      },
    )) as any as {
      traitType: string;
      displayType: string;
      min: string;
      max: string;
    }[];

    const strTraitsGroup = groupBy((traits) => {
      return traits.traitType;
    }, strTraitsList);
    const numTraitsGroup = groupBy((traits) => {
      return traits.traitType;
    }, numTraitsList);

    const traits = {};

    // "Accessories": {
    //     "No": 216,
    //     "Beanie Red": 30,
    //     "Collar": 28,
    //     "Crown": 18...
    // },
    // "BG": {
    //     "Plain Blue": 70,
    //     "Plain Green": 70,
    //     "Plain Grey": 70,
    //     "Plain Light Blue": 70,
    //     "Plain Sand": 70...
    // },
    // "Body": {
    //     "Body 1": 268,
    //     "Body 2": 172,
    //     "Special Body": 50,
    //     "Abominable Snowman": 2,
    //     "Big Cat": 2...
    // },
    for (const [key, value] of Object.entries(strTraitsGroup)) {
      traits[key] = {};
      const tmp = value.map((trait) => {
        return {
          [trait['value']]: {
            count: +trait['countValue'],
            rarityPercent: +trait['rarityPercent'],
          },
        };
      });

      const res = {};
      Object.assign(res, ...tmp);
      Object.assign(traits[key], res);
    }

    for (const [key, value] of Object.entries(numTraitsGroup)) {
      traits[key] = {};
      const tmp = value.map((trait) => {
        return {
          ['min']: +trait['min'],
          ['max']: +trait['max'],
        };
      });

      const res = {};
      Object.assign(res, ...tmp);
      Object.assign(traits[key], res);
    }

    return {
      traits,
    };
  }

  /**
   * Get asset ids by traits
   * @param collectionId id or slug must have one
   * @param collectionSlug
   * @param traits traits
   * @returns asset ids
   */
  async getAssetIdsByTraits(query: GetAssetIdsByTrait): Promise<string[]> {
    let collectionId: string = null;
    if (query.collectionId) {
      collectionId = query.collectionId;
    } else if (query.collectionSlug) {
      collectionId = (
        await this.collectionRepository.findOne({
          attributes: ['id'],
          where: {
            slug: query.collectionSlug,
          },
        })
      ).id;
    }

    const groupedTraits = groupBy((trait) => {
      return trait.traitType;
    }, query.traits);

    const asset2D: string[][] = [];
    const exactMatchTraits: { traitType: string; values: string[] }[] = [];

    await promise.map(
      Object.keys(groupedTraits),
      async (key) => {
        let isRangeQuery = false;
        if (groupedTraits[key].length === 2) {
          const displayType = (await this.sequelizeInstance.query(
            `SELECT DISTINCT(display_type)
            FROM asset_traits
            WHERE collection_id = :collectionId
                AND trait_type = :traitType`,
            {
              replacements: {
                collectionId,
                traitType: groupedTraits[key][0].traitType,
              },
              type: QueryTypes.SELECT,
            },
          )) as any as { display_type: string }[];

          if (
            displayType.length > 0 &&
            displayType[0].display_type === 'number'
          ) {
            isRangeQuery = true;
            const assetIds = (
              (await this.sequelizeInstance.query(
                `
                SELECT asset_id
                FROM asset_traits
                WHERE collection_id = :collectionId
                    AND trait_type = :traitType
                    AND value::NUMERIC(78) >= :minValue
                    AND value::NUMERIC(78) <= :maxValue
                `,
                {
                  replacements: {
                    collectionId,
                    traitType: groupedTraits[key][0].traitType,
                    minValue: groupedTraits[key][0].value,
                    maxValue: groupedTraits[key][1].value,
                  },
                  type: QueryTypes.SELECT,
                },
              )) as any as { asset_id: string }[]
            ).map((asset) => asset.asset_id);
            asset2D.push(assetIds);
          }
        }

        if (!isRangeQuery) {
          exactMatchTraits.push({
            traitType: key,
            values: groupedTraits[key].map((trait) => trait.value),
          });
        }
      },
      { concurrency: 5 },
    );

    if (exactMatchTraits.length > 0) {
      const whereClauses: string[] = [];
      const replacements: any = { collectionId };

      whereClauses.push('"AssetExtra"."collection_id" = :collectionId');

      exactMatchTraits.forEach((traitGroup, index) => {
        const orConditions: string[] = [];
        traitGroup.values.forEach((val, valIndex) => {
          const paramName = `trait_${index}_${valIndex}`;
          // Construct JSONB containment query
          // traits @> '[{"trait_type": "Type", "value": "Value"}]'
          const jsonValue = JSON.stringify([
            { trait_type: traitGroup.traitType, value: val },
          ]);
          orConditions.push(`"Asset"."traits" @> :${paramName}`);
          replacements[paramName] = jsonValue;
        });
        whereClauses.push(`(${orConditions.join(' OR ')})`);
      });

      const sql = `
        SELECT "Asset"."id"
        FROM "asset" AS "Asset"
        INNER JOIN "asset_extra" AS "AssetExtra" ON "Asset"."id" = "AssetExtra"."asset_id"
        WHERE ${whereClauses.join(' AND ')}
      `;

      const result = (await this.sequelizeInstance.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
      })) as any as { id: string }[];

      asset2D.push(result.map((r) => r.id));
    }

    const assetIds = _.intersection(...asset2D);

    return assetIds;
  }

  normalizeTraits(traits: any): ThirdPartyAttribute[] {
    if (traits === null) {
      return [];
    }

    const traitsType = typeof traits;
    let parsedTraits: ThirdPartyAttribute[] = [];

    switch (traitsType) {
      case 'string':
        try {
          parsedTraits = JSON.parse(traits);

          if (Array.isArray(parsedTraits)) {
            // if key no trait_type, add trait_type
            parsedTraits = parsedTraits.map((trait) => {
              const haveTraitType = Object.keys(trait).some(
                (key) => key === 'trait_type' || key === 'traitType',
              );
              const haveDisplayType = Object.keys(trait).some(
                (key) => key === 'display_type' || key === 'displayType',
              );
              const haveValue = Object.keys(trait).some(
                (key) => key === 'value',
              );
              const traitType = trait.trait_type ? trait.trait_type : '';
              const displayType = trait.display_type ? trait.display_type : '';
              const value = trait.value ? trait.value : '';
              if (!haveTraitType && !haveValue) {
                // [{"id": "1499486589898170373","author": "@anfer37288944","signer": "0x6E3eb8BDCfBcC8043B4AB0E05C5cd3E4c7AD3DEC",
                // to this =>
                // [{traitType: 'id', value: '1499486589898170373'}, {traitType: 'author', value: '@anfer37288944'}, {traitType: 'signer', value: '0x6E3eb8BDCfBcC8043B4AB0E05C5cd3E4c7AD3DEC'}]
                return {
                  trait_type: Object.keys(trait)[0],
                  display_type: '',
                  value: Object.values(trait)[0],
                };
              } else {
                return {
                  trait_type: traitType,
                  display_type: displayType,
                  value,
                };
              }
            });
          } else {
            // {"tld": "hodl","type": "SECOND_LEVEL_DOMAIN"}
            // to this =>
            // [{traitType: 'tld', value: 'hodl'}, {traitType: 'type', value: 'SECOND_LEVEL_DOMAIN'}]
            parsedTraits = Object.entries(parsedTraits).map(([key, value]) => ({
              trait_type: key,
              display_type: '',
              value: value as string,
            }));
          }
        } catch (error) {
          parsedTraits = [{ trait_type: '', display_type: '', value: traits }];
        }
        break;
      case 'object':
        if (Array.isArray(traits)) {
          // if key no trait_type, add trait_type
          parsedTraits = traits.map((trait) => {
            const haveTraitType = Object.keys(trait).some(
              (key) => key === 'trait_type' || key === 'traitType',
            );
            const haveDisplayType = Object.keys(trait).some(
              (key) => key === 'display_type' || key === 'displayType',
            );
            const haveValue = Object.keys(trait).some((key) => key === 'value');
            const traitType = trait.trait_type ? trait.trait_type : '';
            const displayType = trait.display_type ? trait.display_type : '';
            const value = trait.value ? trait.value : '';
            if (!haveTraitType && !haveValue) {
              // [{"id": "1499486589898170373","author": "@anfer37288944","signer": "0x6E3eb8BDCfBcC8043B4AB0E05C5cd3E4c7AD3DEC",
              // to this =>
              // [{traitType: 'id', value: '1499486589898170373'}, {traitType: 'author', value: '@anfer37288944'}, {traitType: 'signer', value: '0x6E3eb8BDCfBcC8043B4AB0E05C5cd3E4c7AD3DEC'}]
              return {
                trait_type: Object.keys(trait)[0],
                display_type: '',
                value: Object.values(trait)[0],
              };
            } else {
              return {
                trait_type: traitType,
                display_type: displayType,
                value,
              };
            }
          });
        } else {
          // {"tld": "hodl","type": "SECOND_LEVEL_DOMAIN"}
          // to this =>
          // [{traitType: 'tld', value: 'hodl'}, {traitType: 'type', value: 'SECOND_LEVEL_DOMAIN'}]
          parsedTraits = Object.entries(traits).map(([key, value]) => ({
            trait_type: key,
            display_type: '',
            value: value as any as string,
          }));
        }

        break;
      default:
        parsedTraits = [{ trait_type: '', display_type: '', value: traits }];
        break;
    }

    return parsedTraits;
  }

  // TODO: no longer use
  async getAssetIdsByTraitsTF(query: GetTraitsTFDTO[]) {
    const traitsGroup = groupBy((trait) => {
      return trait.traitType;
    }, query);

    this.logger.debug(traitsGroup);

    if (query.length == 0) return [];

    const unions = [];
    for (const [key, value] of Object.entries(traitsGroup)) {
      let loop = value.length;
      const tmp = [];
      while (loop) {
        if (value[loop - 1].collectionSlug && value[loop - 1].traitType) {
          // reason: https://dba.stackexchange.com/questions/25138/index-max-row-size-error
          tmp.push(
            `SELECT UNNEST(asset_id) AS total FROM traits_tf WHERE collection_Slug = ? AND trait_type = ? AND LEFT(value,500) = ? AND value = ?`,
          );
        } else if (
          !value[loop - 1].collectionSlug &&
          value[loop - 1].traitType
        ) {
          tmp.push(
            `SELECT UNNEST(asset_id) AS total FROM traits_tf WHERE trait_type = ? AND LEFT(value,500) = ? AND value = ?`,
          );
        } else if (
          value[loop - 1].collectionSlug &&
          !value[loop - 1].traitType
        ) {
          tmp.push(
            `SELECT UNNEST(asset_id) AS total FROM traits_tf WHERE collection_Slug = ?`,
          );
        }
        loop--;
      }

      unions.push(`(${tmp.join(' UNION ')})`);
    }
    const subQuery = unions.join(' INTERSECT ');

    this.logger.debug(`subQuery: ${subQuery}`);

    const params = [];
    query.map((q) => {
      q.collectionSlug && params.push(q.collectionSlug);
      q.traitType && params.push(q.traitType);
      q.traitType && params.push(q.value || '');
      // reason: https://dba.stackexchange.com/questions/25138/index-max-row-size-error
      q.traitType && params.push(q.value || '');
    });

    const wholeQuery = `SELECT total FROM (${subQuery}) t `;

    this.logger.debug(`wholeQuery: ${wholeQuery}`);

    const tmp = await this.sequelizeInstance.query(wholeQuery, {
      replacements: params,
      model: AssetTraits,
      mapToModel: true,
      type: QueryTypes.SELECT,
    });

    const res = tmp.map((t) => {
      return 'TODO: total';
    });

    return res;
  }

  // TODO: no longer use
  async getAllTraitsCntTF(query: GetTraitsTFDTO) {
    this.logger.debug(`getAllTraitsCntTF param: ${query}`);

    const ownerCollectionSlugs = query.ownerAddress
      ? await this.sequelizeInstance.query(
          `
        SELECT slug AS slug
        FROM collections
        WHERE slug IN (
          SELECT CONCAT(b.short_name, ':', encode(address, 'escape'))
          FROM
          contract c
          INNER JOIN blockchain b ON b.chain_id = c.chain_id
          WHERE c.id IN (
            SELECT DISTINCT(contract_id) FROM asset WHERE asset.id IN (
              SELECT aaea.asset_id
              FROM asset_as_eth_account aaea
              WHERE eth_account_id = (SELECT id FROM eth_account WHERE address = :ownerAddress)
            )
          )
        );
      `,
          {
            replacements: {
              ownerAddress: query.ownerAddress,
            },
            model: Collection,
            mapToModel: true,
            type: QueryTypes.SELECT,
          },
        )
      : [];

    // ownerSlugs came from DB
    // ownerSlugsQuery came from query
    const ownerSlugs = ownerCollectionSlugs?.map((col) => {
      return col.slug;
    });
    const ownerSlugsQuery = query.ownerAddress ?? [];
    const collectionSlugQuery = query.collectionSlug ?? [];
    const collectionSlug = query.collectionSlug ?? [];

    this.logger.debug(`owner collection_slug: ${ownerSlugs}`);
    this.logger.debug(`collection collection_slug: ${collectionSlugQuery}`);

    let computedSlug = [];
    if (collectionSlugQuery.length != 0 && ownerSlugsQuery.length != 0) {
      computedSlug = ownerSlugs.filter((x) => collectionSlug.includes(x));
    } else if (collectionSlugQuery.length == 0 && ownerSlugsQuery.length != 0) {
      computedSlug = ownerSlugs;
    } else if (collectionSlugQuery.length != 0 && ownerSlugsQuery.length == 0) {
      computedSlug = collectionSlug;
    }

    this.logger.debug(`computedSlug: ${computedSlug}`);

    if (computedSlug.length == 0) return {};

    const stringtype = await this.sequelizeInstance.query(
      `
      SELECT trait_type, display_type, value, array_length(asset_id,1) AS cnt
      FROM traits_tf
      WHERE collection_slug IN (:collectionSlug) AND NOT trait_type = '' AND NOT display_type = ANY('{number,boost_number}')
      `,
      {
        replacements: {
          collectionSlug: computedSlug,
        },
        model: AssetTraits,
        mapToModel: true,
        type: QueryTypes.SELECT,
      },
    );

    this.logger.debug(`stringtype: ${stringtype}`);

    const ret = stringtype.map((row: any) => {
      return {
        traitType: row.traitType,
        displayType: row.displayType || '',
        value: row.value,
        count: row.cnt,
      };
    });

    const stringTypeGroup = groupBy((trait) => {
      return trait.traitType;
    }, ret);

    const s = {};
    for (const [key, value] of Object.entries(stringTypeGroup)) {
      s[key] = {};
      const sd = value.map((trait) => {
        return {
          [trait['value']]: trait['count'],
        };
      });

      const r = {};
      Object.assign(r, ...sd);
      Object.assign(s[key], r);
    }

    const integertype = await this.sequelizeInstance.query(
      `
      SELECT trait_type AS "traitType", MAX(value::decimal) as _max_, MIN(value::decimal) AS _min_
      FROM traits_tf
      WHERE collection_slug IN (:collectionSlug) AND NOT trait_type = '' AND NOT value = '' AND display_type = ANY('{number,boost_number}')
      GROUP BY trait_type
      `,
      {
        replacements: {
          collectionSlug: computedSlug,
        },
        type: QueryTypes.SELECT,
      },
    );

    this.logger.debug(`integertype: ${stringtype}`);

    const ret2 = integertype.map((row: any) => {
      return {
        traitType: row.traitType,
        max: row.max,
        min: row.min,
      };
    });

    const integerTypeGroup = groupBy((trait) => {
      return trait.traitType;
    }, ret2);

    const t = {};
    for (const [key, value] of Object.entries(integerTypeGroup)) {
      this.logger.debug(`${key}: ${value}`);
      t[key] = {};
      const to = value.map((trait) => {
        return {
          ['max']: trait['max'],
          ['min']: trait['min'],
        };
      });

      const ato = {};
      Object.assign(ato, ...to);
      Object.assign(t[key], ato);
    }

    return { ...s, ...t };
  }

  // TODO: no longer use
  async getTrait(query: GetTraitDTO) {
    const [stringTraitRaw, numberTraitRaw] = await Promise.all([
      this.sequelizeInstance.query(
        `
          SELECT
          attr->>'traitType' AS "traitType",
          attr->>'displayType' AS "displayType",
          attr->>'value' AS "value",
          COUNT(attr->>'value') AS "valueCount"
          FROM asset a
          CROSS JOIN jsonb_array_elements(a.traits || a.x_traits) AS attr
          INNER JOIN contract c on c.id = a.contract_id
          WHERE a.chain_id = :chainId
          AND c.address = :contractAddress
          AND NOT (attr->>'displayType')::text = ANY('{number,boost_number}')
          GROUP BY
          attr->>'displayType',
          attr->>'traitType',
          attr->>'value'
        `,
        {
          replacements: {
            chainId: query.chainId,
            ...(query.collectionAddress && {
              contractAddress: query.collectionAddress,
            }),
          },
          model: StringTraits,
          mapToModel: true,
          type: QueryTypes.SELECT,
        },
      ),
      this.sequelizeInstance.query(
        `
          SELECT
          attr->>'traitType' AS "traitType",
          attr->>'displayType' AS "displayType",
          MIN((attr->>'value')::numeric(78,17))::numeric(78,17) AS "valueMin",
          MAX((attr->>'value')::numeric(78,17))::numeric(78,17) AS "valueMax",
          COUNT(attr->>'value') AS "valueCount"
          FROM asset a
          CROSS JOIN jsonb_array_elements(a.traits || a.x_traits) AS attr
          INNER JOIN contract c on c.id = a.contract_id
          WHERE a.chain_id = :chainId
          AND c.address = :contractAddress
          AND (attr->>'displayType')::text = ANY('{number,boost_number}')
          AND (attr ->> 'value') = '' IS NOT TRUE
          GROUP BY
          attr->>'displayType',
          attr->>'traitType'
        `,
        {
          replacements: {
            chainId: query.chainId,
            ...(query.collectionAddress && {
              contractAddress: query.collectionAddress,
            }),
          },
          model: NumberTraits,
          mapToModel: true,
          type: QueryTypes.SELECT,
        },
      ),
    ]);

    const stringTraitGroup = groupBy((trait) => {
      return trait.traitType;
    }, stringTraitRaw);

    // {
    //   "Attribute": [
    //     {
    //       "valueCount": 227,
    //       "traitType": "Attribute",
    //       "displayType": "",
    //       "value": "Horned Rim Glasses"
    //     },
    //     {
    //       "valueCount": 226,
    //       "traitType": "Attribute",
    //       "displayType": "",
    //       "value": "Classic Shades"
    //     }
    //   ],
    //   "Type": [
    //     {
    //       "valueCount": 1650,
    //       "traitType": "Type",
    //       "displayType": "",
    //       "value": "Female"
    //     },
    //     {
    //       "valueCount": 2621,
    //       "traitType": "Type",
    //       "displayType": "",
    //       "value": "Male"
    //     }
    //   ]
    // }
    // =>
    // {
    //   "Attribute": {
    //       "Horned Rim Glasses": 227,
    //       "Classic Shades": 226,

    //   },
    //   "Type": {
    //       "Female": 1650,
    //       "Male": 2621,
    //   },
    // }
    const stringTrait = Object.keys(stringTraitGroup)
      .map((key) => {
        return {
          [`${key}`]: stringTraitGroup[key]
            .map((value) => {
              return { [`${value.value}`]: value.valueCount };
            })
            .reduce((acc, current) => {
              return Object.assign(acc, current);
            }),
        };
      })
      .reduce((acc, current) => {
        return Object.assign(acc, current);
      });

    const numberTraitGroup = groupBy((trait) => {
      return trait.traitType;
    }, numberTraitRaw);

    // {
    //   "MaticPunk ID": [
    //     {
    //       "valueMin": 1,
    //       "valueMax": 9999,
    //       "valueCount": 4315,
    //       "traitType": "MaticPunk ID",
    //       "displayType": "number"
    //     }
    //   ],
    //   "Punk": [
    //     {
    //       "valueMin": 298,
    //       "valueMax": 9751,
    //       "valueCount": 26,
    //       "traitType": "Punk",
    //       "displayType": "number"
    //     }
    //   ],
    // }
    // =>
    // {
    //   "MaticPunk ID": {
    //       "count": 4315,
    //       "min": 1,
    //       "max": 9999
    //   },
    //   "Punk": {
    //       "count": 26,
    //       "min": 298,
    //       "max": 9751
    //   }
    // }
    const numberTrait = Object.keys(numberTraitGroup)
      .map((key) => {
        return {
          [`${key}`]: numberTraitGroup[key]
            .map((value) => {
              return {
                count: value.valueCount,
                min: value.valueMin,
                max: value.valueMax,
              };
            })
            .reduce((acc, current) => {
              return Object.assign(acc, current);
            }),
        };
      })
      .reduce((acc, current) => {
        return Object.assign(acc, current);
      });

    return { stringTrait, numberTrait };
  }

  // TODO: no longer use
  getParameter(query: TraitQuery): Record<string, string[]> {
    if (!query) return {};

    let stringTraitLength = 0;
    const stringParamArray = query.stringTraits
      ? Object.keys(query.stringTraits).map((key) => {
          const param = {
            [`stringTraitKey${stringTraitLength}`]: key,
            [`stringTraitValue${stringTraitLength}`]: query.stringTraits[key],
          };
          stringTraitLength++;

          return param;
        })
      : [];

    let numberTraitLength = 0;
    const numberParamArray = query.numberTraits
      ? Object.keys(query.numberTraits).map((key) => {
          const [min, max] = query.numberTraits[key];
          const param = {
            [`numberTraitKey${numberTraitLength}`]: key,
            [`numberTraitMin${numberTraitLength}`]: min,
            [`numberTraitMax${numberTraitLength}`]: max,
          };
          numberTraitLength++;

          return param;
        })
      : [];

    // Array to Object
    // [
    //   {
    //     "stringTraitKey0": "Attribute",
    //     "stringTraitValue0": [
    //       "Purple Hair",
    //       "Eye Patch"
    //     ]
    //   },
    //   {
    //     "stringTraitKey1": "Type",
    //     "stringTraitValue1": "Male"
    //   }
    // ]
    // =>
    // {
    //   stringTraitKey0: 'Attribute',
    //   stringTraitValue0: [ 'Purple Hair', 'Eye Patch' ],
    //   stringTraitKey1: 'Type',
    //   stringTraitValue1: 'Male'
    // }

    const param: Record<string, string[]> = Object.assign(
      {},
      ...stringParamArray,
      ...numberParamArray,
    );

    return param;
  }

  // TODO: no longer use
  getTraitLiteral(query: TraitQuery): Literal {
    if (!query) return literal('');

    let stringTraitLength = 0;
    // select id from string_traits
    // where traitType = :stringTraitKey0
    // and value in (:stringTraitValue0)
    // intersect
    // select id from string_traits
    // where traitType = :stringTraitKey1
    const stringTrait = query.stringTraits
      ? Object.keys(query.stringTraits)
          .map(() => {
            const str = `
            select id from string_traits
            where traitType = :stringTraitKey${stringTraitLength}
            and value in (:stringTraitValue${stringTraitLength})`;
            stringTraitLength++;
            return str;
          })
          .join(' intersect')
      : '';

    let numberTraitLength = 0;
    // select id from number_traits
    // where traitType = :numberTraitKey0
    // and value between :numberTraitMin0 and :numberTraitMax0
    const numberTraits = query.numberTraits
      ? Object.keys(query.numberTraits)
          .map(() => {
            const str = `
            select id from number_traits
            where traitType = :numberTraitKey${numberTraitLength}
            and value between :numberTraitMin${numberTraitLength} and :numberTraitMax${numberTraitLength}`;
            numberTraitLength++;
            return str;
          })
          .join(' intersect')
      : '';

    const traits = [stringTrait, numberTraits]
      .filter((e) => {
        return e !== '';
      })
      .join(' intersect');

    return literal(`
      (
        with asset_trait as (
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
        ${traits}
      )
      `);
  }
}
