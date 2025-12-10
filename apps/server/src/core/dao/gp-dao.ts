import { Inject, Injectable, Logger } from '@nestjs/common';
import { GpTxEvent } from '@/model/entities/constant-model';
import { ProviderTokens } from '@/model/providers';
import { Op, Sequelize, Transaction } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { AccountGpBalance } from '@/model/entities/gp/account-gp-balance.entitiy';
import { AccountGpBalanceHistory } from '@/model/entities/gp/account-gp-balance-history.entity';
import { BigNumber } from 'bignumber.js';
import { Account, Wallet } from '@/model/entities';
import { AccountGpQuestCompleted } from '@/model/entities/gp/account-gp-quest_completed.entity';
import { LogService } from '@/core/log/log.service';
import { GpPoolDao } from '@/core/dao/gp-pool-dao';
import { ConfigurationService } from '@/configuration';
import { ChainUtil } from '@/common/utils/chain.util';
import { BlockchainExplorer, ChainIdMap } from '@/common/libs/libs.service';
import { ChainId } from '@/common/utils/types';
import { NODE_ENV, NODE_ENV_PRODUCTION } from '@/common/utils';
import { AccountGpExpiry } from '@/model/entities/gp/account-gp-expiry.entity';
import * as moment from 'moment';

@Injectable()
export class GpDao {
  private readonly logger = new Logger(GpDao.name);

  private gpExpiryTime = 1; // 单位 day
  constructor(
    @InjectModel(Account)
    private accountRepository: typeof Account,
    @InjectModel(AccountGpBalance)
    private accountGpBalanceRepository: typeof AccountGpBalance,
    @InjectModel(AccountGpBalanceHistory)
    private accountGpBalanceHistoryRepository: typeof AccountGpBalanceHistory,
    @InjectModel(AccountGpQuestCompleted)
    private readonly accountGpQuestCompletedRepository: typeof AccountGpQuestCompleted,
    @InjectModel(AccountGpExpiry)
    private readonly accountGpExpiryRepository: typeof AccountGpExpiry,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly gpPoolDao: GpPoolDao,
    private readonly logService: LogService,
    private readonly configService: ConfigurationService,
  ) {
    this.gpExpiryTime = parseInt(
      this.configService.get<string>('GP_QUEST_EXPIRY_TIME'),
    );
    // this.testQuest();
    // this.testTopUp('colordeer', '100');
    // this.testTopUp('yoshimi', '100');
    // const usernames = [
    //   // 'jambo',
    //   'jamboooo0',
    //   'gary123456',
    //   'gary579',
    //   'erin',
    //   'yoshimi',
    //   'barbra',
    //   'icesimon',
    //   'a123',
    //   'ellenchen',
    // ];
    // for (const username of usernames) {
    //   this.testTopUp(username);
    // }
    // this.notifyTransactionHistory({
    //   chainId: 5000,
    //   txHash: 'test-hash',
    //   sender: '0xb61ba4d8a4a3043552f30f65198b1ac7a1ad203e',
    //   nonce: '177',
    //   txStatus: 1,
    // });
    // this.notifyPaymentTransactionHistory({
    //   chainId: 8453,
    //   txHash: '',
    //   txStatus: 1,
    //   sender: '0x7d878a527e86321aecd80a493e584117a907a0ab',
    //   signature:
    //     '0xdaee7ee61fb141a4296bf1cf9716697da23721ce6db2104e33fa4d93fe21f02818490d67d7237c8c194dae9ca8c17d0f6aaeec3a027dd92dee9c51ab891a4e2a1c',
    // });
    // this.createQuestHistory({
    //   accountId: '6935441d-e83d-4704-b554-8a9ebadb80d0',
    //   questIndex: 1,
    //   amount: '30',
    //   note: 'test',
    // });
    // this.alertSlackMessage({
    //   gpBalanceId: 'b88b62b0-c73a-45e4-93cc-663e557ac91a',
    //   amount: +'-1',
    //   txHash:
    //     '0x3a05069573d1b1354560504bff55d43a7adaa70f8c3b29f48b2ac030723db090',
    //   eventStr: 'Gas',
    // });
    // this.accountGpBalanceHistoryRepository
    //   .findAll({
    //     where: {
    //       chain: 8453,
    //       event: GpTxEvent.TRANSACTION,
    //       transactionSender: '0x32304d696e52f2bbf2f71426a76af8ccf7aea99c',
    //       'args.endTime': 1735116140,
    //       args: {
    //         [Op.contains]: {
    //           signatures: [
    //             '0x3caf52cfe966dee231e42b600167e24f5703a52792ab82a013a312486e403e4a24de33f776c736f7ea97cf96a993189e64be2c2ef46b1543f1b8680876c700831b',
    //             '0x419efc3ad2def4d2901636bdbef71e37be58abfdf405fbf3960589c6a571f1d94b83f9e93e3aab2716380b57a386569bc7a5cab811b5b483220d3ca03ba837581c',
    //             '0x55a303aa546d6abcd387c4919586fccee3cda5efa6ae9abce21aaa4e6950f63037d0555e82cba9ac66a968579ace5646b66b0977326100e027f82817b17d080c1c',
    //           ],
    //         },
    //       },
    //     },
    //   })
    //   .then((res) => console.log('items ', res.length));
  }

