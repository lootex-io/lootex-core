import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuthSupportedWalletProviderEnum } from '@/api/v3/auth/auth.interface';
import { InjectModel } from '@nestjs/sequelize';
import {
  AccountReferral,
  SeaportOrder,
  SeaportOrderHistory,
  Wallet,
  WalletHistory,
} from '@/model/entities';
import { ORDER_PLATFORM_TYPE } from '@/microservice/nft-aggregator/aggregator-constants';
import { AssetEventCategory } from '@/api/v3/asset/asset.interface';
import {
  AccountGpQuest,
  GpQuestCategory,
  GpQuestType,
} from '@/model/entities/gp/account-gp-quest.entity';
import { AccountGpQuestCompleted } from '@/model/entities/gp/account-gp-quest_completed.entity';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import { ethers } from 'ethers';
import { ChainUtil } from '@/common/utils/chain.util';
import { BigNumber } from 'bignumber.js';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { GpDao } from '@/core/dao/gp-dao';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { SimpleException, SimpleJson } from '@/common/utils/simple.util';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import * as moment from 'moment';
import { Moment } from 'moment';
import { ConfigService } from '@nestjs/config';
import {
  linedWeightedLottery,
  weightedLottery,
} from '@/common/utils/utils.pure';
import { QUEST_INDEX } from '@/api/v3/account-gp/constants';
import { TradeRewardService } from '@/api/v3/account-gp/service/trade-reward.service';
import { SdkEnvService } from '@/core/sdk/service/sdk-env.service';
import { SdkEnv } from '@/core/sdk/constants/env-constants';
import { AccountGpQuestCollectionService } from '@/api/v3/account-gp/service/collection-quest/account-gp-quest-collection.service';

@Injectable()
export class AccountGpQuestService {
  private readonly logger = new Logger(AccountGpQuestService.name);

  static QUEST_ONE_OFF_DEPOSIT = 100; // 100 美元
  // static QUEST_ONE_OFF_DEPOSIT = 5; // 5 美元 test
  static QUEST_SEVEN_DAYS_REWARD_INDEX = [28, 29, 30, 31, 32, 33, 34];
  static QUEST_REPEATABLE_INDEX = [
    ...AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX,
    35,
  ]; // 可重复领取的quest index
  static FORMAT_DATE_STR = 'YYYY-MM-DD';

  constructor(
    @InjectModel(Wallet)
    private readonly walletsRepository: typeof Wallet,
    @InjectModel(WalletHistory)
    private readonly walletHistoryRepository: typeof WalletHistory,
    @InjectModel(SeaportOrder)
    private readonly seaportOrderRepository: typeof SeaportOrder,
    @InjectModel(SeaportOrderHistory)
    private readonly seaportOrderHistoryRepository: typeof SeaportOrderHistory,
    @InjectModel(AccountGpQuest)
    private readonly accountGpQuestRepository: typeof AccountGpQuest,
    @InjectModel(AccountGpQuestCompleted)
    private readonly accountGpQuestCompletedRepository: typeof AccountGpQuestCompleted,
    @InjectModel(AccountReferral)
    private readonly accountReferralRepository: typeof AccountReferral,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly currencyService: CurrencyService,
    private readonly rpcHandlerService: RpcHandlerService,
    private readonly gatewayService: GatewayService,
    private readonly gpDao: GpDao,
    private readonly sdkEnvService: SdkEnvService,
    private readonly tradeRewardService: TradeRewardService,
    private readonly gpQuestCollectionService: AccountGpQuestCollectionService,
    private readonly configService: ConfigService,
  ) {
    // this.checkSADeposit('0x870B67AD5410fD1759D49ff573436fF4f14c6148').then(
    //   (e) => console.log(e),
    // );
    // this.gatewayService
    //   .nativeGetERC20BalanceOf(
    //     '5000',
    //     '0x94a42083948d86432246eAD625B30d49014A4BFF',
    //     '0x870B67AD5410fD1759D49ff573436fF4f14c6148',
    //   )
    //   .then((e) => console.log(e));
    // this.accountGpQuestRepository
    //   .findOne({ where: { index: 6 } })
    //   .then((quest) => {
    //     const accountId = 'c96fc022-0ade-40a7-ae1c-b18161199ddf';
    //     this.checkDailyTrade(accountId, quest, new Date().getTime()).then(
    //       (res) => {
    //         console.log('checkDailyTrade', res);
    //       },
    //     );
    //   });
    // this.accountGpQuestRepository
    //   .findOne({ where: { index: 7 } })
    //   .then((quest) => {
    //     const accountId = '41fb76c1-6e1b-438d-8825-4e06af44e327'; // ellenc
    //     this.checkMonthTrade(accountId, quest, new Date().getTime()).then(
    //       (res) => {
    //         console.log('checkDailyTrade', res);
    //       },
    //     );
    //   });
    // this.checkAccountReferralBonus(
    //   '41fb76c1-6e1b-438d-8825-4e06af44e327',
    //   7,
    //   new Date().getTime(),
    // ).then((res) => console.log('res ', res));
  }

