import { ConfigurationService } from '@/configuration';
import { CacheService } from '@/common/cache';
import {
  AssetExtra,
  Blockchain,
  Collection,
  Contract,
  SeaportOrder,
  SeaportOrderAsset,
  Wallet,
} from '@/model/entities';
import { ChainId } from '@/common/utils/types';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ContractType } from '@/core/third-party-api/gateway/constants';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { CONTRACT_ADDRESS_UNKNOWN } from '@/common/utils';
import { LibsDao } from '@/core/dao/libs-dao';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import { ethers } from 'ethers';
import { Category } from '@/api/v3/order/order.interface';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import { Op, QueryTypes } from 'sequelize';

@Injectable()
export class CollectionDao {
  protected readonly logger = new Logger(CollectionDao.name);

  constructor(
    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,
    @InjectModel(Collection)
    private collectionRepository: typeof Collection,
    @InjectModel(Contract)
    private contractRepository: typeof Contract,
    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,
    @InjectModel(Wallet)
    private walletRepository: typeof Wallet,
    @InjectModel(SeaportOrder)
    private seaportOrderRepository: typeof SeaportOrder,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private gatewayService: GatewayService,
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,
    private readonly libsDao: LibsDao,
  ) {
    // setTimeout(async () => {
    //   const c = await this.findOrCreateCollection({
    //     chainShortName: 'eth',
    //     contractAddress: '0x3fe1a4c1481c8351e91b64d5c398b159de07cbc5',
    //   });
    //   console.log('test: ', JSON.stringify(c));
    // }, 5000);
    // this.updateCollectionTotalByAssets(
    //   ['f1335fa4-146b-467f-b769-c8bd5cb6e9af'],
    //   Category.OFFER,
    // );
    // this.getCollectionOrderStatistic(
    //   '0x217ec1ac929a17481446a76ff9b95b9a64f298cf',
    //   8453 + '',
    // ).then((res) => console.log('res ', res));
  }

  @Cacheable({ seconds: 5 * 60 })
  async findCacheCollection(chainId: ChainId, contractAddress: string) {
    const blockchain = await this.blockchainRepository.findOne({
      where: {
        chainId: chainId,
      },
    });
    if (!blockchain) {
      this.logger.warn(`blockchain chainId=${chainId} not supported`);
      return null;
    }
    return this.findOrCreateCollection({
      contractAddress: contractAddress.toLowerCase(),
      chainShortName: blockchain.shortName,
    });
  }