  async testQuest() {
    await this.createHistory({
      chainId: -1,
      accountId: '7de77d93-5a2f-4cc7-afb4-b88d0f7b9d3c',
      amount: '100',
      event: GpTxEvent.QUEST,
      gasFee: '0.2222',
      note: 'Quest 1.',
    });
  }

  async testTopUp(username: string, amount: string = '100') {
    const account = await this.accountRepository.findOne({
      where: { username: username },
    });
    await this.createHistory({
      chainId: -1,
      accountId: account.id,
      amount: amount,
      event: GpTxEvent.TOP_UP,
      gasFee: '',
      note: 'Top Up',
    });
  }

  async createTopUpHistory(data: {
    address: string;
    amount: string;
    chainId: number;
    lootAmount: string;
    txHash: string;
  }) {
    const { address, amount, chainId, txHash } = data;
    const account = await this.accountRepository.findOne({
      include: [
        {
          model: Wallet,
          where: {
            address: address.toLowerCase(),
          },
        },
      ],
    });
    if (!account) {
      this.logger.log(
        `topUp cannot find account by wallet ${address}, skip it.`,
      );
      return;
    }
    this.logger.debug(`topUp account ${account.username}`);
    const history = await this.accountGpBalanceHistoryRepository.findOne({
      where: { txHash: txHash, chain: chainId, event: GpTxEvent.TOP_UP },
    });
    if (history) {
      this.logger.log(`topUp gp balance history has already exists, skip it.`);
      return;
    }

    await this.createHistory({
      chainId: chainId,
      accountId: account.id,
      amount: amount,
      event: GpTxEvent.TOP_UP,
      gasFee: '',
      note: 'LT1236',
      txHash: txHash,
    });
    this.logService.common('gp-in', { amount: amount });

    // check topup amount and alert to slack
    if (
      parseInt(amount) >= this.configService.get<number>('GP_POOL_VALUE_TOP_UP')
    ) {
      const txLink = `${BlockchainExplorer[ChainIdMap[chainId.toString() as ChainId]]}/tx/${txHash}`;
      let accountLink = '';
      if (this.configService.get<string>(NODE_ENV) === NODE_ENV_PRODUCTION) {
        accountLink = `https://lootex.io/profiles/${account.username}`;
      } else {
        accountLink = `https://preview.lootex.dev/profiles/${account.username}`;
      }

      const message = [
        `*GP Top up* :alert:`,
        `Message: Wallet *${address}* deposit *${amount}* GP (${data.lootAmount} Loot token) by [${account.username}](${accountLink}) on chain *${ChainUtil.chainIdToChain(chainId)}*`,
        `TxHash: [${txHash}](${txLink})`,
        `Time: ${new Date()}`,
      ].join('\n');
    }
  }

