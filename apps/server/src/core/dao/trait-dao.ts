import { Injectable, Logger } from '@nestjs/common';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AssetTraits, Collection } from '@/model/entities';

import { InjectModel } from '@nestjs/sequelize';
import { ThirdPartyAttribute } from '@/api/v3/trait/trait.interface';

@Injectable()
export class TraitDao {
  protected readonly logger = new Logger(TraitDao.name);

  constructor(
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
        try {
          if (Array.isArray(traits)) {
            // if key no trait_type, add trait_type
            parsedTraits = traits.map((trait) => {
              if (!trait) {
                return { trait_type: '', display_type: '', value: '' };
              }
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
            parsedTraits = Object.entries(traits).map(([key, value]) => ({
              trait_type: key,
              display_type: '',
              value: value as any as string,
            }));
          }
        } catch (error) {
          parsedTraits = [{ trait_type: '', display_type: '', value: traits }];
        }

        break;
      default:
        parsedTraits = [{ trait_type: '', display_type: '', value: traits }];
        break;
    }

    return parsedTraits;
  }

  async getAssetTraitCount(assetId) {
    return this.assetTraitsRepository.count({
      where: {
        assetId,
      },
    });
  }
}