  async getQuestStatus(accountId: string | null, questType: GpQuestType) {
    let questIndexes = [];
    switch (questType) {
      case GpQuestType.DAILY:
        questIndexes = [35];
        break;
      case GpQuestType.ONEOFF:
        questIndexes = [1, 2, 3, 4, 5, 26, 27];
        break;
      case GpQuestType.TRADE:
        // [8, 25]
        questIndexes = [...Array(18).keys()].map((i) => i + 8);
        break;
      case GpQuestType.RECOMMEND:
        questIndexes = [7];
        break;
    }
    if (accountId == null) {
      const sql = `select * from account_gp_quest quest where index in (:questIndex) and deleted = false order by index asc`;
      const data: any[] = await this.sequelizeInstance.query(sql, {
        replacements: { questIndex: questIndexes },
        type: QueryTypes.SELECT,
      });

      const sevenDaysReward = data.find((e) => e.index === 27);
      if (sevenDaysReward) {
        sevenDaysReward.items = await this.sequelizeInstance.query(sql, {
          replacements: {
            questIndex: AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX,
          },
          type: QueryTypes.SELECT,
        });
      }
      data.sort((a, b) => a.index - b.index);
      return data;
    }
    const sql = `select quest.*, quest_completed.id as status from account_gp_quest quest left join account_gp_quest_completed quest_completed on (quest_completed.quest_index = quest.index and quest_completed.account_id = :accountId) where quest.index in (:questIndex) and quest.deleted = false`;
    let data: any[] = await this.sequelizeInstance.query(sql, {
      replacements: {
        accountId: accountId,
        questIndex: questIndexes,
      },
      type: QueryTypes.SELECT,
    });
    data = data.map((e: any) => {
      e.status = e.status != null;
      e.claimable = false;
      return e;
    });
    switch (questType) {
      case GpQuestType.DAILY:
        return await this.getQuestStatusDaily(accountId, data);
        break;
      case GpQuestType.ONEOFF:
        return await this.getQuestStatusOneOff(accountId, data);
        break;
      case GpQuestType.TRADE:
        return await this.getQuestStatusTrade(accountId, data);
        break;
      case GpQuestType.RECOMMEND:
        return await this.getQuestStatusRecommend(accountId, data);
        break;
    }
    throw SimpleException.error('Quest Type Not Found');
  }

  /**
   * 每日任務
   * index  35
   */
  async getQuestStatusDaily(accountId: string, data: any[]) {
    // daily trade quest
    // const item6 = data.find((e) => e.index === 6);
    // if (item6) {
    //   const quest = await this.accountGpQuestRepository.findOne({
    //     where: { index: item6.index },
    //   });
    //   const checkRes = await this.checkDailyTrade(
    //     accountId,
    //     quest,
    //     new Date().getTime(),
    //   );
    //   item6.status = checkRes.completed;
    //   // item6.claimable = checkRes.status;
    //   item6.claimable = true;
    // }
    const item35 = data.find((e) => e.index === 35);
    if (item35) {
      const quest = await this.accountGpQuestRepository.findOne({
        where: { index: item35.index },
      });
      const checkRes = await this.checkDailyTrade(
        accountId,
        quest,
        new Date().getTime(),
      );
      item35.status = checkRes.completed;
      // item6.claimable = checkRes.status;
      item35.claimable = true;
    }
    // sort
    data.sort((a, b) => a.index - b.index);
    return data;
  }

