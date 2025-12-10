import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BiruPoint } from '@/model/entities/biru/biru-point.entity';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize';
import { BigNumber } from 'bignumber.js';
import {
  BiruMintHistoryNote,
  BiruMintHistoryType,
  BiruPointHistory,
} from '@/model/entities/biru/biru-point-history.entity';
import { ethers, Log } from 'ethers-v6';
import { ENTRYPOINT_ABI } from '@/api/v3/wallet/constants';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { BiruSeason } from '@/model/entities/biru/biru-season.entity';
import { CurrencySymbol } from '@/core/third-party-api/currency/constants';

@Injectable()
export class BiruPointDao {
  constructor(
    @InjectModel(BiruPoint)
    private biruPointRepository: typeof BiruPoint,
    @InjectModel(BiruPointHistory)
    private biruPointHistoryRepository: typeof BiruPointHistory,
    @InjectModel(BiruSeason)
    private readonly biruSeasonRepository: typeof BiruSeason,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,
    private readonly rpcHandlerService: RpcHandlerService,
  ) {
    // this.getTxAmount(
    //   1868,
    //   // '0x8cbbd8f74e9442d48140a2cfea6c2d979f004b9e321ae52750ce1ecffe684deb', // free
    //   // '0xe5420e1fdaf2ca0d0de81c1dc622ed2655a5de332451aee102b849ebf6c97111', // pay
    //   // '0xdd80608353f6c5ad9119984245570ebed47ac0103d8f74a1f5b8ecc76a4f40a8', // sa pay
    //   // '0x15c90b81666d91ae6f1229f20f2b0149649483ccfc1c30a972a83e9c6a8b8ca2', // evermoon
    //   '0x4d649e40144cc6d3a5c6cc114b3f711d05738cc4c3c027ece716f248ccd07043', // test
    // ).then((res) =>
    //   console.log('res ', res, ` ${new Date(res.timestamp * 1000)}`),
    // );
    // console.log(
    //   `hello ${moment().toDate().getTime()} ${moment('2025-02-20 00:00:00 +00:00', 'YYYY-MM-DD HH:mm:ss Z').toDate().getTime()}`,
    // );
    // '0x34a6a42bcc2fad3bee32a829aefaef8684c84ddcf9ef5188d78d5b6745d86ef1', // eoa astr pay
    // '0x85b5ff9afa319f0c3234868617488baa1fd60f9b47bf6ca95a167602779f5a4f', // sa astr pay
    // this.isAstrMint(
    //   1868,
    //   // '0x34a6a42bcc2fad3bee32a829aefaef8684c84ddcf9ef5188d78d5b6745d86ef1',
    //   // '0x85b5ff9afa319f0c3234868617488baa1fd60f9b47bf6ca95a167602779f5a4f',
    //   '0x0bedbc8590473cbe5124f8d0912a45ae366adf61acc2a9ef12fd2e77615a7c85', // eoa astr 多个
    // );
    // this.getBiruMintTxFee(
    //   1868,
    //   '0x4d649e40144cc6d3a5c6cc114b3f711d05738cc4c3c027ece716f248ccd07043',
    // );
  }

  async getWalletBiruPoint(address: string, season: string) {
    let biruPoint = await this.biruPointRepository.findOne({
      where: { address: address, season: season },
    });
    if (!biruPoint) {
      try {
        biruPoint = await this.biruPointRepository.create({
          season: season,
          address: address,
          point: 0,
          mintNum: 0,
        });
      } catch (e) {
        console.log('getWalletBiruPoint ', e.message);
        biruPoint = await this.biruPointRepository.findOne({
          where: { address: address, season: season },
        });
      }
    }
    return biruPoint;
  }

  async isPointHistoryExisted(params: { address: string; txHash: string }) {
    const obj = await this.biruPointHistoryRepository.findOne({
      where: {
        address: params.address,
        txHash: params.txHash,
      },
    });
    if (obj) {
      return true;
    }
    return false;
  }

