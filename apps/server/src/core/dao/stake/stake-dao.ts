import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { StakeWalletBeer } from '@/model/entities/stake/stake-wallet-beer.entity';
import {
  StakeNft,
  StakeNftStatus,
  StakeRarity,
} from '@/model/entities/stake/stake-nft.entity';
import { StakeNftBeerHistory } from '@/model/entities/stake/stake-nft-beer-history';
import { StakeWalletClaimHistory } from '@/model/entities/stake/stake-wallet-claim-history.entity';
import { StudioContractUploadItem } from '@/model/entities/studio/studio-contract-upload-item.entity';
import {
  Asset,
  AssetAsEthAccount,
  Contract,
  StudioContract,
} from '@/model/entities';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize';
import { AssetDao } from '@/core/dao/asset-dao';
import { ChainId } from '@/common/utils/types';
import {
  StakeAction,
  StakeNftHistory,
  StakeStatus,
} from '@/model/entities/stake/stake-nft-history.entity';
import { OrderDao } from '@/core/dao/order-dao';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { StakeParamsDao } from '@/core/dao/stake/stake-params-dao';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { StakeSeason } from '@/model/entities/stake/stake-session.entity';
import { StakeWalletStats } from '@/model/entities/stake/stake-wallet-stats.entity';
import { BigNumber } from 'bignumber.js';

@Injectable()
export class StakeDao {
  private readonly logger = new Logger(StakeDao.name);
  constructor(
    @InjectModel(StakeWalletBeer)
    private stakeWalletBeerRepository: typeof StakeWalletBeer,
    @InjectModel(StakeWalletStats)
    private stakeWalletStatsRepository: typeof StakeWalletStats,
    @InjectModel(StakeNft)
    private stakeNftRepository: typeof StakeNft,
    @InjectModel(StakeNftHistory)
    private stakeNftHistoryRepository: typeof StakeNftHistory,
    @InjectModel(StakeNftBeerHistory)
    private stakeNftBeerHistoryRepository: typeof StakeNftBeerHistory,
    @InjectModel(StakeWalletClaimHistory)
    private stakeWalletClaimHistoryRepository: typeof StakeWalletClaimHistory,
    @InjectModel(StudioContractUploadItem)
    private studioContractUploadItemRepository: typeof StudioContractUploadItem,
    @InjectModel(StakeSeason)
    private stakeSeasonRepository: typeof StakeSeason,
    @InjectModel(Asset)
    private assetRepository: typeof Asset,
    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private assetDao: AssetDao,
    private stakeParamsDao: StakeParamsDao,
    private orderDao: OrderDao,
    private gatewayService: GatewayService,
    private rpcHandlerService: RpcHandlerService,
  ) {
    this.logger.debug('StakeDao constructor');
    // this.getWalletBeer('0x3e5a72d017ab399eb95fb558828d30f2859c4111');
    // this.stakeNftHistory({
    //   wallet: '0x3e5a72d017ab399eb95fb558828d30f2859c4111',
    //   chainId: 1868,
    //   contractAddress: '0xa6694ff60281544c50d5c1417279edbdbea5c775',
    //   tokenId: '3',
    //   txHash:
    //     '0xcdae62c9a65a7847beb20a01295e61de68f18973634037f315289a64ba607bec',
    //   time: new Date('2025-03-24T10:28:53.000Z'),
    // });

    // this.unStakeNftHistory({
    //   wallet: '0x33d11c2dd0de6bf29beaebfdf948fedf7bc3f271',
    //   chainId: 1868,
    //   contractAddress: '0xa9f2cc05b1b39c9171c380c064bebfe4b5e15ead',
    //   tokenId: '2',
    //   txHash:
    //     '0x29a5f890a7607aef235d70197c7be23504ba870dc9a9e16db669d04a81136461',
    //   time: new Date('2025-04-01T09:24:33.000Z'),
    // });
    // this.getNftValues({
    //   chainId: 1868,
    //   contractAddress: '0xe120efb58fb2f0948ddea147e26c057b86f5db9f',
    //   tokenId: '2268',
    // }).then((res) => console.log('res ', res));

    // this.syncERC721NftOwner({
    //   chainId: 1868,
    //   contractAddress:
    //     '0xD843BcfDB409077E01AB39a5765dc15b33999B74'.toLowerCase(),
    //   tokenId: '15',
    // });

    // this.getSeasonByTime(new Date('2025-05-01 00:00:00.000000 +00:00')).then(
    //   (res) => console.log('season ', res),
    // );
  }