  /**
   * 一次性任務(SA / Smart mint / Deposit / List)
   */
  async getQuestStatusOneOff(accountId: string, data: any[]) {
    const completeSAClaimable = async (saAddress) => {
      const second = data.find((e) => e.index === 2);
      if (second) {
        second.claimable =
          second.status || (await this.checkSAMinted(saAddress));
      }
      const third = data.find((e) => e.index === 3);
      if (third) {
        if (third.status) {
          third.claimable = true;
          third.listingCount = 3;
        } else {
          const checkRes = await this.checkSAListing(accountId);
          third.claimable = checkRes.status;
          third.listingCount = checkRes.count;
        }
      }
      const fourth = data.find((e) => e.index === 4);
      if (fourth) {
        if (fourth.status) {
          fourth.claimable = true;
          fourth.saledCount = 3;
        } else {
          const checkRes = await this.checkSASold(saAddress);
          fourth.claimable = checkRes.status;
          fourth.saledCount = checkRes.count;
        }
      }
      const fifth = data.find((e) => e.index === 5);
      if (fifth) {
        if (fifth.status) {
          fifth.claimable = true;
          fifth.depositAmount = `${AccountGpQuestService.QUEST_ONE_OFF_DEPOSIT}`;
        } else {
          const checkRes = await this.checkSADeposit(saAddress);
          fifth.claimable = checkRes.status;
          fifth.depositAmount = checkRes.amount;
        }
      }

      const quest26 = data.find((e) => e.index === 26);
      if (quest26) {
        if (quest26.status) {
          quest26.claimable = true;
          // quest26.depositAmount = `${AccountGpQuestService.QUEST_ONE_OFF_DEPOSIT}`;
        } else {
          const checkRes = await this.checkBuyOneNft(accountId, quest26);
          quest26.claimable = checkRes.status;
          // quest26.depositAmount = checkRes.amount;
        }
      }
    };
    const first = data.find((e) => e.index === 1);
    if (first) {
      if (first.status) {
        first.claimable = true;
        const saWallet = await this.walletsRepository.findOne({
          where: {
            accountId: accountId,
            provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
          },
        });
        if (saWallet) {
          await completeSAClaimable(saWallet.address);
        }
      } else {
        first.claimable = await this.checkSAAccount(accountId);
        if (first.claimable) {
          first.claimable = true;
          const saWallet = await this.walletsRepository.findOne({
            where: {
              accountId: accountId,
              provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
            },
          });
          if (saWallet) {
            await completeSAClaimable(saWallet.address);
          }
        }
      }

      const sevenDaysReward = data.find((e) => e.index == 27);
      if (sevenDaysReward) {
        // add 7 days check quest
        const sql = `select quest.* from account_gp_quest quest where quest.index in (:questIndex)`;
        sevenDaysReward.items = await this.sequelizeInstance.query(sql, {
          replacements: {
            questIndex: AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX,
          },
          type: QueryTypes.SELECT,
        });
        const res = await this.checkSevenDaysReward(accountId, sevenDaysReward);
        sevenDaysReward.claimable = res.claimable;
        sevenDaysReward.status = res.status;
        sevenDaysReward.claimedDays = res.claimedDays;
        sevenDaysReward.lastClaimDate = res.lastClaimDate;
        sevenDaysReward.consecutiveDays = res.consecutiveDays;
        sevenDaysReward.firstClaimDate = res.firstClaimDate;
        sevenDaysReward.claimedPoint = res.claimedPoint;
        sevenDaysReward.nextQuestIndex = res.nextQuestIndex;
      }
    }
    // sort
    data.sort((a, b) => a.index - b.index);
    return data;
  }

  /**
   * 交易任務
   */
  async getQuestStatusTrade(accountId: string, data: any[]) {
    // month rade quest
    const monthTradeItems = data
      .filter((e) => e.index >= 8 && e.index <= 25)
      .sort((a, b) => a.index - b.index);
    // console.log('monthTradeItems ', monthTradeItems);
    let lastMonthTradeItem = null;
    let tradeVolume = null;
    for (const item of monthTradeItems) {
      const quest = await this.accountGpQuestRepository.findOne({
        where: { index: item.index },
      });
      if (lastMonthTradeItem && !lastMonthTradeItem.status) {
        item.status = false;
        item.claimable = false;
        item.volume = lastMonthTradeItem.volume;
        lastMonthTradeItem = item;
        continue;
      }

      const questCompleted = await this.gpDao.getQuestComplete({
        accountId: accountId,
        questIndex: quest.index,
      });
      item.status = questCompleted ? true : false;
      if (item.status) {
        if (tradeVolume === null) {
          tradeVolume = (
            await this.checkMonthTrade(accountId, quest, new Date().getTime())
          ).volume;
        }
        item.claimable = true;
        item.volume = tradeVolume;
      } else {
        const checkRes = await this.checkMonthTrade(
          accountId,
          quest,
          new Date().getTime(),
        );
        tradeVolume = checkRes.volume;
        item.claimable = checkRes.status;
        item.volume = checkRes.volume;
      }
      lastMonthTradeItem = item;
    }
    return monthTradeItems;
  }

  /**
   * 推薦任務
   */
  async getQuestStatusRecommend(accountId: string, data: any[]) {
    // referral bonus
    const mothBonusItem = data.find((e) => e.index === 7);
    if (mothBonusItem) {
      const res = await this.checkAccountReferralBonus(
        accountId,
        mothBonusItem.index,
        new Date().getTime(),
      );
      mothBonusItem.status = res.status;
      mothBonusItem.ongoingBonus = res.ongoingBonus;
      mothBonusItem.lastMonthBonus = res.lastMonthBonus;
      mothBonusItem.claimable = res.claimable;
    }
    data.sort((a, b) => a.index - b.index);
    return data;
  }