  async parseTokensClaimedEventLog(log: Log) {
    const abi = [
      'event TokensClaimed(uint256 indexed claimConditionIndex, address indexed claimer, address indexed receiver,uint256 startTokenId,uint256 quantityClaimed)',
    ];
    const iface = new ethers.Interface(abi);
    const parsedLog = iface.parseLog(log as any);
    const data = {
      claimConditionIndex: parsedLog.args[0].toString(),
      claimer: parsedLog.args[1].toLowerCase(),
      receiver: parsedLog.args[2].toLowerCase(),
      startTokenId: parsedLog.args[3].toString(),
      quantityClaimed: parsedLog.args[4].toString(),
      tx: log.transactionHash,
      txValue: (await log.getTransaction()).value.toString(),
    };
    return data;
  }

  async createBiruPointHistory(params: {
    address: string;
    quantityClaimed: number;
    tx: string;
    txValue: string;
    note: BiruMintHistoryNote;
    isAstr: boolean;
    symbol: string;
    contractAddress: string;
    txFee: string;
    timestamp: number;
    startTokenId: string;
  }) {
    // if (
    //   moment().toDate().getTime() <=
    //   moment('2025-02-20 00:00:00 +00:00', 'YYYY-MM-DD HH:mm:ss Z')
    //     .toDate()
    //     .getTime()
    // ) {
    //   // 没到约定上线时间 skip
    //   return;
    // }
    // 调用确保biru-address-point 记录存在
    const season = await this.getBiruSeason();
    await this.getWalletBiruPoint(params.address, season.name);
    await this.sequelizeInstance.transaction(async (t) => {
      const pointObj = await this.biruPointRepository.findOne({
        where: { address: params.address, season: season.name },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      const isPay = new BigNumber(params.txValue).gt(0);
      const amount = params.isAstr && isPay ? 400 : isPay ? 200 : 10;
      await this.biruPointHistoryRepository.create(
        {
          season: 'finally',
          address: params.address,
          txHash: params.tx,
          quantityClaimed: params.quantityClaimed,
          note: params.note,
          amount: 0,
          mintType: isPay ? BiruMintHistoryType.Pay : BiruMintHistoryType.Free,
          mintPrice: params.txValue,
          symbol: params.symbol,
          contractAddress: params.contractAddress,
          txFee: params.txFee,
          claimedAt: new Date(params.timestamp * 1000),
          startTokenId: params.startTokenId,
        },
        { transaction: t },
      );
      if (params.note === BiruMintHistoryNote.Confirmed) {
        pointObj.point = pointObj.point + amount;
        pointObj.mintNum = pointObj.mintNum + 1;
        await pointObj.save({ transaction: t });
      }
    });
  }

  async confirmBiruPointHistory(history: BiruPointHistory) {
    await this.sequelizeInstance.transaction(async (t) => {
      const pointObj = await this.biruPointRepository.findOne({
        where: { address: history.address, season: history.season },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      await this.biruPointHistoryRepository.update(
        {
          note: BiruMintHistoryNote.Confirmed,
        },
        { where: { id: history.id }, transaction: t },
      );
      pointObj.point = pointObj.point + history.amount;
      pointObj.mintNum = pointObj.mintNum + 1;
      await pointObj.save({ transaction: t });
    });
  }

  async createCommunityHistory(params: {
    address: string;
    point: number;
    season: string;
  }) {
    // 调用确保biru-address-point 记录存在
    const season = await this.getBiruSeason(params.season);
    await this.getWalletBiruPoint(params.address, season.name);
    await this.sequelizeInstance.transaction(async (t) => {
      const pointObj = await this.biruPointRepository.findOne({
        where: { address: params.address, season: season.name },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      await this.biruPointHistoryRepository.create(
        {
          season: 'finally',
          address: params.address,
          txHash: '',
          quantityClaimed: 0,
          note: BiruMintHistoryNote.Confirmed,
          amount: 0,
          mintType: BiruMintHistoryType.Community,
          mintPrice: 0,
        },
        { transaction: t },
      );
      pointObj.point = pointObj.point + +params.point;
      // pointObj.mintNum = pointObj.mintNum + 1;
      await pointObj.save({ transaction: t });
    });
  }

  @RpcCall()
  async getTxAmount(
    chainId: number,
    txHash: string,
  ): Promise<{
    isAstrMint: boolean;
    amount: string;
    symbol: string;
    contractAddress: string;
    txFee: string;
    timestamp: number; // second
  }> {
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProviderV6(chainId);
    const transaction = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);

    const block = await provider.getBlock(transaction.blockNumber);
    const timestamp = block.timestamp;
    // get contract-address of minting
    let contractAddress = '';
    let txFee = await this.getBiruMintTxFee(chainId, txHash);
    if (!txFee) {
      txFee = receipt.fee.toString();
    }
    for (const log of receipt.logs) {
      try {
        // ERC-721 / ERC-1155 的标准 `Transfer` 事件
        const iface = new ethers.Interface([
          'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
          'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
        ]);
        const parsedLog = iface.parseLog(log as any);

        if (parsedLog.args.from === ethers.ZeroAddress) {
          // console.log('Minted contract address:', log.address);
          contractAddress = log.address.toLowerCase();
          break;
        }
      } catch (error) {
        continue; // 忽略非 ERC-721/1155 事件
      }
    }

    const astr = await this.checkAstrMint(chainId, txHash);
    if (astr.isAstrMint) {
      return { ...astr, contractAddress, txFee, timestamp };
    }

    try {
      const entrypoint_contractInterface = new ethers.Interface(ENTRYPOINT_ABI);
      const entrypointParsedData =
        entrypoint_contractInterface.parseTransaction({
          data: transaction.data.trim(),
        });
      // console.log('entrypointParsedData.args ', entrypointParsedData.args);
      const senderAddress = entrypointParsedData.args[0][0][0]?.toLowerCase();
      const callData = entrypointParsedData.args[0][0][3];
      const functionSignature = callData.slice(0, 10);

      const sendToAddress = '0x' + callData.slice(34, 74);
      const value = '0x' + callData.slice(74, 138);
      const decValue = BigInt(ethers.toQuantity(value));
      const ethValue = ethers.formatUnits(decValue, 18);
      // console.log(`${senderAddress} transfer ${ethValue} to ${sendToAddress}`);

      return {
        isAstrMint: false,
        amount: decValue.toString(),
        symbol: 'ETH',
        contractAddress,
        txFee,
        timestamp,
      };
    } catch (error) {
      return {
        isAstrMint: false,
        amount: transaction.value.toString(),
        symbol: 'ETH',
        contractAddress,
        txFee,
        timestamp,
      };
    }
  }

  async getBiruSeason(seasonName?: string) {
    const seasons = await this.getBiruSeasons();
    if (seasonName) {
      const season = seasons.find((e) => e.name == seasonName);
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

  async checkAstrMint(chainId: number, txHash: string) {
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProviderV6(chainId);
    const receipt = await provider.getTransactionReceipt(txHash);
    const res = { isAstrMint: false, amount: '0', symbol: CurrencySymbol.ASTR };
    if (!receipt) {
      return res;
    }

    const astAmount: bigint[] = [];
    for (const log of receipt.logs) {
      // ERC-20 Transfer 事件的标准 Topic0
      if (log.topics[0] === ethers.id('Transfer(address,address,uint256)')) {
        // 代币合约地址
        // console.log('Token Address:', log.address);

        const astrContractAddress =
          '0x2cae934a1e84f693fbb78ca5ed3b0a6893259441';
        // const astrReceiverAddress =
        //   '0x0597d2187941a2de3070f6141faaceece7bb5fe4';
        // if (log.address.toLowerCase() == astrContractAddress) {
        //   const from = '0x' + log.topics[1].slice(26); // 发送者地址
        //   const to = '0x' + log.topics[2].slice(26); // 接收者地址

        //   if (to.toLowerCase() == astrReceiverAddress) {
        //     const amount = ethers.toBigInt(log.data).toString(); // 转账金额（原始数值，未除以小数位）
        //     // console.log(`data ${BigInt(ethers.toQuantity(log.data))}`);
        //     // console.log(
        //     //   `transfer erc-20[${log.address}] from ${from} to ${to}, value ${amount}`,
        //     // );
        //     return { ...res, isAstrMint: true, amount: amount };
        //   }
        // }

        // 改成加總所有 ASTR 轉帳
        if (log.address.toLowerCase() == astrContractAddress) {
          // TODO: 會有 overflow 的問題
          const amount = BigInt(log.data);
          astAmount.push(amount);
          res.isAstrMint = true;
        }
      }
    }

    if (astAmount.length > 0) {
      const totalAmount = astAmount.reduce((acc, val) => acc + val, BigInt(0));
      res.amount = totalAmount.toString();
      res.symbol = CurrencySymbol.ASTR;
      return res;
    }

    // console.log('No ERC-20 Transfer event found in this transaction.');
    return res;
  }

  @Cacheable({ seconds: 60 })
  async getBiruSeasons() {
    const seasons = await this.biruSeasonRepository.findAll({
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

  @RpcCall()
  async getBiruMintTxFee(chainId: number, txHash: string) {
    try {
      const rpcUrl = this.rpcHandlerService.getRpcUrl(chainId);
      // 1. 獲取交易詳情
      const tx = await this.jsonRpcRequest(rpcUrl, 'eth_getTransactionByHash', [
        txHash,
      ]);
      if (!tx) {
        // console.log('找不到交易詳情');
        return;
      }

      // 2. 獲取交易收據
      const receipt = await this.jsonRpcRequest(
        rpcUrl,
        'eth_getTransactionReceipt',
        [txHash],
      );
      if (!receipt) {
        // console.log('找不到交易收據');
        return;
      }

      // 3. 計算 L2 gas fee
      const gasUsed = BigInt(receipt.gasUsed);
      const gasPrice = BigInt(tx.gasPrice);
      const l2Fee = gasUsed * gasPrice;

      // 4. 檢查是否有 L1 費用資訊
      let l1Fee = null;

      // 檢查常見的 L1 費用欄位
      if (receipt.l1Fee) {
        l1Fee = BigInt(receipt.l1Fee);
        // console.log(`L1 Fee: ${ethers.formatEther(l1Fee)} ETH 111`);
      } else if (receipt.l1DataFee) {
        l1Fee = BigInt(receipt.l1DataFee);
        // console.log(`L1 Data Fee: ${ethers.formatEther(l1Fee)} ETH`);
      } else if (receipt.l1GasUsed && receipt.l1GasPrice) {
        const l1GasUsed = BigInt(receipt.l1GasUsed);
        const l1GasPrice = BigInt(receipt.l1GasPrice);
        l1Fee = l1GasUsed * l1GasPrice;
        // console.log(`L1 Gas Used: ${l1GasUsed.toString()}`);
        // console.log(`L1 Gas Price: ${Number(l1GasPrice) / 1e9} Gwei`);
        // console.log(`計算出的 L1 Fee: ${ethers.formatEther(l1Fee)} ETH`);
      }

      // 5. 顯示總費用
      let totalFee = BigInt(0);
      if (l1Fee !== null) {
        totalFee = l1Fee + l2Fee;
        // console.log(`L1 Fee: ${ethers.formatEther(l1Fee)} ETH`);
        // console.log(`L2 Fee: ${ethers.formatEther(l2Fee)} ETH`);
        // console.log(`總費用 (L1 + L2): ${ethers.formatEther(totalFee)} ETH`);
      } else {
        totalFee = l2Fee;
        // console.log(`未找到 L1 費用信息`);
        // console.log(`總費用 (僅 L2): ${ethers.formatEther(l2Fee)} ETH`);
      }
      // console.log('totalFee ', totalFee.toString());
      return totalFee.toString();
    } catch (error) {
      console.error('getBiruMintTxFee error:', error.message);
    }
  }

  // 發送 JSON-RPC 請求的函數
  async jsonRpcRequest(rpcUrl: string, method, params = []) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });

      if (!response.ok) {
        // console.error(`HTTP 錯誤！狀態: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data.error) {
        // console.error(`RPC 錯誤: ${JSON.stringify(data.error)}`);
        return null;
      }

      return data.result;
    } catch (error) {
      // console.error(`${method} 請求出錯:`, error);
      return null;
    }
  }
}
