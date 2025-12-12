import { BigNumber } from 'bignumber.js';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  ContractCallContext,
  ContractCallResults,
  Multicall,
} from 'ethereum-multicall';
import { ContractType } from '../gateway/constants';
import {
  ARWEAVE_GATEWAY,
  ERC1155_ABI,
  ERC20_ABI,
  ERC721_ABI,
  HTTP_FETCH_BATCH,
  IPFS_GATEWAY,
  IPFS_GATEWAYS,
  ONNERSHIP_ABI,
  STUDIO_CONTRACT_ABI,
  SupportedMethod,
} from './constants';
import {
  ContractOwner,
  ProxyContractRequest,
  RpcContractInfo,
  RpcEnd,
  RpcTokenInfo,
  TokenOwner,
  TokenUri,
} from './interfaces';
import { RpcQueryChain } from '@/common/libs/libs.service';
import { ConfigurationService } from '@/configuration';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { ChainUtil } from '@/common/utils/chain.util';
import { ethers } from 'ethers';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import { LOG_TYPE, LogService } from '@/core/log/log.service';
import { ERC1271ABI } from '@/external/smart-contracts/eth/erc1271';
import { ChainId } from '@/common/utils/types';
import { SONEIUM_CONTRACT_ADDRESS } from '@/common/utils';
import {
  Nft,
  NftsResp,
  TokenAmountQuery,
} from '@/core/third-party-api/gateway/gateway.interface';

ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR); // turn off warnings

@Injectable()
export class RpcService {
  protected readonly logger = new Logger(RpcService.name);
  public rpcEnd: RpcEnd = RpcEnd.default;
  constructor(
    private readonly configService: ConfigurationService,
    private readonly rpcHandlerService: RpcHandlerService,
    private readonly httpService: HttpService,
    private readonly logService: LogService,
  ) {
    // this.getNftByTokenIdByContract(
    //   RpcQueryChain.SONEIUM,
    //   '0xa6694ff60281544c50d5c1417279edbdbea5c775',
    //   '2',
    // );
  }

  getMulticall(chainId: number): Multicall {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    let multiConfig: any = {
      ethersProvider: provider,
      tryAggregate: true,
    };
    if (chainId === ChainUtil.rpcChainToChainId(RpcQueryChain.SONEIUM)) {
      multiConfig = {
        ...multiConfig,
        multicallCustomContractAddress: SONEIUM_CONTRACT_ADDRESS,
      };
    } else if (
      chainId === ChainUtil.rpcChainToChainId(RpcQueryChain.SONEIUM_MINATO)
    ) {
      multiConfig = {
        ...multiConfig,
        multicallCustomContractAddress: SONEIUM_CONTRACT_ADDRESS,
      };
    }
    const call = new Multicall(multiConfig);
    return call;
  }

  @RpcCall({ chainIdFn: (args) => ChainUtil.rpcChainToChainId(args[0]) })
  async get(chain: RpcQueryChain, reqs: ProxyContractRequest[]) {
    const chainId: number = ChainUtil.rpcChainToChainId(chain);
    const multicall = this.getMulticall(chainId);
    const contractCallContext: ContractCallContext[] = [];

    for (const req of reqs) {
      const contractAddress = req.contractAddress;
      const callData = req.callData;
      const context = req.context;

      if (contractAddress.length == 0 || callData.length == 0) continue;

      const calls = [];
      for (const data of callData) {
        calls.push({
          reference: contractAddress,
          methodName: data.method,
          methodParameters: data.param,
        });
      }

      contractCallContext.push({
        reference: contractAddress,
        contractAddress: contractAddress,
        abi: [...ERC1155_ABI, ...ERC721_ABI, ...ONNERSHIP_ABI],
        calls: calls,
        context: context,
      });
    }

    const results: ContractCallResults =
      await multicall.call(contractCallContext);

    const ret = [];
    for (const req of reqs) {
      if (results.results[req.contractAddress]) {
        ret.push({
          value: results.results[req.contractAddress].callsReturnContext,
          context:
            results.results[req.contractAddress].originalContractCallContext
              .context,
        });
      }
    }

    return ret;
  }

  @logRunDuration(new Logger(RpcService.name))
  async getNftsByTokenIdsByContract(
    chain: RpcQueryChain,
    contractAddress: string,
    tokenIds: string[],
  ) {
    this._logRpc('getNftsByTokenIdsByContract', chain);
    // no used. metadata task
    const cMap = await this._getContractInfos(chain, [contractAddress]);

    const callDatas = tokenIds.map((tokenId) => {
      if (cMap.get(contractAddress).contractType === ContractType.ERC721) {
        return this.TokenUri(tokenId);
      }
      if (cMap.get(contractAddress).contractType === ContractType.ERC1155) {
        return this.Uri(tokenId);
      }
    });

    const res = await this.get(chain, [
      {
        contractAddress: contractAddress,
        callData: callDatas,
        context: {},
      },
    ]);

    const ret: RpcTokenInfo[] = res[0].value.map((item) => {
      return {
        tokenId: item.methodParameters[0],
        tokenUri: item.returnValues[0],
        ownerAddress: null,
        contract: cMap.get(contractAddress),
        totalAmount: null,
      };
    });

    return await this.getReturnData(ret);
  }