  async claimQuestReward(accountId: string, questIndex: number) {
    const failException = SimpleException.fail({ message: 'Claim failed' });
    const quest = await this.accountGpQuestRepository.findOne({
      where: { index: questIndex, deleted: false },
    });

    if (!quest) {
      throw SimpleException.fail({ message: 'Quest object not found' });
    }

    if (quest.category === GpQuestCategory.Collection) {
      return await this.gpQuestCollectionService.claim(accountId, quest);
    }

    // claim reward quest. (referral reward | trade reward)
    if (questIndex === QUEST_INDEX.REFERRAL_REWARD) {
      return this.tradeRewardService.claimReferralReward(accountId, quest);
    } else if (questIndex === QUEST_INDEX.TRADE_REWARD) {
      return this.tradeRewardService.claimTradeReward(accountId, quest);
    }

    // daily , month trade, month bonus quest 除外
    if (
      AccountGpQuestService.QUEST_REPEATABLE_INDEX.indexOf(quest.index) ===
        -1 &&
      (quest.index <= 5 || quest.index > 25)
    ) {
      const questCompleted =
        await this.accountGpQuestCompletedRepository.findOne({
          where: { accountId: accountId, questIndex: quest.index },
        });
      if (questCompleted) {
        throw SimpleException.fail({
          message: 'You have successfully claimed it',
        });
      }
    }

    const createQuestHistory = async (data: {
      quest: AccountGpQuest;
      questTime?: number;
      amount?: number;
      args?: any;
    }) => {
      const { quest, questTime, amount } = data;
      const gpAmount = amount ? amount.toString() : quest.point.toString();
      const res = await this.gpDao.createQuestHistory({
        accountId: accountId,
        questIndex: quest.index,
        amount: gpAmount,
        note: quest.title,
        questTime: questTime ? questTime : new Date().getTime(),
        args: data.args,
      });
      if (res) {
        return SimpleJson.success({ data: { gpAmount: gpAmount } });
      }
      throw failException;
    };

    if (quest.index === 1) {
      if (await this.checkSAAccount(accountId)) {
        return await createQuestHistory({ quest: quest });
      }
    } else {
      const _findSAOrError = async () => {
        const saWallet = await this.walletsRepository.findOne({
          where: {
            accountId: accountId,
            provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
          },
        });
        if (!saWallet) {
          throw SimpleException.fail({ message: 'SA account not found' });
        }
        return saWallet;
      };
      if (quest.index === 2) {
        const saWallet = await _findSAOrError();
        if (await this.checkSAMinted(saWallet.address)) {
          return await createQuestHistory({ quest: quest });
        }
      } else if (quest.index === 3) {
        if ((await this.checkSAListing(accountId)).status) {
          return await createQuestHistory({ quest: quest });
        }
      } else if (quest.index === 4) {
        const saWallet = await _findSAOrError();
        if ((await this.checkSASold(saWallet.address)).status) {
          return await createQuestHistory({ quest: quest });
        }
      } else if (quest.index === 5) {
        const saWallet = await _findSAOrError();
        if ((await this.checkSADeposit(saWallet.address)).status) {
          return await createQuestHistory({ quest: quest });
        }
      } else if (quest.index === 6 || quest.index === 35) {
        // daily trade
        const nowTime = new Date().getTime();
        if (
          (await this.checkDailyTrade(accountId, quest, nowTime, true)).status
        ) {
          return await createQuestHistory({
            quest: quest,
            questTime: nowTime,
            amount: linedWeightedLottery([5, 20], 1)[0],
          });
        }
      } else if (quest.index === 7) {
        // month bonus
        const nowTime = new Date().getTime();
        const res = await this.checkAccountReferralBonus(
          accountId,
          quest.index,
          nowTime,
        );
        if (res.claimable) {
          return await createQuestHistory({
            quest: quest,
            questTime: nowTime,
            amount: res.lastMonthBonus,
          });
        } else {
          if (res.claimFailMsg) {
            throw SimpleException.fail({
              message: res.claimFailMsg,
              debug: res.claimFailMsg,
            });
          }
        }
      } else if (quest.index >= 8 && quest.index <= 25) {
        // month trade
        const nowTime = new Date().getTime();
        if (
          (await this.checkMonthTrade(accountId, quest, nowTime, true)).status
        ) {
          return await createQuestHistory({ quest: quest, questTime: nowTime });
        }
      } else if (quest.index === 26) {
        // buy one nft
        if ((await this.checkBuyOneNft(accountId, quest)).status) {
          return await createQuestHistory({ quest: quest });
        }
      } else if (
        AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX.indexOf(
          quest.index,
        ) > -1
      ) {
        // 7 day reward
        const res = await this.checkSevenDaysReward(accountId, true);
        if (res.status) {
          if (res.nextQuestIndex != quest.index) {
            throw SimpleException.fail({ message: 'Quest index invalid' });
          }
          let amount = quest.point;
          if (quest.point === 0 && quest.args) {
            // amount = randomNum(quest.args.minPoint, quest.args.maxPoint);
            amount = weightedLottery(
              [quest.args.minPoint, quest.args.maxPoint],
              1,
            )[0];
          }
          const claimInfo = { ...res };
          const nowTime = moment().utcOffset(0);
          if (
            nowTime.format(AccountGpQuestService.FORMAT_DATE_STR) ==
            claimInfo.lastClaimDate
          ) {
            // 上次领取时间跟今天日期一样
            throw SimpleException.fail({
              message: 'You have successfully claimed it',
            });
          }
          if (
            claimInfo.lastClaimDate ==
            moment()
              .utcOffset(0)
              .subtract(1, 'days')
              .format(AccountGpQuestService.FORMAT_DATE_STR)
          ) {
            // 连续
            claimInfo.consecutiveDays = claimInfo.consecutiveDays + 1;
          } else {
            // 非连续
            claimInfo.consecutiveDays = 1;
          }
          claimInfo.lastClaimDate = nowTime.format(
            AccountGpQuestService.FORMAT_DATE_STR,
          );
          claimInfo.claimedPoint = claimInfo.claimedPoint + amount;
          if (!claimInfo.firstClaimDate) {
            claimInfo.firstClaimDate = nowTime.format(
              AccountGpQuestService.FORMAT_DATE_STR,
            );
          }

          return await createQuestHistory({
            quest: quest,
            amount: amount,
            args: claimInfo,
          });
        }
      }
    }
    throw failException;
  }

