import {
  Inject,
  Injectable,
} from '@nestjs/common';
import { GetLaunchpadListDTO } from './studio.dto';
import { LaunchpadContracts } from './studio.interface';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';

@Injectable()
export class StudioService {
  constructor(
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,
  ) { }

  async getLaunchpadContracts(
    type: 'current' | 'past',
    getLaunchpadListDTO: GetLaunchpadListDTO,
  ) {
    let whereClause = '';
    if (type === 'current') {
      whereClause = `(status = 'Published' OR status = 'Sale')`;
    } else if (type === 'past') {
      whereClause = `(status = 'SaleEnd')`;
    }

    const [launchpadStudioContracts, count] = await Promise.all([
      (await this.sequelizeInstance.query(
        `
        WITH studio_contract_published_and_sale AS (
          SELECT id, name, chain_id, status, drop_urls, address, created_at, is_launchpad_hidden, launchpad_rank, schema_name
          FROM studio_contract
          WHERE ${whereClause}
            AND is_launchpad_hidden = false
            ${getLaunchpadListDTO.chainId ? 'AND chain_id = :chainId' : ''}
        ),
        studio_public_drop AS (
            SELECT DISTINCT ON (studio_contract_id) id, studio_contract_id, price, amount, currency_id, token_id
            FROM studio_contract_drop
            ORDER BY studio_contract_id, start_time DESC, amount DESC
        ),
        studio_first_drop AS (
            SELECT DISTINCT ON (studio_contract_id) id, studio_contract_id, start_time
            FROM studio_contract_drop
            ORDER BY studio_contract_id, start_time ASC
        )

        select
          studio_contract_published_and_sale.id,
          studio_contract_published_and_sale.name,
          studio_contract_published_and_sale.chain_id as "chainId",
          studio_contract_published_and_sale.status,
          studio_contract_published_and_sale.drop_urls as "dropUrls",
          studio_contract_published_and_sale.address,
          studio_contract_published_and_sale.schema_name as "schemaName",
          studio_first_drop.start_time as "startTime",
          studio_public_drop.price,
          studio_public_drop.amount as "maxSupply",
          studio_public_drop.token_id as "tokenId",
          encode(currency.address, 'escape') as "currencyAddress",
          currency.symbol as "currencySymbol",
          contract.total_supply as "totalSupply",
          collections.id as "collectionId",
          collections.contract_address as "collectionContractAddress",
          collections.banner_image_url as "collectionBannerImageUrl",
          collections.logo_image_url as "collectionLogoImageUrl",
          collections.name as "collectionName",
          collections.slug as "collectionSlug",
          collections.description as "collectionDescription",
          collections.is_verified as "collectionIsVerified",
          collections.chain_short_name as "collectionChainShortName",
          collections.is_minting as "collectionIsMinting",
          collections.is_drop as "collectionIsDrop"
        from studio_contract_published_and_sale
        left join studio_public_drop on studio_public_drop.studio_contract_id = studio_contract_published_and_sale.id
        left join studio_first_drop on studio_first_drop.studio_contract_id = studio_contract_published_and_sale.id
        left join contract on studio_contract_published_and_sale.address = encode(contract.address, 'escape')
          and studio_contract_published_and_sale.chain_id = contract.chain_id
        inner join collections on studio_contract_published_and_sale.address = collections.contract_address
          and studio_contract_published_and_sale.chain_id = collections.chain_id
          and collections.is_drop = true
          ${typeof getLaunchpadListDTO.isVerified === 'boolean' ? `AND collections.is_verified = ${getLaunchpadListDTO.isVerified}` : ''}
        inner join currency on studio_public_drop.currency_id = currency.id
        ORDER BY
          launchpad_rank NULLS LAST,
          ${
        // 如果沒有指定排序，預設使用開始時間
        !getLaunchpadListDTO.sortBy ||
          getLaunchpadListDTO.sortBy.length === 0
          ? 'studio_first_drop.start_time ASC'
          : getLaunchpadListDTO.sortBy
            .map((sortBy, index) => {
              return `${sortBy} ${getLaunchpadListDTO.sortOrder[index]}`;
            })
            .join(',')
        }
        LIMIT :limit
        OFFSET :offset
      `,
        {
          replacements: {
            limit: getLaunchpadListDTO.limit,
            offset: getLaunchpadListDTO.limit * (getLaunchpadListDTO.page - 1),
            chainId: getLaunchpadListDTO.chainId,
          },
          type: QueryTypes.SELECT,
        },
      )) as unknown as LaunchpadContracts[],
      (await this.sequelizeInstance.query(
        `
        WITH studio_contract_published_and_sale AS (
          SELECT id, name, chain_id, status, drop_urls, address, created_at, is_launchpad_hidden, launchpad_rank
          FROM studio_contract
          WHERE (status = 'Published' OR status = 'Sale')
            AND is_launchpad_hidden = false
            ${getLaunchpadListDTO.chainId ? 'AND chain_id = :chainId' : ''}
        )

        select count(*)
        from studio_contract_published_and_sale
        inner join collections on studio_contract_published_and_sale.address = collections.contract_address
          and studio_contract_published_and_sale.chain_id = collections.chain_id
          and collections.is_drop = true
          ${typeof getLaunchpadListDTO.isVerified === 'boolean' ? `AND collections.is_verified = ${getLaunchpadListDTO.isVerified}` : ''}
        `,
        {
          replacements: {
            chainId: getLaunchpadListDTO.chainId,
          },
          type: QueryTypes.SELECT,
        },
      )) as unknown as { count: number }[],
    ]);

    return {
      rows: launchpadStudioContracts,
      count: count[0].count,
    };
  }
}