  // @logRunDuration(new Logger(RpcService.name))
  async getNftByTokenIdByContract(
    chain: RpcQueryChain,
    contractAddress: string,
    tokenId: string,
  ): Promise<Nft> {
    this.logService.log(LOG_TYPE.RPC_SERVICE, 'getNftByTokenIdByContract', {
      contractAddress,
      chain,
      tokenId,
    });
    this._logRpc('getNftByTokenIdByContract', chain);
    // special case
    if (
      contractAddress == '0x06012c8cf97bead5deae237070f9587f8e7a266d' &&
      chain == RpcQueryChain.ETH
    ) {
      // Cryptokitties
      const ownerAddress =
        (
          await this.get(chain, [
            {
              contractAddress: contractAddress,
              callData: [this.ownerOf(tokenId)],
              context: {},
            },
          ])
        )[0]?.value[0]?.returnValues[0] ||
        '0x0000000000000000000000000000000000000000';

      const nft: Nft = {
        tokenId: tokenId,
        contract: {
          contractAddress: contractAddress,
          name: 'CryptoKitties',
          symbol: 'CK',
          contractType: ContractType.ERC721,
        },
        owner: {
          ownerAddress,
          amount: '1',
        },
        metadata: await this.getCryptoKittiesMetadata(tokenId),
        // https://eips.ethereum.org/EIPS/eip-1155#metadata
        tokenUri: `https://api.cryptokitties.co/kitties/${tokenId}`,
        isSpam: false,
      };

      return nft;
    }

    const cMap = await this._getContractInfos(chain, [contractAddress]);
    const callData = [];
    if (cMap.get(contractAddress).contractType === ContractType.ERC721) {
      callData.push(this.TokenUri(tokenId));
      callData.push(this.ownerOf(tokenId));
    }
    if (cMap.get(contractAddress).contractType === ContractType.ERC1155) {
      callData.push(this.Uri(tokenId));
    }

    const res = await this.get(chain, [
      {
        contractAddress: contractAddress,
        callData: callData,
        context: {},
      },
    ]);

    if (res[0].value[0].success === false) {
      this.logger.log(
        `getNftByTokenIdByContract ${contractAddress}#${tokenId} not found`,
      );
      return;
    }
    const ret: RpcTokenInfo = {
      tokenId: res[0].value[0].methodParameters[0],
      tokenUri: res[0].value[0].returnValues[0],
      ownerAddress: res[0].value[1]?.returnValues[0] || null,
      contract: cMap.get(contractAddress),
      amount: '1',
    };

    const nft = this.normalize(ret);
    if (nft.tokenUri == '') {
      nft.metadata = '';
    } else {
      // this.logger.debug(`ret ${JSON.stringify(ret)}`);
      try {
        nft.metadata = (await this.getMetadata(nft.tokenUri)) as any;
      } catch (e) {
        nft.metadata = '';
      }
    }
    return nft;
  }

  @logRunDuration(new Logger(RpcService.name))
  async getNftsByOwnerByContract(
    chain: RpcQueryChain,
    contractAddress: string,
    ownerAddress: string,
  ): Promise<NftsResp> {
    this.logService.log(LOG_TYPE.RPC_SERVICE, 'getNftsByOwnerByContract', {
      contractAddress,
      chain,
      ownerAddress,
    });

    const contractTypes = await this.getContractInfo(chain, [contractAddress]);
    if (contractTypes[0].contractType === ContractType.ERC1155) {
      this.logger.warn(`${contractAddress} type is ${contractTypes[0]}`);
      return;
    }

    // only for erc721
    const req = [
      {
        contractAddress: contractAddress,
        ownerAddress: ownerAddress,
      },
    ];
    const resp = await this._getTokenInfo(chain, req);

    return await this.getReturnData(resp);
  }

  async _getBalanceOf(chain: RpcQueryChain, reqs: TokenUri[]) {
    // this.logger.debug(`getBalanceOf ${chain} ${JSON.stringify(reqs)}`);
    this._logRpc('_getBalanceOf', chain);

    const contracts = reqs.map((r) => r.contractAddress);

    const cMap = await this._getContractInfos(chain, contracts);

    const proxyContractReqs: ProxyContractRequest[] = [];
    for (const req of reqs) {
      const contractAddress = req.contractAddress;
      const ownerAddress = req.ownerAddress;

      const contractType = cMap.get(contractAddress).contractType;
      if (contractType === ContractType.ERC1155) {
        this.logger.warn(`${contractAddress} type: ${contractType}`);
        continue;
      }

      proxyContractReqs.push({
        contractAddress: contractAddress,
        callData: [this.balanceOfByTokenId(ownerAddress)],
        context: {},
      });
    }

    const res = await this.get(chain, proxyContractReqs);

    const ret = [];
    for (const item of res) {
      const values = item.value;

      for (const v of values) {
        const retContractAddress = v.reference;
        const retOwnerAddress = v.methodParameters[0];
        const balance = parseInt(v.returnValues[0].hex, 16);
        const contractInfo = cMap.get(retContractAddress);

        ret.push({
          contract: contractInfo,
          ownerAddress: retOwnerAddress,
          balance: balance,
        });
      }
    }

    return ret;
  }