  async checkSAAccount(accountId: string) {
    const saWallet = await this.walletsRepository.findOne({
      where: {
        accountId: accountId,
        provider: AuthSupportedWalletProviderEnum.PRIVY_LIBRARY_SA,
      },
    });
    if (saWallet) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * 检查sa wallet下每个链的所有balance 的和大于 AccountGpQuestService.QUEST_ONE_OFF_DEPOSIT usd
   * @param balance
   */
  @logRunDuration()
  async checkSADeposit(saAddress: string) {
    let totalBalance = new BigNumber(0);
    let lootToken = new BigNumber(0);
    for (const chainId of ChainUtil.POC_CHAINS) {
      const balance = await this.getWalletChainBalance(chainId, saAddress);
      let warpedToken = '0';
      switch (chainId) {
        case 1:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '1',
            '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            saAddress,
          );
          lootToken = lootToken.plus(
            await this.gatewayService.nativeGetERC20BalanceOf(
              '1',
              '0x721a1b990699ee9d90b6327faad0a3e840ae8335',
              saAddress,
            ),
          );
          break;
        case 56:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '56',
            '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
            saAddress,
          );
          lootToken = lootToken.plus(
            await this.gatewayService.nativeGetERC20BalanceOf(
              '56',
              '0x14a9a94e555fdd54c21d7f7e328e61d7ebece54b',
              saAddress,
            ),
          );
          break;
        case 137:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '137',
            '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
            saAddress,
          );
          break;
        case 5000:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '5000',
            '0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8',
            saAddress,
          );
          lootToken = lootToken.plus(
            await this.gatewayService.nativeGetERC20BalanceOf(
              '5000',
              '0x94a42083948d86432246eAD625B30d49014A4BFF',
              saAddress,
            ),
          );
          break;
        case 8453:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '8453',
            '0x4200000000000000000000000000000000000006',
            saAddress,
          );
          lootToken = lootToken.plus(
            await this.gatewayService.nativeGetERC20BalanceOf(
              '8453',
              '0x94a42083948d86432246eAD625B30d49014A4BFF',
              saAddress,
            ),
          );
          break;
        case 42161:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '42161',
            '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
            saAddress,
          );
          break;
        case 43114:
          warpedToken = await this.gatewayService.nativeGetERC20BalanceOf(
            '43114',
            '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
            saAddress,
          );
          break;
      }

      const readableWarpedToken = new BigNumber(warpedToken).dividedBy(1e18);
      const { tokenPrice } =
        await this.currencyService.getCachePriceByChainId(chainId);
      const balanceUsd = new BigNumber(balance)
        .plus(readableWarpedToken)
        .times((tokenPrice as any).price);
      this.logger.debug(
        `chainId ${chainId} balance ${balance.toString()} warpedToken ${readableWarpedToken} nativeTokenPrice ${(tokenPrice as any).price} balanceUsd ${balanceUsd}`,
      );
      totalBalance = totalBalance.plus(balanceUsd);
    }
    // 还有 loot 余额 yes
    const lootPrice = (await this.currencyService.getCachePrice('LOOTUSD'))
      .price;
    const looUsd = lootToken.dividedBy(1e18).times(lootPrice);
    totalBalance = totalBalance.plus(looUsd);
    this.logger.debug(
      `totalBalance ${totalBalance.toString()}, lootToken ${lootToken.dividedBy(1e18).toNumber()} lootBalance ${looUsd} lootPrice ${lootPrice}`,
    );
    if (totalBalance.gte(AccountGpQuestService.QUEST_ONE_OFF_DEPOSIT)) {
      return { status: true, amount: totalBalance.toString() };
    }
    return { status: false, amount: totalBalance.toString() };
  }

  @RpcCall()
  async getWalletChainBalance(
    chainId: number,
    address: string,
  ): Promise<string> {
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProvider(chainId);

    return ethers.utils.formatEther(await provider.getBalance(address));
  }

  /**
   * 直接查詢 Account event type 中是否有 Smart mint
   * @param accountId
   */
  async checkSAMinted(saAddress: string) {
    const history = await this.walletHistoryRepository.findOne({
      attributes: ['id'],
      where: { walletAddress: saAddress, tag: 'SmartMint' },
    });
    if (history) {
      return true;
    }
    return false;
  }

  /**
   * List `3` NFTs.
   * @param saAddress
   */
  async checkSAListing(accountId: string) {
    const ORDER_LIMIT = 3;
    const sql = `
      select seaport_order_history.id from seaport_order_history inner join user_wallets on user_wallets.address::bytea = seaport_order_history.from_address
      where user_wallets.account_id = :accountId
        and category = 'list'
        and seaport_order_history.platform_type = :platformType
        limit :orderLimit;
      `;
    const res: any[] = await this.sequelizeInstance.query(sql, {
      replacements: {
        accountId: accountId,
        platformType: ORDER_PLATFORM_TYPE.DEFAULT,
        orderLimit: ORDER_LIMIT,
      },
      type: QueryTypes.SELECT,
    });
    if (res && res.length === ORDER_LIMIT) {
      return { status: true, count: res.length };
    }
    return { status: false, count: res.length };
  }

  /**
   * Sell over 3 NFTs : SA 有賣出 3 個 NFT 就放行
   * @param saAddress
   */
  async checkSASold(saAddress: string) {
    const ORDER_LIMIT = 3;
    const orders = await this.seaportOrderHistoryRepository.findAll({
      attributes: ['id'],
      where: {
        fromAddress: saAddress,
        category: AssetEventCategory.SALE,
        platformType: ORDER_PLATFORM_TYPE.DEFAULT,
      },
      limit: ORDER_LIMIT,
    });
    if (orders && orders.length === ORDER_LIMIT) {
      return { status: true, count: orders.length };
    }
    return { status: false, count: orders.length };
  }

  /**
   * 只要該 account 中有一次購買紀錄(tx history  中的 asset 接收方) 就算完成任務，完成可以獲得 50 GP
   */
  async checkBuyOneNft(
    accountId: string,
    quest: AccountGpQuest,
    throwException = false,
  ) {
    const questCompleted = await this.gpDao.getQuestComplete({
      accountId: accountId,
      questIndex: quest.index,
    });

    if (questCompleted) {
      if (throwException) {
        throw SimpleException.fail({
          message: 'You have successfully claimed it',
        });
      }
      return { status: false, completed: true };
    }

    const sql = `
      select tx_hash from seaport_order_history inner join user_wallets on user_wallets.address::bytea = seaport_order_history.to_address
      where user_wallets.account_id = :accountId
        and category = 'sale'
      limit 1
      `;
    const orders: any[] = await this.sequelizeInstance.query(sql, {
      replacements: { accountId: accountId },
      type: QueryTypes.SELECT,
    });
    let status = false;
    if (orders && orders.length === 1) {
      status = true;
    }
    return { status: status, completed: false };
  }

  /**
   * 7 days check quest
   * update 如果为true，返回的claimInfo需是最更新之后的值
   */
  async checkSevenDaysReward(accountId: string, throwException = false) {
    const histories = await this.accountGpQuestCompletedRepository.findAll({
      where: {
        accountId: accountId,
        questIndex: AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX,
      },
      order: [['created_at', 'desc']],
    });
    if (
      histories &&
      histories.length > 0 &&
      histories[0].args.consecutiveDays >= 7
    ) {
      const claimInfo = histories[0].args;
      return {
        ...claimInfo,
        claimedDays: histories.length,
        claimable: false,
        status: false,
      };
    } else {
      let claimInfo = {
        lastClaimDate: null, // 上次领取日期
        consecutiveDays: 0, // 连续天数
        firstClaimDate: null, // 第一次领取日期
        claimedPoint: 0, // 已领取gp数量

        nextQuestIndex: AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX[0], // 下次领取quest index值
      };

      if (histories && histories.length > 0) {
        const lastHistory = histories[0];
        claimInfo = lastHistory.args;
        // 判断今日是否是连续日期
        if (
          claimInfo.lastClaimDate ==
          moment()
            .utcOffset(0)
            .subtract(1, 'days')
            .format(AccountGpQuestService.FORMAT_DATE_STR)
        ) {
          // 跟上次领取时间相比，属于连续日期
          claimInfo.nextQuestIndex =
            AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX[
              claimInfo.consecutiveDays
            ];
          // claimInfo.consecutiveDays = claimInfo.consecutiveDays + 1;
        } else {
          // 非连续
          if (
            moment()
              .utcOffset(0)
              .format(AccountGpQuestService.FORMAT_DATE_STR) ==
            claimInfo.lastClaimDate
          ) {
            // 当天
            claimInfo.nextQuestIndex =
              AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX[
                claimInfo.consecutiveDays
              ];
          } else {
            // 非当天
            claimInfo.nextQuestIndex =
              AccountGpQuestService.QUEST_SEVEN_DAYS_REWARD_INDEX[0];
            // 前端要求希望非连续非当天 nextQuestIndex 重置的时候, consecutiveDays 也重置
            claimInfo.consecutiveDays = 0;
          }
        }
      }
      const res = {
        ...claimInfo,
        claimedDays: histories.length,
        claimable: true,
        status: true,
      };
      if (
        moment().utcOffset(0).format(AccountGpQuestService.FORMAT_DATE_STR) <=
        claimInfo.lastClaimDate
      ) {
        // 如果今日领取小于上次领取日期，
        res.claimable = false;
      }
      return res;
    }
  }

  /**
   * 完成三筆交易(Purchase) 可得 10GP
   * 每天 8:00 UTC+8 重置 單帳戶每天只能解一次 不限制帳戶種類 EOA SA 均可，跨錢包累計
   * created_at > '2024-07-16 00:00:00 +00:00' and created_at < '2024-07-17 23:59:59 +00:00'
   * @param accountId
   */
  async checkDailyTrade(
    accountId: string,
    quest: AccountGpQuest,
    nowTime: number,
    throwException = false,
  ) {
    this.logger.debug(`checkDailyTrade ${accountId} ${quest.index}`);
    const ORDER_LIMIT = 3;
    const formatStr = 'YYYY-MM-DD HH:mm:ss Z';
    const startTime = moment(nowTime)
      .utcOffset(0)
      .startOf('day')
      .subtract(0, 'hours');
    const endTime = moment(nowTime)
      .utcOffset(0)
      .endOf('day')
      .subtract(0, 'hours');
    const questCompleted = await this.gpDao.getQuestComplete({
      accountId: accountId,
      questIndex: quest.index,
      fromStr: startTime.format(formatStr),
      endStr: endTime.format(formatStr),
    });
    if (questCompleted) {
      if (throwException) {
        throw SimpleException.fail({
          message: 'You have successfully claimed it',
        });
      }
      return { status: false, completed: true };
    }

    return { status: true, completed: false };
    // const sql = `
    //   select tx_hash from seaport_order_history inner join user_wallets on user_wallets.address::bytea = seaport_order_history.to_address
    //   where user_wallets.account_id = :accountId
    //     and category = 'sale'
    //     and seaport_order_history.platform_type = :platformType
    //     and seaport_order_history.created_at > :startTime
    //     and seaport_order_history.created_at < :endTime
    //   group by tx_hash
    //   limit :orderLimit
    //   `;
    // let orders: any[] = await this.sequelizeInstance.query(sql, {
    //   replacements: {
    //     accountId: accountId,
    //     platformType: ORDER_PLATFORM_TYPE.DEFAULT,
    //     startTime: startTime.format(formatStr),
    //     endTime: endTime.format(formatStr),
    //     orderLimit: ORDER_LIMIT,
    //   },
    //   type: QueryTypes.SELECT,
    // });
    // if (orders && orders.length === ORDER_LIMIT) {
    //   return { status: true, count: orders.length };
    // }
    // return { status: false, count: orders.length };
  }

  // async getDailTradeComplete(
  //   accountId: string,
  //   questIndex: number,
  //   nowTime: number,
  // ) {
  //   const formatStr = 'YYYY-MM-DD HH:mm:ss Z';
  //   const startTime = moment(nowTime)
  //     .utcOffset(0)
  //     .startOf('day')
  //     .subtract(0, 'hours');
  //   const endTime = moment(nowTime)
  //     .utcOffset(0)
  //     .endOf('day')
  //     .subtract(0, 'hours');
  //   const questCompleted = await this.accountGpQuestCompletedRepository.findOne(
  //     {
  //       where: {
  //         accountId: accountId,
  //         questIndex: questIndex,
  //         createdAt: {
  //           [Op.gte]: startTime.format(formatStr),
  //           [Op.lte]: endTime.format(formatStr),
  //         },
  //       },
  //     },
  //   );
  //   return questCompleted;
  // }

  /**
   * time period: 2024-07-26T08:00:00Z ~ 2025-07-26T08:00:00Z
   * @param accountId
   */
  @logRunDuration()
  async checkMonthTrade(
    accountId: string,
    quest: AccountGpQuest,
    nowTime: number,
    throwException = false,
  ) {
    this.logger.debug(`checkMonthTrade ${accountId} ${quest.index}`);
    const volume = quest.args.volume;
    const formatStr = 'YYYY-MM-DD HH:mm:ss Z';
    const startTime = moment('2024-07-26T08:00:00Z').utcOffset(0);
    const endTime = moment('2025-07-26T08:00:00Z').utcOffset(0);
    const questCompleted = await this.gpDao.getQuestComplete({
      accountId: accountId,
      questIndex: quest.index,
    });
    if (throwException && questCompleted) {
      throw SimpleException.fail({
        message: 'You have successfully claimed it',
      });
    }
    if (quest.index > 8) {
      const lastComplete = await this.gpDao.getQuestComplete({
        accountId: accountId,
        questIndex: quest.index - 1,
      });
      if (throwException && !lastComplete) {
        throw SimpleException.fail({
          message: 'Claim the previous quest first',
        });
      }
    }
    const sql = `
      select sum(usd_price) from seaport_order_history inner join user_wallets on user_wallets.address::bytea = seaport_order_history.to_address
      where user_wallets.account_id = :accountId
        and category = 'sale'
        and seaport_order_history.service_fee_usd_price is not null
        and seaport_order_history.created_at > :startTime
        and seaport_order_history.created_at < :endTime
      `;
    const res: any[] = await this.sequelizeInstance.query(sql, {
      replacements: {
        accountId: accountId,
        platformType: ORDER_PLATFORM_TYPE.DEFAULT,
        startTime: startTime.format(formatStr),
        endTime: endTime.format(formatStr),
      },
      type: QueryTypes.SELECT,
    });
    if (res && res.length === 1 && res[0].sum >= volume) {
      return { status: true, volume: res[0].sum };
    }
    return { status: false, volume: res?.length == 1 ? (res[0].sum ?? 0) : 0 };
  }

  // async getMonthTradeComplete(
  //   accountId: string,
  //   questIndex: number,
  //   nowTime: number,
  // ) {
  //   const formatStr = 'YYYY-MM-DD HH:mm:ss Z';
  //   const startTime = moment(nowTime)
  //     .utcOffset(0)
  //     .startOf('month')
  //     .subtract(0, 'hours');
  //   const endTime = moment(nowTime)
  //     .utcOffset(0)
  //     .endOf('month')
  //     .subtract(0, 'hours');
  //   const questCompleted = await this.accountGpQuestCompletedRepository.findOne(
  //     {
  //       where: {
  //         accountId: accountId,
  //         questIndex: questIndex,
  //         createdAt: {
  //           [Op.gte]: startTime.format(formatStr),
  //           [Op.lte]: endTime.format(formatStr),
  //         },
  //       },
  //     },
  //   );
  //   return questCompleted;
  // }

  @logRunDuration()
  async checkAccountReferralBonus(
    accountId: string,
    questIndex: number,
    nowTime: number,
  ) {
    this.logger.debug(
      `checkAccountReferralBonus ${accountId} ${questIndex} ${nowTime}`,
    );
    const formatStr = 'YYYY-MM-DD HH:mm:ss Z';
    const monthStr = moment(nowTime).utcOffset(0).format('DD');
    const currentStartTime = moment(nowTime).utcOffset(0).startOf('month');
    const currentEndTime = moment(nowTime).utcOffset(0).endOf('month');
    const lastStartTime = moment(nowTime)
      .subtract(1, 'months')
      .utcOffset(0)
      .startOf('month');
    const lastEndTime = moment(nowTime)
      .subtract(1, 'months')
      .utcOffset(0)
      .endOf('month');
    this.logger.debug(
      `${currentStartTime}-${currentEndTime}, ${lastStartTime}-${lastEndTime}`,
    );
    // 根据时间段计算account referral 交易金额bonus
    const calBonusGp = async (accountId, start: Moment, end: Moment) => {
      this.logger.debug(`calBonusGp ${start} ${end}`);
      const sql = `
      select sum(usd_price) from seaport_order_history inner join user_wallets on user_wallets.address::bytea = seaport_order_history.to_address
      inner join account_referral on account_referral.referral_id = user_wallets.account_id
      where account_referral.referrer_id = :accountId
        and seaport_order_history.category = 'sale'
        and seaport_order_history.service_fee_usd_price is not null
        and seaport_order_history.created_at > :startTime
        and seaport_order_history.created_at < :endTime
      `;
      const res: any[] = await this.sequelizeInstance.query(sql, {
        replacements: {
          accountId: accountId,
          platformType: ORDER_PLATFORM_TYPE.DEFAULT,
          startTime: start.format(formatStr),
          endTime: end.format(formatStr),
        },
        type: QueryTypes.SELECT,
      });
      const tradeVolume = res?.length == 1 ? (res[0].sum ?? 0) : 0;
      const rateGpUsd = await this.sdkEnvService.getNumber(
        SdkEnv.GP_EXCHANGE_GP_USD,
      );
      const exchangeFeeRate = await this.sdkEnvService.getNumber(
        SdkEnv.EXCHANGE_FEE_RATE,
      );
      const exchangeReferralRebateRate = await this.sdkEnvService.getNumber(
        SdkEnv.EXCHANGE_REFERRAL_REBATE_RATE,
      );
      const gp = new BigNumber(tradeVolume + '')
        .times(exchangeFeeRate)
        .times(exchangeReferralRebateRate)
        .dividedBy(rateGpUsd);
      this.logger.debug(
        `calBonusGp ${accountId} ${tradeVolume} ${gp.toNumber()} ${Math.floor(gp.toNumber())}`,
      );
      return Math.floor(gp.toNumber());
    };
    const currentMonthGp = await calBonusGp(
      accountId,
      currentStartTime,
      currentEndTime,
    );

    let claimFailMsg = '';
    const complete = await this.gpDao.getQuestComplete({
      accountId: accountId,
      questIndex: questIndex,
      fromStr: currentStartTime.format(formatStr),
      endStr: currentEndTime.format(formatStr),
    });
    const status = complete ? true : false;
    let lastMonthGp = 0;
    let claimable = false;
    if (monthStr < '05') {
      claimable = false;
      lastMonthGp = 0;
      claimFailMsg = 'It is currently not a valid reward claiming period';
    } else if (monthStr >= '05' && monthStr <= '15') {
      lastMonthGp = await calBonusGp(accountId, lastStartTime, lastEndTime);
      // lastMonthGp 大于 0 且 未领取
      claimable = lastMonthGp > 0 && !status ? true : false;
      if (lastMonthGp === 0) {
        claimFailMsg = 'You do not have sufficient reward balance';
      }
    } else {
      // > 15
      claimable = false;
      lastMonthGp = 0;
      claimFailMsg = 'It is currently not a valid reward claiming period';
    }
    if (status) {
      claimFailMsg = 'already complete';
    }
    return {
      ongoingBonus: currentMonthGp,
      lastMonthBonus: lastMonthGp,
      claimable: claimable,
      status: status,
      claimFailMsg: claimFailMsg,
    };
  }
}