  /**
   * 更新 TRANSACTION 状态
   * @param data
   */
  async notifyTransactionHistory(data: {
    chainId: number;
    txHash: string;
    sender: string;
    nonce: string;
    txStatus: number;
  }) {
    this.logger.log(`notifyTransaction ${JSON.stringify(data)}`);
    const { chainId, txHash, sender, nonce, txStatus } = data;
    const history = await this.accountGpBalanceHistoryRepository.findOne({
      where: {
        chain: chainId,
        event: GpTxEvent.TRANSACTION,
        transactionSender: sender,
        transactionNonce: nonce,
        txStatus: null,
      },
      order: [['createdAt', 'ASC']],
    });
    if (!history) {
      this.logger.log(
        `notifyTransaction history not found by ${JSON.stringify(data)}`,
      );
      return;
    }
    if (history && history.txHash != null && history.txHash.length > 0) {
      this.logger.log(
        `notifyTransaction history has already been updated, skip it.`,
      );
      return;
    }
    await this._notifyTransactionHistory({
      txHash: txHash,
      txStatus: txStatus,
      history: history,
    });
    if (
      Math.abs(history.amount) >
      this.configService.get<number>('GP_ACCOUNT_CONSUME_ALERT')
    ) {
      null;
    }
  }

  /**
   * 更新 GP 代付NFT交易状态
   * @param data
   */
  async notifyPaymentTransactionHistory(data: {
    chainId: number;
    txHash: string;
    sender: string;
    gpAmount: number;
    endTime: number;
    txStatus: number;
    signatures: string[];
  }) {
    const { chainId, txHash, sender, endTime, txStatus } = data;
    const history = await this.accountGpBalanceHistoryRepository.findOne({
      where: {
        chain: chainId,
        event: GpTxEvent.TRANSACTION,
        transactionSender: sender.toLowerCase(),
        'args.endTime': endTime,
        txStatus: null,
        args: {
          [Op.contains]: {
            signatures: data.signatures,
          },
        },
      },
    });
    console.log(history);
    if (!history) {
      this.logger.log(
        `notifyPaymentTransactionHistory history not found by ${JSON.stringify(data)}`,
      );
      return;
    }
    if (history && history.txHash != null && history.txHash.length > 0) {
      this.logger.log(
        `notifyPaymentTransactionHistory history has already been updated, skip it.`,
      );
      return;
    }

    await this._notifyTransactionHistory({
      txHash: txHash,
      txStatus: txStatus,
      history: history,
    });
    if (
      Math.abs(history.amount) >
      this.configService.get<number>('GP_ACCOUNT_CONSUME_ALERT')
    ) {
      this.alertSlackMessage({
        gpBalanceId: history.gpBalanceId,
        amount: history.amount,
        txHash: txHash,
        eventStr: 'Purchase',
      });
    }
  }

  async notifyRefundPaymentTransactionHistory(
    history: AccountGpBalanceHistory,
  ) {
    await this._notifyTransactionHistory({
      txStatus: -1,
      history: history,
      txHash: '',
      note: 'GP Refunded',
    });
  }