  async _getTokenId(chain: RpcQueryChain, req: TokenUri[]) {
    // this.logger.debug('_getTokenId');
    this._logRpc('_getTokenId', chain);

    const contracts = req.map((r) => r.contractAddress);

    const cMap = await this._getContractInfos(chain, contracts);

    let ret = await this._getBalanceOf(chain, req);

    // step 2
    const reqs = [];
    for (const item of ret) {
      const contractAddress = item.contract.contractAddress;
      const ownerAddress = item.ownerAddress;
      const balance = item.balance;

      const callDatas = [];

      for (let i = 0; i < balance; ++i) {
        callDatas.push(this.TokenOfOwnerByIndex(ownerAddress, i));
      }

      reqs.push({
        contractAddress: contractAddress,
        callData: callDatas,
        context: {
          ownerAddress: ownerAddress,
        },
      });
    }

    const res = await this.get(chain, reqs);

    ret = [];
    for (const item of res) {
      const values = item.value;
      for (const v of values) {
        const retContractAddress = v.reference;
        const retOwnerAddress = v.methodParameters[0];
        const retTokenId = parseInt(v.returnValues[0].hex, 16);
        const contractInfo = cMap.get(retContractAddress);

        ret.push({
          contract: contractInfo,
          ownerAddress: retOwnerAddress,
          tokenId: retTokenId,
          tokenUri: '',
          amount: '1',
        });
      }
    }

    return ret;
  }

  async _getTokenInfo(chain: RpcQueryChain, req: TokenUri[]) {
    // this.logger.debug('getTokenInfo');
    this._logRpc('_getTokenInfo', chain);

    const contracts = req.map((r) => r.contractAddress);

    const cMap = await this._getContractInfos(chain, contracts);

    const tokenIds = await this._getTokenId(chain, req);

    // tokenURI() part
    // contractAddress -> TokenUri[]
    const reqMap = new Map();
    const reqs = [];

    for (const token of tokenIds) {
      const contractAddress = token.contract.contractAddress;
      const ownerAddress = token.ownerAddress;
      const tokenId = token.tokenId;

      let callDatas = reqMap.get(contractAddress);
      if (!callDatas) {
        reqMap.set(contractAddress, []);
        callDatas = reqMap.get(contractAddress);
      }
      callDatas.push(this.TokenUri(tokenId));

      reqMap.set(contractAddress, callDatas);
      reqs.push({
        contractAddress: contractAddress,
        callData: callDatas,
        context: {
          ownerAddress: ownerAddress,
        },
      });
    }

    const res = await this.get(chain, reqs);

    const ret = [];
    for (const token of res) {
      const values = token.value;
      const context = token.context;

      for (const v of values) {
        const retContractAddress = v.reference;
        const retTokenId = v.methodParameters[0];
        const retTokenUri = v.returnValues[0];
        const contractInfo = cMap.get(retContractAddress);

        ret.push({
          contract: contractInfo,
          tokenUri: retTokenUri,
          tokenId: retTokenId,
          ownerAddress: context.ownerAddress,
          metadata: '',
          amount: '1',
        });
      }
    }

    return ret;
  }

  @logRunDuration(new Logger(RpcService.name))
  @Cacheable({ key: 'getContractOwner', seconds: 5 * 60 })
  async getContractOwner(
    chain: RpcQueryChain,
    contractAddresses: string[],
  ): Promise<ContractOwner[]> {
    this.logService.log(LOG_TYPE.RPC_SERVICE, 'getContractOwner', {
      contractAddresses,
      chain,
    });
    this._logRpc('getContractOwner', chain);

    const reqs = [];

    for (const contractAddress of contractAddresses) {
      reqs.push({
        contractAddress: contractAddress,
        callData: [this.owner()],
      });
    }

    const res = await this.get(chain, reqs);

    const ret = [];
    for (const item of res) {
      const values = item.value;

      let owner = '';
      let contractAddress = '';

      for (const value of values) {
        if (value.methodName == 'owner' && value.success == true) {
          owner = value.returnValues[0];
        } else {
          // if contract did not implement owner(), we will never know who is contract owner
          // therefore we assign lootex admin address as this contract owner
          const env = `LOOTEX_ADMIN_ADDRESS_${chain}`;
          const admin = this.configService.get(env);
          owner = admin;
        }
        contractAddress = value.reference;
      }

      ret.push({
        ownerAddress: owner,
        contractAddress: contractAddress,
      });
    }

    return ret;
  }