  @Cacheable({ seconds: 60 })
  async getSeasons() {
    const seasons = await this.stakeSeasonRepository.findAll({
      order: [['startTime', 'asc']],
    });
    return seasons.map((e) => ({
      name: e.name,
      startTime: e.startTime.getTime(),
      endTime: e.endTime.getTime(),
      title: e.title,
      description: e.description,
    }));
  }

  async getSeason(seasonName?: string) {
    const seasons = await this.getSeasons();
    if (seasonName) {
      const season = seasons.find((e) => e?.name == seasonName);
      if (season) {
        return season;
      }
    }
    const dateTime = new Date().getTime();
    for (const season of seasons) {
      if (dateTime > season.startTime && dateTime < season.endTime) {
        return season;
      }
    }

    return {
      name: 'finally',
      startTime: 0,
      endTime: 1999999999,
      title: 'finally Season',
      description: 'This is the finally season.',
    };
  }

  async getSeasonByTime(time: Date) {
    const seasons = await this.getSeasons();
    const dateTime = time.getTime();
    for (const season of seasons) {
      if (dateTime > season.startTime && dateTime <= season.endTime) {
        return season;
      }
    }
  }

  /**
   * get StakeWalletBeer by wallet address
   */
  async getWalletBeer(address: string, season: string) {
    address = address.toLowerCase();
    let wallet = await this.stakeWalletBeerRepository.findOne({
      where: { address: address, season: season },
    });
    if (!wallet) {
      try {
        wallet = await this.stakeWalletBeerRepository.create({
          address: address,
          season: season,
        });
      } catch (e) {
        this.logger.error(`getWalletInfo ${e.message}`);
        wallet = await this.stakeWalletBeerRepository.findOne({
          where: { address: address, season: season },
        });
      }
    }
    let updated = false;
    // 补齐 availableBeer 值
    if (wallet.claimedBeer > 0 && wallet.availableBeer == 0) {
      wallet.availableBeer = wallet.claimedBeer;
      updated = true;
    }
    // pending -> available
    if (wallet.pendingBeer > 0) {
      wallet.availableBeer = new BigNumber(wallet.availableBeer)
        .plus(new BigNumber(wallet.pendingBeer))
        .toNumber();
      wallet.pendingBeer = 0;
      updated = true;
    }
    if (updated) {
      await wallet.save();
    }
    return wallet;
  }

  async getWalletStats(address: string) {
    address = address.toLowerCase();
    let stats = await this.stakeWalletStatsRepository.findOne({
      where: { address: address },
    });
    if (!stats) {
      try {
        const walletInfo = await this.stakeWalletBeerRepository.findOne({
          where: { address: address },
          order: [['updatedAt', 'desc']],
        });
        stats = await this.stakeWalletStatsRepository.create({
          address: address,
          earningTime: walletInfo?.earningTime ?? 0,
          longestStakingTime: walletInfo?.longestStakingTime ?? 0,
          totalStakingNfts: walletInfo?.totalStakingNfts ?? 0,
        });
      } catch (e) {
        this.logger.error(`getWalletStats ${e.message}`);
        stats = await this.stakeWalletStatsRepository.findOne({
          where: { address: address },
        });
      }
    }
    return stats;
  }

