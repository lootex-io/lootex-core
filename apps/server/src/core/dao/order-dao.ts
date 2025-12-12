import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
  Asset,
  AssetAsEthAccount,
  Blockchain,
  Contract,
  Currency,
  SeaportOrder,
  SeaportOrderAsset,
} from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { Promise } from 'bluebird';
import { TransferAssetOwnershipOnchain } from '@/api/v3/asset/asset.interface';
import { AssetDao } from '@/core/dao/asset-dao';
import { ContractType } from '@/core/third-party-api/gateway/constants';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { ChainId } from '@/common/utils/types';
import { ethers } from 'ethers';
import { ChainIdMappingSymbol } from '@/common/libs/libs.service';
import { AssetExtraDao } from '@/core/dao/asset-extra-dao';
import { Op, QueryTypes } from 'sequelize';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import {
  ERC1155_TRANSFER_SINGLE_TOPIC0,
  Seaport_ABI,
} from '@/api/v3/order/constants';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { SERVICE_FEE_ADDRESS } from '@/common/utils';
import { CurrencyService } from '@/core/third-party-api/currency/currency.service';
import { TRANSFER_TOPIC0 } from '@/api/v3/wallet/constants';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class OrderDao {
  private readonly logger = new Logger(OrderDao.name);
  constructor(
    @InjectModel(Asset)
    private assetRepository: typeof Asset,

    @InjectModel(Currency)
    private currencyRepository: typeof Currency,

    @InjectModel(AssetAsEthAccount)
    private assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(SeaportOrderAsset)
    private seaportOrderAssetRepository: typeof SeaportOrderAsset,

    @InjectModel(SeaportOrder)
    private seaportOrderRepository: typeof SeaportOrder,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly rpcHandlerService: RpcHandlerService,
    private currencyService: CurrencyService,

    private readonly assetDao: AssetDao,
    private readonly assetExtraDao: AssetExtraDao,
    private gatewayService: GatewayService,
  ) {
    // erc721
    // this.getAddressByTxLog({
    //   chainId: 5000,
    //   txHash:
    //     '0x67a019e58d7c30edd33476957c3f9c0fa1098ea7842354fd5c8fc6d5073699f5',
    //   contractAddress: '0x85bF0746F1D8B7968E760cf2537EA638c6C335B1',
    //   tokenId: '1826',
    // }).then((res) => console.log('res ', res));
    // erc1155
    // this.getAddressByTxLog({
    //   chainId: 137,
    //   txHash:
    //     '0x2a0247a4942f96173ef9a63d2c0a7059b270201e85a9e111e0fa690a8e31e5a8',
    //   contractAddress: '0xcf501ead3ebfa60f40725fca1d82fc05bff63bf2',
    //   tokenId:
    //     '21138977214090593364943312741448760104776551154800851424798826821816790417409',
    // }).then((res) => console.log('res ', res));
  }

  //
  async calListingOrderPrice(
    chainIdStr: string,
    considerations: {
      // endAmount: string;
      // identifierOrCriteria: string;
      itemType: number;
      // recipient: string;
      startAmount: string;
      token: string;
    }[],
  ): Promise<string> {
    let amount = new BigNumber(0);
    let decimals = -1;
    await Promise.map(considerations, async (offerOrConsideration) => {
      if (
        offerOrConsideration.itemType === 0 ||
        offerOrConsideration.itemType === 1
      ) {
        amount = amount.plus(offerOrConsideration.startAmount);
        if (decimals === -1) {
          try {
            const currency = await this.currencyRepository.findOne({
              where: {
                address: offerOrConsideration.token.toLowerCase(),
              },
              include: {
                model: Blockchain,
                where: { chain_id: chainIdStr },
              },
            });
            decimals = currency.decimals;
          } catch (e) {
            throw new Error('Currency not found');
          }
        }
      }
    });
    return amount.shiftedBy(-decimals).toString();
  }

  async calListingOrderPerPrice(
    order: { offer: any[]; consideration: any[] },
    totalPrice: string,
  ) {
    let perPrice = totalPrice;
    // find nft amount
    let nftAmount = order.offer.filter((o) => o.itemType >= 2);
    if (nftAmount.length === 0) {
      nftAmount = order.consideration.filter((c) => c.itemType >= 2);
    }
    if (nftAmount.length === 0 || nftAmount.length > 1) {
      //TODO: if bundle order, cannot use partial order
      throw new HttpException(
        'partial order consideration nft amount error',
        400,
      );
    }
    perPrice = new BigNumber(totalPrice)
      .dividedBy(nftAmount[0].startAmount)
      .toString();
    this.logger.debug('order per price: ' + perPrice);
    return perPrice;
  }

  /**
   * 检测订单是否为Native/Wrap Token价格单位
   * @param chainId
   * @param considerations
   */
  async checkOrderNativeToken(
    chainId: number,
    considerations: {
      // endAmount: string;
      // identifierOrCriteria: string;
      itemType: number;
      // recipient: string;
      startAmount: string;
      token: string;
    }[],
  ) {
    const nativeSymbol = ChainIdMappingSymbol[chainId].toLowerCase();
    for (const item of considerations) {
      if (item.itemType === 0 || item.itemType === 1) {
        const currency = await this.currencyRepository.findOne({
          where: {
            address: item.token.toLowerCase(),
          },
          include: {
            model: Blockchain,
            where: { chainId: `${chainId}` },
          },
        });
        if (
          !currency ||
          currency.symbol.toLowerCase().indexOf(nativeSymbol) === -1
        ) {
          this.logger.debug(
            `checkOrderNativeToken ${currency?.symbol} ${chainId} ${item.token.toLowerCase()} `,
          );
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 給定 chainId, contractAddress, tokenId, toAddress, fromAddress 來更新 asset_as_eth_account 的 ownerAddress
   * 會從鏈上拿 ERC1155 的 balance
   * @param param
   * @returns
   */
  async transferAssetOwnershipOnchain(param: TransferAssetOwnershipOnchain) {
    this.logger.debug(
      `[transferAssetOwnership] param ${JSON.stringify(param)}`,
    );
    let asset = await this.assetRepository.findOne({
      attributes: ['id', 'contractId'],
      where: {
        chainId: param.chainId,
        tokenId: param.tokenId,
      },
      include: [
        {
          attributes: ['schemaName'],
          model: Contract,
          where: {
            address: param.contractAddress,
            chainId: param.chainId,
          },
        },
      ],
    });

    if (!asset) {
      await this.assetDao.syncAssetOnChain({
        contractAddress: param.contractAddress,
        chainId: param.chainId as any,
        tokenId: param.tokenId,
      });
      if (!asset) {
        this.logger.debug(
          `[transferAssetOwnership] asset not found ${JSON.stringify(param)}`,
        );
        return false;
      }

      asset = await this.assetRepository.findOne({
        attributes: ['id', 'contractId'],
        where: {
          chainId: param.chainId,
          tokenId: param.tokenId,
        },
        include: [
          {
            attributes: ['schemaName'],
            model: Contract,
            where: {
              address: param.contractAddress,
              chainId: param.chainId,
            },
          },
        ],
      });
    }

    if (asset.Contract.schemaName == ContractType.UNKNOWN) {
      this.logger.debug(
        `[transferAssetOwnership] asset schemaName is unknown ${JSON.stringify(
          param,
        )}`,
      );
      return false;
    }

    const assetId = asset.id;

    // ERC721
    if (asset.Contract.schemaName == ContractType.ERC721) {
      const assetAsEthAccount = await this.assetAsEthAccountRepository.findOne({
        attributes: ['id'],
        where: {
          assetId,
        },
      });

      if (assetAsEthAccount) {
        await this.assetAsEthAccountRepository.update(
          {
            ownerAddress: param.toAddress,
            contractId: asset.contractId,
          },
          {
            where: {
              id: assetAsEthAccount.id,
            },
          },
        );
      } else {
        await this.assetAsEthAccountRepository.create({
          assetId,
          ownerAddress: param.toAddress,
          quantity: '1',
          contractId: asset.contractId,
        });
      }

      return true;
    }

    // ERC1155
    if (asset.Contract.schemaName == ContractType.ERC1155) {
      const fromAddressAmount = await this.gatewayService.get1155BalanceOf(
        param.chainId,
        param.contractAddress,
        param.fromAddress,
        param.tokenId,
      );
      const toAddressAmount = await this.gatewayService.get1155BalanceOf(
        param.chainId,
        param.contractAddress,
        param.toAddress,
        param.tokenId,
      );

      const fromAssetAsEthAccount =
        await this.assetAsEthAccountRepository.findOne({
          attributes: ['id'],
          where: {
            assetId,
            ownerAddress: param.fromAddress,
          },
        });
      const toAssetAsEthAccount =
        await this.assetAsEthAccountRepository.findOne({
          attributes: ['id'],
          where: {
            assetId,
            ownerAddress: param.toAddress,
          },
        });

      if (fromAssetAsEthAccount) {
        await this.assetAsEthAccountRepository.update(
          {
            ownerAddress: param.fromAddress,
            quantity: fromAddressAmount,
            contractId: asset.contractId,
          },
          {
            where: {
              id: fromAssetAsEthAccount.id,
            },
          },
        );
      } else {
        await this.assetAsEthAccountRepository.create({
          assetId,
          ownerAddress: param.fromAddress,
          quantity: fromAddressAmount,
          contractId: asset.contractId,
        });
      }

      if (toAssetAsEthAccount) {
        await this.assetAsEthAccountRepository.update(
          {
            ownerAddress: param.toAddress,
            quantity: toAddressAmount,
            contractId: asset.contractId,
          },
          {
            where: {
              id: toAssetAsEthAccount.id,
            },
          },
        );
      } else {
        await this.assetAsEthAccountRepository.create({
          assetId,
          ownerAddress: param.toAddress,
          quantity: toAddressAmount,
          contractId: asset.contractId,
        });
      }

      return true;
    }
  }

  /**
   * detect nft related orders, disable order or not.
   * option.eventTime 发生事件时间（秒）
   */
  async disableOrderByAssets(
    assets: {
      chainId: number;
      contractAddress: string;
      tokenId: string;
      contractType: string;
    }[],
    option?: {
      nftTransfer: boolean;
      fromAddress: string;
      eventTime: number;
    },
  ) {
    for (const asset of assets) {
      const orderAssets = await this.seaportOrderAssetRepository.findAll({
        attributes: ['seaportOrderId', 'availableAmount'],
        where: {
          side: 0,
          identifierOrCriteria: asset.tokenId,
          token: ethers.utils.getAddress(asset.contractAddress),
          itemType: asset.contractType == ContractType.ERC721 ? 2 : 3,
        },
        include: [
          {
            attributes: ['offerer', 'startTime'],
            model: SeaportOrder,
            where: {
              isFillable: true,
            },
          },
        ],
      });
      for (const orderAsset of orderAssets) {
        if (asset.contractType == ContractType.ERC721) {
          if (
            option?.nftTransfer &&
            option.eventTime &&
            orderAsset.SeaportOrder.startTime < option.eventTime
          ) {
            // disable order, 直接处理，不需要判断
            await this.disableOrderById({ orderId: orderAsset.seaportOrderId });
          } else {
            // get nft's owner from blockchain
            const owner = await this.gatewayService.nativeGetOwnerOf(
              (asset.chainId + '') as ChainId,
              asset.contractAddress,
              asset.tokenId,
            );
            if (owner.toLowerCase() != orderAsset.SeaportOrder.offerer) {
              // disable order
              await this.disableOrderById({
                orderId: orderAsset.seaportOrderId,
              });
            }
          }
        } else if (asset.contractType == ContractType.ERC1155) {
          if (
            option &&
            option.eventTime &&
            option.fromAddress.toLowerCase() !=
            orderAsset.SeaportOrder.offerer &&
            orderAsset.SeaportOrder.startTime < option.eventTime
          ) {
            // do nothing
          } else {
            // get amount of offer's nft
            const amount = await this.gatewayService.nativeGetBalanceOf(
              (asset.chainId + '') as ChainId,
              asset.contractAddress,
              orderAsset.SeaportOrder.offerer,
              asset.tokenId,
            );
            try {
              if (
                ethers.BigNumber.from(amount).lt(orderAsset.availableAmount)
              ) {
                // disable order
                await this.disableOrderById({
                  orderId: orderAsset.seaportOrderId,
                });
              }
            } catch (e) {
              this.logger.debug(
                `disableOrderByAssets amount ${amount} ${orderAsset.availableAmount}`,
              );
              throw e;
            }
          }
        }
      }
    }
  }

  /**
   * set fillable false
   * @param data
   */
  async disableOrderById(data: { orderId: string }) {
    const order = await this.seaportOrderRepository.findOne({
      attributes: ['id', 'isFillable'],
      where: { id: data.orderId },
    });
    order.isFillable = false;
    await order.save();
  }

  @RpcCall({ chainIdFn: (args) => args[1] })
  async getSeaportOrderStatusOnChain(
    hash,
    chainId,
    exchangeAddress,
  ): Promise<{
    isValidated: boolean;
    isCancelled: boolean;
    totalFilled: string;
    totalSize: string;
  }> {
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProvider(chainId);

    const seaportContract = new ethers.Contract(
      exchangeAddress,
      Seaport_ABI,
      provider,
    );
    const orderStatus = await seaportContract.getOrderStatus(hash);
    // e.x.
    // [
    //   true,
    //   false,
    //   BigNumber { _hex: '0x01', _isBigNumber: true },
    //   BigNumber { _hex: '0x01', _isBigNumber: true },
    //   isValidated: true,
    //   isCancelled: false,
    //   totalFilled: BigNumber { _hex: '0x01', _isBigNumber: true },
    //   totalSize: BigNumber { _hex: '0x01', _isBigNumber: true }
    // ]
    const isValidated: boolean = orderStatus[0];
    const isCancelled: boolean = orderStatus[1];
    const totalFilled: ethers.BigNumber = orderStatus[2];
    const totalSize: ethers.BigNumber = orderStatus[3];
    // const isExpired = dbOrder.endTime < new Date().getTime() / 1000;
    // const isFillable = !(
    //   isCancelled ||
    //   isExpired ||
    //   (totalFilled.eq(totalSize) && totalFilled.gt(0))
    // );

    // await this.seaportOrderRepository.update(
    //   {
    //     isValidated: isValidated,
    //     isCancelled: isCancelled,
    //     isFillable: isFillable,
    //     isExpired: isExpired,
    //   },
    //   {
    //     where: {
    //       hash,
    //       chainId,
    //     },
    //   },
    // );

    return {
      isValidated: isValidated,
      isCancelled: isCancelled,
      totalFilled: totalFilled.toString(),
      totalSize: totalSize.toString(),
    };
  }

  /**
   * 清理系统中os的非native/ wrap native token订单
   */
  async cleanNonNativeOrders() {
    return;
  }

  async getOrderServiceFeeInfo(
    chainId: number,
    consideration: {
      token: string;
      amount: string;
      recipient: string;
      itemType: number;
    }[],
  ) {
    let serviceFeeAmount: string = null;
    let serviceFeeUsdPrice: BigNumber | null;
    let serviceFeePrice = new BigNumber(0);
    let serviceFeeToken: string;
    for (const item of consideration) {
      if (item.itemType < 2) {
        if (item.recipient?.toLowerCase() == SERVICE_FEE_ADDRESS) {
          serviceFeeAmount = item.amount.toString();
          serviceFeeToken = item.token.toLowerCase();
        }
      }
    }
    if (serviceFeeAmount) {
      const currency = await this.findCurrency({
        address: serviceFeeToken,
        chainId: chainId,
      });
      serviceFeePrice = new BigNumber(serviceFeeAmount).shiftedBy(
        -currency.decimals,
      );

      const symbolUsd = currency.symbol
        ? await this.currencyService.getSymbolPrice(
          currency.symbol.replace(/^W/i, '') + 'USD',
        )
        : null;
      const symbolUsdPrice = symbolUsd ? symbolUsd.price : 0;
      serviceFeeUsdPrice = serviceFeePrice.multipliedBy(symbolUsdPrice);
    }
    return {
      serviceFeeAmount: serviceFeeAmount,
      serviceFeeUsdPrice: serviceFeeUsdPrice,
    };
  }

  @Cacheable({ key: 'aggregator:core-dao:findCurrency', seconds: 3600 })
  async findCurrency(data: { address: string; chainId: number }) {
    const { address, chainId } = data;
    const currency = await this.currencyRepository.findOne({
      where: {
        address: address,
      },
      include: {
        model: Blockchain,
        where: { chainId: chainId },
      },
    });
    return currency;
  }

  async getAddressByTxLog(params: {
    chainId: number;
    txHash: string;
    contractAddress: string;
    tokenId: string;
  }) {
    const transactionReceipt = await this.gatewayService.getTransactionReceipt(
      params.chainId,
      params.txHash,
    );
    let toAddress = '';
    let fromAddress = '';
    for (const log of transactionReceipt.logs) {
      // handle ERC721 transfer
      if (
        log.address.toLowerCase() == params.contractAddress.toLowerCase() &&
        log.topics[0] === TRANSFER_TOPIC0 &&
        log.data == '0x' &&
        ethers.BigNumber.from(log.topics[3]).toString() === params.tokenId
      ) {
        fromAddress = '0x' + log.topics[1].slice(26);
        toAddress = '0x' + log.topics[2].slice(26);
        break;
      }
      // handle ERC1155 single transfer
      if (
        log.address.toLowerCase() == params.contractAddress.toLowerCase() &&
        log.topics[0] === ERC1155_TRANSFER_SINGLE_TOPIC0 &&
        ethers.BigNumber.from(log.data.slice(0, 66)).toString() ===
        params.tokenId
      ) {
        fromAddress = '0x' + log.topics[2].slice(26);
        toAddress = '0x' + log.topics[3].slice(26);
        break;
      }
    }
    return { fromAddress, toAddress };
  }

  async getCollectionBestListing(contractAddress: string, chainId: string) {
    // 现在seaport-order-asset表 记录有1500w了。 单纯的通过seaport-order-asset的token字段筛选seaport-order 比较慢 。 通过 asset-extra效果更好一些
    const bestCollectionListingOrderSql = `
      select so.id as id, so.per_price from asset_extra ae
        inner join collections c on ae.collection_id = c.id
        inner join seaport_order so on ae.best_listing_order_id = so.id
      where c.contract_address=:contractAddress and c.chain_id=:chainId
      order by so.per_price asc, so.platform_type asc, so.end_time asc
      limit 1;
    `;
    const bestCollectionListingOrderRes: any[] =
      await this.sequelizeInstance.query(bestCollectionListingOrderSql, {
        replacements: {
          contractAddress: contractAddress.toLowerCase(),
          chainId: chainId,
        },
        type: QueryTypes.SELECT,
      });
    if (
      bestCollectionListingOrderRes &&
      bestCollectionListingOrderRes.length > 0
    ) {
      const bestCollectionListingOrderId = bestCollectionListingOrderRes[0].id;
      this.logger.log(
        'getCollectionBestListing bestCollectionListingOrderId ',
        bestCollectionListingOrderId,
      );
      return await this.seaportOrderRepository.findOne({
        subQuery: false,
        attributes: [
          'id',
          'price',
          'perPrice',
          'startTime',
          'endTime',
          'category',
          'isFillable',
          'hash',
          'chainId',
          'exchangeAddress',
          'platformType',
        ],
        where: { id: bestCollectionListingOrderId },
        include: [
          {
            attributes: ['token'],
            model: SeaportOrderAsset,
          },
        ],
      });
    }
    return undefined;
  }
}