  async _getContractInfos(chain: RpcQueryChain, contractAddresses: string[]) {
    // this.logger.debug('getContractInfos');

    // todo: use cache
    const contractTypes = await this.getContractInfo(chain, contractAddresses);
    const cMap = new Map();
    for (const contractType of contractTypes) {
      cMap.set(contractType.contractAddress, contractType);
    }

    return cMap;
  }

  /**
   * reqs should not have two different owner address.
   * @param chainId
   * @param reqs
   */
  @logRunDuration(new Logger(RpcService.name))
  async getTokenAmount(chain: RpcQueryChain, reqs: TokenAmountQuery[]) {
    // no used
    // this.logger.debug('getTokenAmount');
    const dest = [];
    // contract => tokenIds map
    const ctMap = new Map();
    let owner = '';
    reqs.forEach((query) => {
      const { contractAddress, ownerAddress, tokenId } = query;
      // one owner only per request
      if (!owner) {
        owner = ownerAddress;
      } else {
        if (owner !== ownerAddress)
          throw new Error(`only one owner address allowed`);
      }
      let tokenIds = ctMap.get(contractAddress);
      if (!tokenIds) tokenIds = [];
      tokenIds.push(tokenId);
      ctMap.set(contractAddress, tokenIds);
    });

    for (const kv of ctMap.entries()) {
      dest.push({
        contractAddress: kv[0],
        tokenIds: kv[1],
      });
    }
    const res = await this.getTokenOwner(chain, {
      ownerAddress: owner,
      dest: dest,
    });

    return this.getReturnData(res);
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => ChainUtil.rpcChainToChainId(args[0]) })
  async getErc1155BalanceOf(
    chain: RpcQueryChain,
    contractAddress: string,
    ownerAddress: string,
    tokenId: string,
    rpcSwitch = false,
  ): Promise<string> {
    this.logService.log(LOG_TYPE.RPC_SERVICE, 'getErc1155BalanceOf', {
      contractAddress,
      chain,
      tokenId,
      ownerAddress,
    });

    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      ChainUtil.rpcChainToChainId(chain),
      this.rpcEnd,
    );
    const contract = new ethers.Contract(
      contractAddress,
      ERC1155_ABI,
      provider,
    );
    const balance = await contract.balanceOf(ownerAddress, tokenId);
    return balance.toString();
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => ChainUtil.rpcChainToChainId(args[0]) })
  async getTotalSupply(
    chain: RpcQueryChain,
    contractAddress: string,
    rpcSwitch = false,
  ): Promise<string> {
    this.logService.log(LOG_TYPE.RPC_SERVICE, 'getTotalSupply', {
      contractAddress,
      chain,
    });

    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      ChainUtil.rpcChainToChainId(chain),
      this.rpcEnd,
    );
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    const totalSupply = await contract.totalSupply();
    return totalSupply.toString();
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => ChainUtil.rpcChainToChainId(args[0]) })
  async getStudioContractGetClaimConditionById(
    chainId: ChainId,
    contractAddress: string,
    _conditionId: string,
    rpcSwitch = false,
  ) {
    this.logService.log(
      LOG_TYPE.RPC_SERVICE,
      'getStudioContractGetClaimConditionById',
      {
        contractAddress,
        chainId,
        _conditionId,
      },
    );

    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      +chainId,
      this.rpcEnd,
    );

    const contract = new ethers.Contract(
      contractAddress,
      STUDIO_CONTRACT_ABI,
      provider,
    );
    const condition = await contract.getClaimConditionById(_conditionId);
    // outputs: [
    //   {
    //     components: [
    //       {
    //         internalType: 'uint256',
    //         name: 'startTimestamp',
    //         type: 'uint256',
    //       },
    //       {
    //         internalType: 'uint256',
    //         name: 'maxClaimableSupply',
    //         type: 'uint256',
    //       },
    //       {
    //         internalType: 'uint256',
    //         name: 'supplyClaimed',
    //         type: 'uint256',
    //       },
    //       {
    //         internalType: 'uint256',
    //         name: 'quantityLimitPerWallet',
    //         type: 'uint256',
    //       },
    //       {
    //         internalType: 'bytes32',
    //         name: 'merkleRoot',
    //         type: 'bytes32',
    //       },
    //       {
    //         internalType: 'uint256',
    //         name: 'pricePerToken',
    //         type: 'uint256',
    //       },
    //       {
    //         internalType: 'address',
    //         name: 'currency',
    //         type: 'address',
    //       },
    //       {
    //         internalType: 'string',
    //         name: 'metadata',
    //         type: 'string',
    //       },
    //     ],
    //     internalType: 'struct IClaimCondition.ClaimCondition',
    //     name: 'condition',
    //     type: 'tuple',
    //   },
    // ],
    return condition;
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => ChainUtil.rpcChainToChainId(args[0]) })
  async getStudioContractGetClaimConditionByIdAndTokenId(
    chainId: ChainId,
    contractAddress: string,
    _conditionId: string,
    _tokenId: string,
    rpcSwitch = false,
  ) {
    return null;
  }

  @logRunDuration(new Logger(RpcService.name))
  async getTokenOwner(chain: RpcQueryChain, req: TokenOwner) {
    this.logService.log(LOG_TYPE.RPC_SERVICE, 'getTokenOwner', {
      chain,
    });
    this._logRpc('getTokenOwner', chain);

    const contracts = req.dest.map((r) => r.contractAddress);

    const cMap = await this._getContractInfos(chain, contracts);

    const ownerAddress = req.ownerAddress;

    const reqs: ProxyContractRequest[] = [];
    for (const rd of req.dest) {
      const contractAddress = rd.contractAddress;
      const tokenids = rd.tokenIds;
      const callDatas = [];

      const contractType = cMap.get(contractAddress).contractType;
      if (contractType === ContractType.ERC1155) {
        for (const tokenId of tokenids) {
          callDatas.push(
            this.balanceOfByOwnerAndTokenId(ownerAddress, tokenId),
          );
        }
      } else if (contractType === ContractType.ERC721) {
        for (const tokenId of tokenids) {
          callDatas.push(this.ownerOf(tokenId));
        }
      }

      reqs.push({
        contractAddress: contractAddress,
        callData: callDatas,
        context: {},
      });
    }

    const res = await this.get(chain, reqs);

    const ret: RpcTokenInfo[] = [];
    for (const item of res) {
      const values = item.value;
      for (const value of values) {
        if (value.methodName == SupportedMethod.OWNEROF && value.success) {
          const retContractAddress = value.reference;
          const retOwnerAddress = value.returnValues[0];
          const tokenId = value.methodParameters[0];

          if (
            cMap.get(retContractAddress).contractType == ContractType.ERC721
          ) {
            ret.push({
              tokenId: tokenId,
              ownerAddress: retOwnerAddress,
              amount:
                ownerAddress?.toLowerCase() == retOwnerAddress?.toLowerCase()
                  ? '1'
                  : ownerAddress === ''
                    ? '1'
                    : '0',
              contract: cMap.get(retContractAddress),
              tokenUri: '',
            });
          } else {
            this.logger.error(
              `ownerOf(${tokenId}) succeed, but ${retContractAddress} is not ERC721 !!!`,
            );
          }
        } else if (
          value.methodName == SupportedMethod.BALANCEOF2 &&
          value.success
        ) {
          const retContractAddress = value.reference;
          const retOwnerAddress = value.methodParameters[0];
          const retBalance = new BigNumber(value.returnValues[0].hex).toFixed();
          const tokenId = value.methodParameters[1];

          if (
            cMap.get(retContractAddress).contractType == ContractType.ERC1155
          ) {
            ret.push({
              tokenId: tokenId,
              ownerAddress: retOwnerAddress,
              amount: retBalance,
              contract: cMap.get(retContractAddress),
              tokenUri: '',
            });
          } else {
            this.logger.warn(
              `ownerOf(${tokenId}) failed, but ${retContractAddress} is not ERC1155`,
            );
          }
        }
      }
    }

    return ret;
  }

  // @logRunDuration(new Logger(RpcService.name))
  @Cacheable({ key: 'getContractInfo', seconds: 5 * 60 })
  async getContractInfo(
    chain: RpcQueryChain,
    contractAddresses: string[] | string,
  ): Promise<RpcContractInfo[]> {
    // this.logger.debug('getContractInfo');
    this._logRpc('getContractInfo', chain);

    const reqs = [];

    for (const contractAddress of contractAddresses) {
      reqs.push({
        contractAddress: contractAddress,
        callData: [this.name(), this.symbol(), this.totalSupply()],
      });
    }
    const res = await this.get(chain, reqs);
    const ret = [];
    for (const item of res) {
      const values = item.value;

      let name = '';
      let symbol = '';
      let totalSupply = 0;
      let contractType = ContractType.UNKNOWN;
      let contractAddress = '';

      for (const value of values) {
        if (value.methodName == 'name' && value.success == true) {
          name = value.returnValues[0];
        }
        if (value.methodName == 'symbol' && value.success == true) {
          symbol = value.returnValues[0];
        }
        if (value.methodName == 'totalSupply' && value.success == true) {
          totalSupply = parseInt(value.returnValues[0].hex, 16);
        }
        contractAddress = value.reference;
        contractType = await this._getContractType(chain, contractAddress);
      }

      ret.push({
        name: name,
        symbol: symbol,
        totalSupply: totalSupply,
        contractType: contractType,
        contractAddress: contractAddress,
      });
    }

    return ret;
  }

  @Cacheable({ key: '_getContractType', seconds: 5 * 60 })
  @RpcCall({
    chainIdFn: (args) => ChainUtil.rpcChainToChainId(args[0]),
  })
  async _getContractType(
    chain: RpcQueryChain,
    contractAddress: string,
    rpcSwitch = false,
  ): Promise<ContractType> {
    const testAddress = '0x9059B7c20390161aF7A8fD2aAc21f1b9ac7b22BE';
    const testTokenId = '1350';
    const reference = `${contractAddress}#_getContractType`;
    const reqs: any[] = [
      {
        reference: reference,
        contractAddress: contractAddress,
        abi: [...ERC721_ABI, ...ERC1155_ABI],
        calls: [
          {
            methodName: SupportedMethod.BALANCEOF,
            methodParameters: [testAddress],
          },
          {
            methodName: SupportedMethod.BALANCEOF2,
            methodParameters: [testAddress, testTokenId],
          },
        ],
      },
    ];
    const multiCall = this.getMulticall(ChainUtil.rpcChainToChainId(chain));
    const res = await multiCall.call(reqs);
    const values = res.results[reference].callsReturnContext;
    if (values[0].success === true) {
      return ContractType.ERC721;
    }
    if (values[1].success === true) {
      return ContractType.ERC1155;
    }
    return ContractType.UNKNOWN;
  }

  async getReturnData(res: RpcTokenInfo[]): Promise<NftsResp> {
    const finalResult = {
      total: 0,
      cursor: '',
      result: [],
    };

    finalResult.cursor = null;
    finalResult.total = res.length;

    for (const token of res) {
      const nft = this.normalize(token);
      finalResult.result.push(nft);
    }

    await this.fetchMetadata(finalResult);

    return finalResult;
  }

  normalize(raw: RpcTokenInfo): Nft {
    const {
      tokenId,
      tokenUri,
      ownerAddress,
      amount,
      contract: { name, symbol, totalSupply, contractType, contractAddress },
    } = raw;
    const tokenIdHex = ethers.BigNumber.from(tokenId)
      .toHexString()
      .slice(2) // 0x123abc -> 123abc
      .padStart(64, '0') // 123abc -> 000...123abc
      .toUpperCase(); // 000...123abc -> 000...123ABC

    const nft: Nft = {
      tokenId: tokenId,
      contract: {
        contractAddress: contractAddress,
        name: name,
        symbol: symbol,
        contractType: this.normalizeContractType(contractType),
      },
      owner: {
        ownerAddress: ownerAddress,
        amount: amount,
      },
      metadata: null,
      // https://eips.ethereum.org/EIPS/eip-1155#metadata
      tokenUri: tokenUri?.replace('{id}', tokenIdHex),
      isSpam: false,
    };
    return nft;
  }

  normalizeContractType(contractType: string) {
    return contractType.includes('721')
      ? ContractType.ERC721
      : contractType.includes('1155')
        ? ContractType.ERC1155
        : ContractType.UNKNOWN;
  }

  @logRunDuration(new Logger(RpcService.name))
  async fetchMetadata(finalResult) {
    this.logService.log(LOG_TYPE.RPC_SERVICE, 'fetchMetadata');

    const allSettled = (promises) => {
      const wrappedPromises = promises.map((p) =>
        Promise.resolve(p).then(
          (val) => ({ status: 'fulfilled', value: val }),
          (err) => ({ status: 'rejected', reason: err }),
        ),
      );
      return Promise.all(wrappedPromises);
    };

    const fetchWithFallback = async (
      url: string,
      gateways: string[],
      timeoutMs = 15000, // 15 seconds 如果超過這個時間就換下一個
    ) => {
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
        Accept: 'application/json',
      };

      for (const gateway of gateways) {
        const fullUrl = url.replace(/^ipfs:\/\//i, gateway);
        try {
          const response = await Promise.race([
            firstValueFrom(this.httpService.get(fullUrl, { headers })),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), timeoutMs),
            ),
          ]);
          return response;
        } catch (_) {
          continue;
        }
      }
      throw new Error(`All gateways failed for URL: ${url}`);
    };

    let start = 0;
    let end = start + HTTP_FETCH_BATCH;
    let sli = finalResult.result.slice(start, end);

    while (sli.length) {
      const n = sli.map(async (item) => {
        const tokenUri = item.tokenUri;
        if (tokenUri.startsWith('data:application/json;base64,')) {
          const metadata = Buffer.from(
            tokenUri.replace('data:application/json;base64,', ''),
            'base64',
          ).toString('utf-8');
          return { data: metadata };
        }

        return await fetchWithFallback(tokenUri, IPFS_GATEWAYS);
      });

      const res = await allSettled(n);

      if (res.length != sli.length) {
        throw new Error(`array length not matched`);
      }

      for (let i = 0; i < sli.length; ++i) {
        sli[i].metadata = res[i].status == 'rejected' ? '' : res[i].value.data;
      }

      start = end;
      end = start + HTTP_FETCH_BATCH;
      sli = finalResult.result.slice(start, end);
    }
  }

  @Cacheable({ key: 'nft:tokenUri', seconds: 15 })
  // @logRunDuration(new Logger(RpcService.name))
  async getMetadata(tokenUri: string) {
    this.logService.log(LOG_TYPE.RPC_SERVICE, 'getMetadata', {
      tokenUri: tokenUri?.replace(/\u0000/g, ''),
    });

    if (!tokenUri) {
      return null;
    }
    tokenUri = tokenUri?.trim() ?? '';
    if (tokenUri.startsWith('data:application/json;base64,')) {
      let decodeStr = Buffer.from(
        tokenUri.replace('data:application/json;base64,', ''),
        'base64',
      ).toString('utf-8');
      try {
        if (decodeStr.charAt(decodeStr.length - 1) !== '}') {
          decodeStr = decodeStr.substring(0, decodeStr.lastIndexOf('}') + 1);
        }
        const metadata = JSON.parse(decodeStr);
        return metadata;
      } catch (e) {
        this.logger.error('JSON.parse metadata base46 text error', e);
        return null;
      }
    }

    if (tokenUri.startsWith('data:application/json;utf8,')) {
      let decodeStr = tokenUri.replace('data:application/json;utf8,', '');
      try {
        if (decodeStr.charAt(decodeStr.length - 1) !== '}') {
          decodeStr = decodeStr.substring(0, decodeStr.lastIndexOf('}') + 1);
        }
        const metadata = JSON.parse(decodeStr);
        return metadata;
      } catch (e) {
        this.logger.error('JSON.parse metadata base46 text error', e);
        return null;
      }
    }

    if (tokenUri.startsWith('ar://')) {
      // Handle Arweave URLs
      const arweaveId = tokenUri.replace('ar://', '');
      const arweaveUrl = `${ARWEAVE_GATEWAY}${arweaveId}`;
      try {
        const metadata = await firstValueFrom(this.httpService.get(arweaveUrl));
        metadata.data.image = metadata.data?.image?.replace(
          /^ar:\/\//i,
          ARWEAVE_GATEWAY,
        );
        return metadata.data;
      } catch (error) {
        this.logger.error(`Error fetching Arweave metadata: ${error.message}`);
        return null;
      }
    }

    const resolveIpfsUrl = (uri: string, gateway: string): string => {
      if (uri.startsWith('ipfs://')) {
        return uri.replace(/^ipfs:\/\//i, gateway);
      } else if (uri.includes('ipfs/')) {
        return gateway + uri.substring(uri.indexOf('ipfs/') + 5);
      }
      return uri;
    };
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
      Accept: 'application/json',
    };

    for (const gateway of IPFS_GATEWAYS) {
      const url = resolveIpfsUrl(tokenUri, gateway);
      let retry = 0;
      const loopCondition = true;

      while (loopCondition && retry < 3) {
        try {
          const metadata = await firstValueFrom(
            this.httpService.get(url, { headers }),
          );
          if (metadata.data.image?.startsWith('ipfs://')) {
            // TODO: 還是統一用 lootex.mypinata.cloud 存
            metadata.data.image = metadata.data?.image?.replace(
              /^ipfs:\/\//i,
              IPFS_GATEWAY,
            );
          }

          return metadata.data;
        } catch (error) {
          this.logger.error(error);

          if (error.response?.status === 429) {
            this.logger.warn(
              'Too many requests. Waiting for 10 seconds before retrying...',
            );
            await new Promise((resolve) => setTimeout(resolve, 10000));
            retry++;
            continue;
          } else {
            this.logger.warn(`Gateway ${gateway} failed: ${error.message}`);
            break; // 切換下一個 gateway
          }
        }
      }
    }

    this.logger.error(`All gateways failed for tokenUri: ${tokenUri}`);
    return null;
  }

  @logRunDuration(new Logger(RpcService.name))
  async getCryptoKittiesMetadata(tokenId: string) {
    // this.cwLogService.log(
    //   this.logger,
    //   CLOUDWATCH_LOGS.RPC_SERVICE,
    //   'getMetadata-CryptoKitties',
    //   [tokenId],
    // );

    const url = `https://api.cryptokitties.co/kitties/${tokenId}`;

    // this loop for 429 error retry
    let loopCondition = true;
    let retry = 0;
    while (loopCondition) {
      try {
        const metadata = await firstValueFrom(this.httpService.get(url));

        loopCondition = false;

        return {
          name: metadata?.data?.name,
          image: metadata?.data?.image_url,
          description: metadata?.data?.bio,
          attributes: metadata?.data?.enhanced_cattributes,
        };
      } catch (error) {
        this.logger.error(error);
        if (error.response?.status === 429) {
          this.logger.warn(
            'Too many requests. Waiting for 10 seconds before retrying...',
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
          retry++;
          continue; // Continue the loop to retry the request
        } else {
          this.logger.error(
            `Error fetching metadata for ${url}: ${error.message}`,
          );
          loopCondition = false;
          return null; // If it's another error, stop the loop
        }
      }
    }
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => args[0] })
  async nativeGetDecimals(chainId: number, contractAddress: string) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    const decimals = await contract.decimals();
    return decimals.toString();
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => args[0] })
  async nativeGetOwnerOf(
    chainId: number,
    contractAddress: string,
    tokenId: string,
  ) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    const owner = await contract.ownerOf(tokenId);

    return owner.toString();
  }

  /**
   * @function nativeGetBalanceOf
   * @param chain
   * @param contractAddress
   * @param ownerAddress
   * @param tokenId if no id, set null
   * @returns
   */
  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => args[0] })
  async nativeGetBalanceOf(
    chainId: number,
    contractAddress: string,
    ownerAddress: string,
    tokenId: string = null,
  ): Promise<ethers.BigNumber> {
    // ERC1155
    if (tokenId) {
      const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
        chainId,
        this.rpcEnd,
      );
      const contract = new ethers.Contract(
        contractAddress,
        ERC1155_ABI,
        provider,
      );
      const balance = await contract.balanceOf(ownerAddress, tokenId);

      return balance.toString();
    }
    // ERC20/ERC721
    if (!tokenId) {
      const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
        chainId,
        this.rpcEnd,
      );
      const contract = new ethers.Contract(
        contractAddress,
        ERC721_ABI,
        provider,
      );
      const balance = await contract.balanceOf(ownerAddress);

      return balance;
    }
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall()
  async getTransactionReceipt(chainId: number, txHash: string) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const transaction = await provider.getTransactionReceipt(txHash);
    return transaction;
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall()
  async waitForTransaction(chainId: number, txHash: string, confirms = 0) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const transaction = await provider.waitForTransaction(txHash, confirms);
    return transaction;
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall()
  async waitForTransactionV6(chainId: number, txHash: string, confirms = 0) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProviderV6(
      chainId,
      this.rpcEnd,
    );

    const receipt = await provider.waitForTransaction(txHash, confirms);

    return receipt;
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall()
  async getTransaction(chainId: number, txHash: string) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const transaction = await provider.getTransaction(txHash);
    return transaction;
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall()
  async getBlock(
    chainId: number,
    blockHashOrNumberOrBlockTag: string | number,
  ) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const block = await provider.getBlock(blockHashOrNumberOrBlockTag);
    return block;
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => args[0] })
  async nativeGetERC20BalanceOf(
    chainId: number,
    contractAddress: string,
    ownerAddress: string,
  ) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(ownerAddress);

    return balance.toString();
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => args[0] })
  async nativeGetERC20Allowance(
    chainId: number,
    contractAddress: string,
    ownerAddress: string,
    spenderAddress: string,
  ) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
    const balance = await contract.allowance(ownerAddress, spenderAddress);

    return balance.toString();
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => args[0] })
  async nativeGetERC721IsApprovedForAll(
    chainId: number,
    contractAddress: string,
    ownerAddress: string,
    operatorAddress: string,
  ) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );

    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider);
    const isApprovedForAll = await contract.isApprovedForAll(
      ownerAddress,
      operatorAddress,
    );

    return isApprovedForAll;
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => args[0] })
  async nativeGetERC1155IsApprovedForAll(
    chainId: number,
    contractAddress: string,
    ownerAddress: string,
    operatorAddress: string,
  ) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );

    const contract = new ethers.Contract(
      contractAddress,
      ERC1155_ABI,
      provider,
    );
    const isApprovedForAll = await contract.isApprovedForAll(
      ownerAddress,
      operatorAddress,
    );
    return isApprovedForAll;
  }

  @logRunDuration(new Logger(RpcService.name))
  @RpcCall({ chainIdFn: (args) => args[0] })
  async nativeGetERC1271IsValidSignature(
    chainId: number,
    contractAddress: string,
    challenge: string,
    signature: string,
  ) {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      this.rpcEnd,
    );
    const contract = new ethers.Contract(contractAddress, ERC1271ABI, provider);

    return await contract.isValidSignature(
      ethers.utils.id(challenge),
      signature,
    );
  }

  owner() {
    return {
      method: SupportedMethod.OWNER,
      param: [],
    };
  }

  name() {
    return {
      method: SupportedMethod.NAME,
      param: [],
    };
  }

  symbol() {
    return {
      method: SupportedMethod.SYMBOL,
      param: [],
    };
  }

  totalSupply() {
    return {
      method: SupportedMethod.TOTALSUPPLY,
      param: [],
    };
  }

  balanceOfByTokenId(param: string) {
    return {
      method: SupportedMethod.BALANCEOF,
      param: [param],
    };
  }

  balanceOfByOwnerAndTokenId(address: string, index: string) {
    return {
      method: SupportedMethod.BALANCEOF2,
      param: [address, index],
    };
  }

  ownerOf(param: string) {
    return {
      method: SupportedMethod.OWNEROF,
      param: [param],
    };
  }

  TokenUri(param: string) {
    return {
      method: SupportedMethod.TOKENURI,
      param: [param],
    };
  }

  Uri(param: string) {
    return {
      method: SupportedMethod.URI,
      param: [param],
    };
  }

  TokenOfOwnerByIndex(address: string, index: number) {
    return {
      method: SupportedMethod.TOKENOFOWNERBYINDEX,
      param: [address, index],
    };
  }

  _logRpc(method: string, chain: RpcQueryChain | string) {
    this.rpcHandlerService.incrCounter(
      'RpcService',
      'get#' + method,
      ChainUtil.rpcChainToChainId(chain),
    );
  }
}

// @Injectable()
// export class RpcAnkrService extends RpcService {
//   public rpcEnd: RpcEnd = RpcEnd.ankr;
// }