  /**
   * 移除过期的 expiry log
   */
  async notifyDeleteGpExpiry(gpExpiry: AccountGpExpiry) {
    const history = await this.accountGpBalanceHistoryRepository.findOne({
      where: { id: gpExpiry.historyId },
    });

    await this.sequelizeInstance.transaction(async (t) => {
      const balanceObj = await this.accountGpBalanceRepository.findOne({
        where: { id: history.gpBalanceId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      const balanceJson = balanceObj.toJSON();
      // quest gp expiry, gp 作废
      const gpAmount = +gpExpiry.amount;
      // totalBalance, availableBalance 扣除 gp
      balanceObj.totalBalance = new BigNumber(balanceObj.totalBalance)
        .minus(new BigNumber(gpAmount))
        .toString();
      balanceObj.availableBalance = new BigNumber(balanceObj.availableBalance)
        .minus(new BigNumber(gpAmount))
        .toString();
      await balanceObj.save({ transaction: t });
      // create a new quest history, note ""
      const values = {
        gpBalanceId: history.gpBalanceId,
        chain: history.chain,
        event: history.event,
        args: { lastBalance: balanceJson },
        amount: -gpAmount,
        note: 'GP Expired',
      };
      await this.accountGpBalanceHistoryRepository.create(values, {
        transaction: t,
      });
      // update note of the quest history
      await this.accountGpBalanceHistoryRepository.update(
        { note: 'Expired' },
        {
          where: { id: history.id },
          transaction: t,
        },
      );
      // update gp expiry log
      await this.accountGpExpiryRepository.update(
        { deleted: true, amount: 0 },
        {
          where: { id: gpExpiry.id },
          transaction: t,
        },
      );
    });
  }

  async alertSlackMessage(data: {
    gpBalanceId: string;
    amount: number;
    txHash: string;
    eventStr: string;
  }) {
    try {
      const account = await this.accountGpBalanceRepository.findOne({
        where: { id: data.gpBalanceId },
        include: [{ model: Account }],
      });

      const message = [
        `*GP Payment ${data.eventStr} Transaction * :alert:`,
        `Message: *${account.Account.username}* cost *${Math.abs(data.amount)}* GP.`,
        `TxHash: ${data.txHash}`,
        `Time: ${new Date()}`,
      ].join('\n');
    } catch (e) {
      this.logger.error(`Error sending GP purchase alert: ${e.message}`);
    }
  }

  async _notifyTransactionHistory(params: {
    txStatus: number;
    txHash: string;
    history: AccountGpBalanceHistory;
    note?: string;
  }) {
    const { txStatus, txHash, history, note } = params;
    await this.sequelizeInstance.transaction(async (t) => {
      const balanceObj = await this.accountGpBalanceRepository.findOne({
        where: { id: history.gpBalanceId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (txStatus === 1) {
        // success
        balanceObj.totalBalance = new BigNumber(balanceObj.totalBalance)
          .plus(new BigNumber(history.amount))
          .toString();
        balanceObj.frozenBalance = new BigNumber(balanceObj.frozenBalance)
          .plus(new BigNumber(history.amount))
          .toString();
      } else {
        let historyAmount = history.amount; // amount 小于 0
        // 如果有expiryItems，需要 恢复相应的 gp expiry 记录
        if (history.args?.expiryItems && history.args.expiryItems.length > 0) {
          for (const item of history.args.expiryItems) {
            const gpExpiry = await this.accountGpExpiryRepository.findOne({
              where: { id: item.expiryId },
            });
            if (new Date().getTime() < gpExpiry.expiryTime.getTime()) {
              // 如果还未过期，重新 active gp expiry 记录
              gpExpiry.amount = +item.amount + +gpExpiry.amount;
              gpExpiry.deleted = false;
              await gpExpiry.save({ transaction: t });
            } else {
              // 已过期，不返还账户item.amount gp，需要修改amount (注意：amount是小于0的，item.amount 是大于0的)
              historyAmount = +historyAmount + +item.amount;
              // if (!gpExpiry.deleted) {
              //   gpExpiry.deleted = true;
              //   await gpExpiry.save({ transaction: t });
              // }
            }

            // gpExpiry.amount = +item.amount + +gpExpiry.amount;
            // gpExpiry.deleted = false;
            // await gpExpiry.save({ transaction: t });
          }
        }

        // fail, gp退返sender账户
        balanceObj.availableBalance = new BigNumber(balanceObj.availableBalance)
          .minus(new BigNumber(historyAmount))
          .toString();
        balanceObj.frozenBalance = new BigNumber(balanceObj.frozenBalance)
          .plus(new BigNumber(historyAmount))
          .toString();
      }
      await balanceObj.save({ transaction: t });
      await this.accountGpBalanceHistoryRepository.update(
        { txHash: txHash, txStatus: txStatus, note: note ?? txHash },
        { where: { id: history.id }, transaction: t },
      );
    });
  }

  /**
   * GP 代付gas 记录
   * @param data
   */
  createTransactionHistory(data: {
    chainId: number;
    accountId: string;
    amount: string;
    event: GpTxEvent;
    gasFee: string;
    transactionSender: string;
    transactionNonce: string;
  }) {
    return this.createHistory({ ...data, note: '' });
  }

  /**
   * GP 代付NFT 记录
   * @param data
   */
  createPaymentTransactionHistory(data: {
    chainId: number;
    accountId: string;
    amount: string;
    transactionSender: string;
    note?: string;
    args: {
      signatures: string[] | string;
      endTime: number;
      consumeGp: number;
      fromBlockNumber: number;
    };
  }) {
    return this.createHistory({
      ...data,
      event: GpTxEvent.TRANSACTION,
      gasFee: '',
      transactionNonce: '',
      note: data.note ?? 'GP pay',
    });
  }

  /**
   * questTime: quest 任务领取时间戳，单位毫秒
   * @param data
   */
  async createQuestHistory(data: {
    accountId: string;
    questIndex: number;
    amount: string;
    note: string;
    questTime?: number;
    args?: any;
    transactionCallback?: (t: Transaction) => Promise<void>;
  }) {
    return this.createHistory({
      ...data,
      chainId: -1,
      event: GpTxEvent.QUEST,
      gasFee: '',
      args: data.args,
      transactionCallback: data.transactionCallback,
    });
  }

  async createHistory(data: {
    chainId: number;
    accountId: string;
    amount: string;
    event: GpTxEvent;
    gasFee: string;
    note: string;
    txHash?: string;
    questIndex?: number;
    transactionSender?: string;
    transactionNonce?: string;
    questTime?: number;
    args?: any;
    transactionCallback?: (t: Transaction) => Promise<void>;
  }) {
    console.log('data ', data);
    const {
      chainId,
      accountId,
      amount,
      event,
      gasFee,
      note,
      txHash = '',
      questIndex = -1,
      transactionSender = '',
      transactionNonce = '',
      args = null,
    } = data;
    try {
      await this.sequelizeInstance.transaction(async (t) => {
        let balanceObj = await this.accountGpBalanceRepository.findOne({
          where: { accountId: accountId },
          transaction: t,
        });
        const balanceJson = balanceObj.toJSON();
        if (!balanceObj) {
          // throw Error(`Can not found GpBalance object from account ${accountId}`);
          balanceObj = await this.accountGpBalanceRepository.create(
            {
              accountId: accountId,
            },
            { transaction: t },
          );
        }
        balanceObj = await this.accountGpBalanceRepository.findOne({
          where: { id: balanceObj.id },
          lock: t.LOCK.UPDATE,
          transaction: t,
        });
        if (event === GpTxEvent.TRANSACTION) {
          if (
            new BigNumber(balanceObj.availableBalance)
              .plus(new BigNumber(amount))
              .lt(0)
          ) {
            throw Error('Insufficient balance.');
          }
          balanceObj.availableBalance = new BigNumber(
            balanceObj.availableBalance,
          )
            .plus(new BigNumber(amount))
            .toString();
          balanceObj.frozenBalance = new BigNumber(balanceObj.frozenBalance)
            .minus(new BigNumber(amount))
            .toString();
        } else if (event === GpTxEvent.TOP_UP) {
          balanceObj.totalBalance = new BigNumber(balanceObj.totalBalance)
            .plus(new BigNumber(amount))
            .toString();
          balanceObj.availableBalance = new BigNumber(
            balanceObj.availableBalance,
          )
            .plus(new BigNumber(amount))
            .toString();
        } else if (event === GpTxEvent.QUEST) {
          balanceObj.totalBalance = new BigNumber(balanceObj.totalBalance)
            .plus(new BigNumber(amount))
            .toString();
          balanceObj.availableBalance = new BigNumber(
            balanceObj.availableBalance,
          )
            .plus(new BigNumber(amount))
            .toString();
          await this.accountGpQuestCompletedRepository.create(
            {
              accountId: accountId,
              questIndex: questIndex,
              createdAt: data.questTime
                ? new Date(data.questTime).toISOString()
                : new Date().toISOString(),
              args: args,
            },
            { transaction: t },
          );
          await this.gpPoolDao.createQuestHistory(
            accountId,
            {
              point: -amount,
              title: note,
            },
            { t: t },
          );
        }

        await balanceObj.save({ transaction: t });

        const history = await this.accountGpBalanceHistoryRepository.create(
          {
            gpBalanceId: balanceObj.id,
            chain: chainId,
            event: event,
            amount: amount,
            gasFee: gasFee,
            note: note,
            txHash: txHash,
            transactionSender: transactionSender,
            transactionNonce: transactionNonce,
            args: { ...args, balanceJson: balanceJson },
          },
          { transaction: t },
        );
        if (data.transactionCallback) {
          await data.transactionCallback(t);
        }
        if (event === GpTxEvent.QUEST) {
          // gp 过期时间 gpExpiryTime天最后一秒
          const expiryTime = moment()
            .add(this.gpExpiryTime, 'days')
            .endOf('day')
            .toDate();
          // // 临时调整 10分钟后，方便测试
          // const expiryTime = new Date(new Date().getTime() + 10 * 60 * 1000);
          await this.accountGpExpiryRepository.create({
            accountId,
            gpBalanceId: history.gpBalanceId,
            historyId: history.id,
            amount: amount,
            initialAmount: amount,
            expiryTime: expiryTime,
          });
        } else if (event === GpTxEvent.TRANSACTION) {
          const amountGp = Math.abs(history.amount);
          const historyArgs = history.args ?? {};
          // TRANSACTION 消费时，查询相应的gp expiry 记录，并相应扣除
          const expiryLogs = await this.accountGpExpiryRepository.findAll({
            where: {
              gpBalanceId: history.gpBalanceId,
              deleted: false,
              // expiryTime: {
              //   [Op.gt]: new Date(),
              // },
            },
            order: [
              ['expiryTime', 'asc'],
              ['createdAt', 'asc'],
            ],
          });
          const expiryItems: { expiryId: string; amount: number }[] = [];
          let leftAmount = amountGp;
          for (const log of expiryLogs) {
            if (leftAmount > 0) {
              if (leftAmount >= log.amount) {
                expiryItems.push({ expiryId: log.id, amount: log.amount });
                leftAmount = leftAmount - log.amount;

                log.deleted = true;
                log.amount = 0;
                await log.save({ transaction: t });
              } else {
                expiryItems.push({ expiryId: log.id, amount: leftAmount });
                log.amount = log.amount - leftAmount;
                await log.save({ transaction: t });
                break;
              }
            }
          }
          // 把相关gp expiry 记录添加到history的args中
          if (expiryItems.length > 0) {
            history.args = { ...historyArgs, expiryItems: expiryItems };
            await history.save({ transaction: t });
          }
        }
        return history;
      });
    } catch (e) {
      console.log('createHistory error ', e);
      return false;
    }
    return true;
  }

  async getQuestComplete(data: {
    accountId: string;
    questIndex: number | number[];
    fromStr?: string;
    endStr?: string;
  }) {
    const { accountId, questIndex, fromStr, endStr } = data;
    let where: any = {
      accountId: accountId,
      questIndex: questIndex,
    };
    if (fromStr && endStr) {
      where = {
        ...where,
        createdAt: {
          [Op.gte]: fromStr,
          [Op.lte]: endStr,
        },
      };
    }
    const questCompleted = await this.accountGpQuestCompletedRepository.findOne(
      {
        where: where,
      },
    );
    return questCompleted;
  }
}