  /**
   * return collection or create. auto create contract if not exist.
   * @param values
   */
  async findOrCreateCollection(values: {
    chainShortName: string;
    contractAddress: string;
  }): Promise<Collection> {
    try {
      values.contractAddress = values.contractAddress.toLowerCase();
      const existCollection = await this.collectionRepository.findOne({
        where: {
          chainShortName: values.chainShortName,
          contractAddress: values.contractAddress,
        },
      });

      if (existCollection) {
        return existCollection;
      }

      const chainId = await this.libsDao.findChainIdByChainShortName(
        values.chainShortName,
      );

      const contract = await this.findOrCreateContract(
        chainId as ChainId,
        values.contractAddress,
      );

      const contractOwnerAddress = await this.getContractOwner(
        chainId as ChainId,
        values.contractAddress,
      );

      const ownerAccountId =
        await this.getContractOwnerAccountId(contractOwnerAddress);

      const [collection, _] = await this.collectionRepository.findOrCreate({
        where: {
          chainShortName: values.chainShortName,
          contractAddress: values.contractAddress,
        },
        defaults: {
          chainShortName: values.chainShortName,
          contractAddress: values.contractAddress,
          name: contract?.name
            ? contract.name
            : `${values.chainShortName}:${values.contractAddress}`,
          slug: `${values.chainShortName}:${values.contractAddress}`,
          ownerAccountId,
          ownerAddress: contractOwnerAddress,
          chainId,
          creatorFee: 0.5,
        },
      });

      this.logger.debug(
        `create collection get contract owner address = ${contractOwnerAddress}`,
      );

      return collection;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  /**
   *
   * @param chainId
   * @param contractAddress
   * @param contractInfo 如果不存在，通过rpc获取contractInfo
   * @param forceUpdate 如果contract存在，是否需要強制更新contract信息。（當contractInfo和forceUpdate都存在時起作用）
   */
  async findOrCreateContract(
    chainId: ChainId,
    contractAddress: string,
    contractInfo?: {
      name: string;
      symbol: string;
      contractType: string;
    },
    forceUpdate = false,
  ): Promise<Contract> {
    try {
      contractAddress = contractAddress.toLowerCase();
      const dbContract = await this.contractRepository.findOne({
        where: {
          address: contractAddress,
          chainId,
        },
      });

      if (dbContract) {
        if (forceUpdate && contractInfo) {
          dbContract.set('name', contractInfo.name);
          dbContract.set('symbol', contractInfo.symbol);
          dbContract.set('schemaName', contractInfo.contractType);
          await dbContract.save();
        }
        return dbContract;
      }
      if (!contractInfo) {
        contractInfo = (
          await this.gatewayService.getContractInfoOnChain(
            chainId,
            contractAddress,
          )
        ).shift();
      }

      if (contractInfo.contractType == ContractType.UNKNOWN) {
        throw new Error(`contract: ${contractAddress} is not ERC721/ERC1155`);
      }

      const blockchain = await this.blockchainRepository.findOne({
        where: {
          chainId: chainId,
        },
      });

      if (!blockchain) {
        throw new Error(`blockchain find by blockchainId ${chainId} not found`);
      }

      const totalSupply =
        (await this.gatewayService.getContractTotalSupply(
          chainId,
          contractAddress,
        )) || 0;

      const contract = await this.contractRepository.create({
        name: contractInfo.name,
        symbol: contractInfo.symbol,
        address: contractAddress,
        chainId: chainId,
        schemaName: contractInfo.contractType,
        blockchainId: blockchain.id,
        totalSupply,
      });

      return contract;
    } catch (err) {
      this.logger.error(err);
      return Promise.reject(err);
    }
  }

  @Cacheable({ seconds: 3600 })
  async getContractOwner(
    chainId: ChainId,
    contractAddress: string,
    option?: { rpcEnd: RpcEnd },
  ) {
    option = { rpcEnd: RpcEnd.default, ...option };

    const cOwner = (
      await this.gatewayService.getContractOwnerOnChain(
        chainId,
        [contractAddress],
        option.rpcEnd,
      )
    ).shift();
    const ownerAddress =
      cOwner.ownerAddress?.toLowerCase() || CONTRACT_ADDRESS_UNKNOWN;
    return ownerAddress;
  }

  async getContractOwnerAccountId(
    ownerAddress: string,
  ): Promise<string | null> {
    const defaultWallet = await this.walletRepository.findOne({
      where: {
        address: '0x0000000000000000000000000000000000000000',
      },
    });

    if (!defaultWallet) {
      throw new Error('collection master wallet not found');
    }

    const wallet = await this.walletRepository.findOne({
      where: {
        address: ownerAddress,
      },
    });

    return wallet ? wallet.accountId : defaultWallet.accountId;
  }

  /**
   * @async
   * @function getCollectionOrderStatistics
   * @param {string} contractAddress
   * @param {string} chainId
   * @returns {Promise<object>} collection order statistics
   * @description get collection order statistics
   */
  @Cacheable({
    key: 'collection:order:statistic',
    seconds: 10,
  })
  async getCollectionOrderStatistic(contractAddress: string, chainId: string) {
    const seaportOrder = await this.seaportOrderRepository.findAll({
      attributes: ['price', 'category', 'perPrice'],
      where: {
        chainId,
      },
      include: [
        {
          attributes: ['token'],
          model: SeaportOrderAsset,
          where: {
            token: ethers.utils.getAddress(contractAddress.toLowerCase()),
            isFillable: true,
          },
        },
      ],
    });

    if (seaportOrder.length === 0) {
      return {
        floorPrice: 0,
        bestOffer: 0,
        currentOffer: 0,
        currentListing: 0,
        totalOffer: 0,
        totalListing: 0,
      };
    }

    seaportOrder.sort((a, b) => {
      return a.perPrice - b.perPrice;
    });

    const offer = seaportOrder.filter(
      (order) => order.category === Category.OFFER,
    );
    const listing = seaportOrder.filter(
      (order) => order.category !== Category.OFFER,
    );

    const collection = await this.collectionRepository.findOne({
      attributes: ['id', 'slug', 'totalOffer', 'totalListing'],
      where: {
        contractAddress: contractAddress,
        chainId: chainId,
      },
    });
    return {
      floorPrice: listing[0]?.perPrice || 0,
      bestOffer: offer[offer.length - 1]?.perPrice || 0,
      currentOffer: offer.length,
      currentListing: listing.length,
      totalOffer: collection.totalOffer,
      totalListing: collection.totalListing,
      totalVolume: 0,
    };
  }

  async updateCollectionTotalByAssets(
    assetIds: string[],
    category: Category,
    add = 1,
  ) {
    const collectionByAssetSql = `
      select c.id, c.total_listing, c.total_offer, c.chain_id, c.contract_address from collections c inner join asset_extra ae on c.id = ae.collection_id
      where ae.asset_id in (:assetIds) GROUP BY c.id;
      `;
    const collections: {
      id: string;
      chain_id: number;
      contract_address: string;
      total_listing: number;
      total_offer: number;
    }[] = await this.sequelizeInstance.query(collectionByAssetSql, {
      replacements: { assetIds: assetIds },
      type: QueryTypes.SELECT,
    });
    for (const collection of collections) {
      console.log('collection ', collection);
      if (category !== Category.OFFER) {
        // listing
        let totalListing = collection.total_listing;
        if (totalListing == 0) {
          totalListing = await this.seaportOrderRepository.count({
            where: {
              chainId: collection.chain_id,
              category: { [Op.not]: Category.OFFER },
            },
            include: [
              {
                attributes: ['token'],
                model: SeaportOrderAsset,
                where: {
                  token: ethers.utils.getAddress(
                    collection.contract_address.toLowerCase(),
                  ),
                },
              },
            ],
          });
        }
        await this.collectionRepository.update(
          { totalListing: totalListing + add },
          { where: { id: collection.id } },
        );
      } else {
        // offer
        let totalOffer = collection.total_offer;
        if (totalOffer == 0) {
          totalOffer = await this.seaportOrderRepository.count({
            where: {
              chainId: collection.chain_id,
              category: Category.OFFER,
            },
            include: [
              {
                attributes: ['token'],
                model: SeaportOrderAsset,
                where: {
                  token: ethers.utils.getAddress(
                    collection.contract_address.toLowerCase(),
                  ),
                },
              },
            ],
          });
        }
        await this.collectionRepository.update(
          { totalOffer: totalOffer + add },
          { where: { id: collection.id } },
        );
      }
    }
  }
}