  /**
   * 返回nft信息：name, imageUrl, rarity
   * @param params
   */
  async getNftValues(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  }) {
    const nft = await this.studioContractUploadItemRepository.findOne({
      where: { tokenId: params.tokenId },
      include: [
        {
          attributes: ['id'],
          model: StudioContract,
          where: {
            chainId: params.chainId,
            address: params.contractAddress,
          },
        },
      ],
    });
    const asset = await this.assetRepository.findOne({
      attributes: ['id', 'imageUrl', 'traits'],
      where: {
        tokenId: params.tokenId,
      },
      include: [
        {
          attributes: ['id'],
          model: Contract,
          where: {
            address: params.contractAddress,
            chainId: params.chainId,
          },
        },
      ],
    });
    let rarity = StakeRarity.Commemorative;
    let imageUrl = '';
    if (asset) {
      try {
        let traits: any[] = [];
        traits = (asset.traits as any) || [];
        const levelItem = traits.find((e) => e.trait_type === 'Level');
        if (levelItem) {
          rarity = levelItem.value;
        }
        imageUrl = asset.imageUrl ?? '';
      } catch (e) {
        this.logger.error(`parse asset rarity ${asset.traits?.toString()}`);
      }
    }
    if (rarity === StakeRarity.Commemorative && nft) {
      try {
        let traits: any[] = [];
        traits = (nft.traits as any) || [];
        // console.log(`nft traits ${nft.traits} `, traits);
        const levelItem = traits.find((e) => e.trait_type === 'Level');
        if (levelItem) {
          rarity = levelItem.value;
        }
      } catch (e) {
        this.logger.error(`parse nft rarity ${nft.traits?.toString()}`);
      }
    }
    if (!imageUrl && nft) {
      imageUrl = nft.fileIpfsUri;
    }
    // rarity = this.stakeParamsDao.getRarity(rarity);
    const nftValues = {
      // assetId: asset?.id,

      chainId: params.chainId,
      contractAddress: params.contractAddress,
      tokenId: params.tokenId,
      imageUrl: imageUrl,
      rarity: rarity,
    };
    return nftValues;
  }

  async stakeNftHistory(params: {
    wallet: string;
    chainId: number;
    contractAddress: string;
    tokenId: string;
    txHash: string;
    time: Date;
  }) {
    this.logger.debug(`stakeNftHistory ${JSON.stringify(params)}`);
    const nftHistory = await this.stakeNftHistoryRepository.findOne({
      where: {
        address: params.wallet,
        chainId: params.chainId,
        contractAddress: params.contractAddress,
        tokenId: params.tokenId,
        txHash: params.txHash,
        status: StakeStatus.Confirmed,
      },
    });
    if (nftHistory) {
      return;
    }
    // 创建stake nft history， 同时更新wallet的beer info
    await this.getWalletStats(params.wallet);
    // sync asset
    this.assetDao.syncAssetOnChain({
      contractAddress: params.contractAddress,
      tokenId: params.tokenId,
      chainId: (params.chainId + '') as ChainId,
    });

    const nftValues = await this.getNftValues({
      chainId: params.chainId,
      contractAddress: params.contractAddress,
      tokenId: params.tokenId,
    });
    console.log('values ', nftValues);
    await this.sequelizeInstance
      .transaction(async (t) => {
        const walletStats = await this.stakeWalletStatsRepository.findOne({
          where: { address: params.wallet },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });

        const nftHistory = await this.stakeNftHistoryRepository.findOne({
          where: {
            address: params.wallet,
            chainId: params.chainId,
            contractAddress: params.contractAddress,
            tokenId: params.tokenId,
            txHash: params.txHash,
          },
          transaction: t,
        });
        if (nftHistory) {
          if (nftHistory.status === StakeStatus.Pending) {
            // 已创建，且为pending状态
            walletStats.totalStakingNfts =
              (await this.stakeNftRepository.count({
                where: {
                  address: params.wallet,
                  isStaking: true,
                  status: StakeNftStatus.StakeConfirmed,
                },
              })) + 1;
            await walletStats.save({ transaction: t });
            const stakeNft = await this.stakeNftRepository.findOne({
              where: {
                address: params.wallet,
                chainId: params.chainId,
                stakeHash: params.txHash,
                status: StakeNftStatus.StakePending,
              },
              transaction: t,
            });
            stakeNft.stakedAt = params.time;
            stakeNft.status = StakeNftStatus.StakeConfirmed;
            await stakeNft.save({ transaction: t });

            nftHistory.status = StakeStatus.Confirmed;
            await nftHistory.save({ transaction: t });
          }
        } else {
          // 未创建
          walletStats.totalStakingNfts =
            (await this.stakeNftRepository.count({
              where: {
                address: params.wallet,
                isStaking: true,
                status: StakeNftStatus.StakeConfirmed,
              },
            })) + 1;
          await walletStats.save({ transaction: t });
          await this.stakeNftRepository.create(
            {
              ...nftValues,
              address: params.wallet,
              status: StakeNftStatus.StakeConfirmed,
              isStaking: true,
              stakeHash: params.txHash,
              stakedAt: params.time,
            },
            { transaction: t },
          );
          await this.stakeNftHistoryRepository.create(
            {
              ...nftValues,
              address: params.wallet,
              action: StakeAction.Stake,
              status: StakeStatus.Confirmed,
              txHash: params.txHash,
              actionAt: params.time,
            },
            { transaction: t },
          );
        }
      })
      .catch((e) => console.log('e ', e));
    this.syncERC721NftOwner({
      chainId: params.chainId,
      contractAddress: params.contractAddress,
      tokenId: params.tokenId,
    });
  }

  async unStakeNftHistory(params: {
    wallet: string;
    chainId: number;
    contractAddress: string;
    tokenId: string;
    txHash: string;
    time: Date;
  }) {
    this.logger.debug(`unStakeNftHistory ${JSON.stringify(params)}`);
    const nftHistory = await this.stakeNftHistoryRepository.findOne({
      where: {
        address: params.wallet,
        chainId: params.chainId,
        contractAddress: params.contractAddress,
        tokenId: params.tokenId,
        txHash: params.txHash,
        status: StakeStatus.Confirmed,
      },
    });
    if (nftHistory) {
      return;
    }

    await this.sequelizeInstance.transaction(async (t) => {
      const walletStats = await this.stakeWalletStatsRepository.findOne({
        where: { address: params.wallet },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      const nftHistory = await this.stakeNftHistoryRepository.findOne({
        where: {
          address: params.wallet,
          chainId: params.chainId,
          contractAddress: params.contractAddress,
          tokenId: params.tokenId,
          txHash: params.txHash,
        },
      });
      if (nftHistory) {
        if (nftHistory.status === StakeStatus.Pending) {
          const stakeNft = await this.stakeNftRepository.findOne({
            where: {
              address: params.wallet,
              chainId: params.chainId,
              contractAddress: params.contractAddress,
              tokenId: params.tokenId,
              unStakeHash: params.txHash,
            },
            transaction: t,
          });
          if (!stakeNft) {
            // 找不到质押中的nft， 先跳过，后期定期排查
            return;
          }

          walletStats.totalStakingNfts = await this.stakeNftRepository.count({
            where: {
              address: params.wallet,
              isStaking: true,
              status: StakeNftStatus.StakeConfirmed,
            },
          });
          await walletStats.save({ transaction: t });

          stakeNft.unStakedAt = params.time;
          stakeNft.status = StakeNftStatus.UnStakeConfirmed;
          await stakeNft.save({ transaction: t });
          nftHistory.status = StakeStatus.Confirmed;
          await nftHistory.save({ transaction: t });
        }
      } else {
        // create
        const stakeNft = await this.stakeNftRepository.findOne({
          where: {
            address: params.wallet,
            chainId: params.chainId,
            contractAddress: params.contractAddress,
            tokenId: params.tokenId,
            status: StakeNftStatus.StakeConfirmed,
          },
          transaction: t,
        });
        if (!stakeNft) {
          // 找不到质押中的nft， 先跳过，后期定期排查
          return;
        }
        walletStats.totalStakingNfts =
          (await this.stakeNftRepository.count({
            where: {
              address: params.wallet,
              isStaking: true,
              status: StakeNftStatus.StakeConfirmed,
            },
          })) - 1;
        await walletStats.save({ transaction: t });

        stakeNft.isStaking = false;
        stakeNft.unStakedAt = params.time;
        stakeNft.unStakeHash = params.txHash;
        stakeNft.status = StakeNftStatus.UnStakeConfirmed;
        await stakeNft.save({ transaction: t });
        await this.stakeNftHistoryRepository.create(
          {
            address: stakeNft.address,
            chainId: stakeNft.chainId,
            contractAddress: stakeNft.contractAddress,
            tokenId: stakeNft.tokenId,
            imageUrl: stakeNft.imageUrl,
            rarity: stakeNft.rarity,
            //
            action: StakeAction.UnStake,
            status: StakeStatus.Confirmed,
            txHash: params.txHash,
            actionAt: params.time,
          },
          { transaction: t },
        );
      }
    });
    this.syncERC721NftOwner({
      chainId: params.chainId,
      contractAddress: params.contractAddress,
      tokenId: params.tokenId,
    });
  }

  async syncERC721NftOwner(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  }) {
    let ownerAddress = await this.gatewayService.nativeGetOwnerOf(
      (params.chainId + '') as ChainId,
      params.contractAddress,
      params.tokenId,
    );
    console.log(`syncERC721NftOwner ownerAddress ${ownerAddress}`);
    if (!ownerAddress) {
      return;
    }
    ownerAddress = ownerAddress.toLowerCase();
    const asset = await this.assetRepository.findOne({
      attributes: ['id', 'contractId'],
      where: {
        chainId: params.chainId,
        tokenId: params.tokenId,
      },
      include: [
        {
          attributes: ['schemaName'],
          model: Contract,
          where: {
            address: params.contractAddress,
            chainId: params.chainId,
          },
        },
      ],
    });
    if (!asset) {
      return;
    }
    const assetId = asset.id;
    let assetAsEthAccount = undefined;
    if (
      (await this.assetAsEthAccountRepository.count({
        where: {
          assetId,
        },
      })) > 1
    ) {
      console.log(`syncERC721NftOwner clear assetAsEthAccount:${assetId}`);
      await this.assetAsEthAccountRepository.destroy({
        where: {
          assetId,
        },
      });
    } else {
      assetAsEthAccount = await this.assetAsEthAccountRepository.findOne({
        attributes: ['id', 'ownerAddress'],
        where: {
          assetId,
        },
      });
    }
    console.log(
      `syncERC721NftOwner assetId:${assetId} ${ownerAddress} ${assetAsEthAccount?.assetId} ${assetAsEthAccount?.ownerAddress}`,
    );
    if (assetAsEthAccount && assetAsEthAccount.ownerAddress != ownerAddress) {
      await this.assetAsEthAccountRepository.update(
        {
          ownerAddress: ownerAddress,
          contractId: asset.contractId,
        },
        {
          where: {
            id: assetAsEthAccount.id,
          },
        },
      );
    } else if (
      assetAsEthAccount &&
      assetAsEthAccount.ownerAddress == ownerAddress
    ) {
      // nothing
    } else {
      await this.assetAsEthAccountRepository.create({
        assetId,
        ownerAddress: ownerAddress,
        quantity: '1',
        contractId: asset.contractId,
      });
    }
  }
}
