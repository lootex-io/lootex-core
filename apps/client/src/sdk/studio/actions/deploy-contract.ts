import {
  type Account,
  type Address,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  pad,
  stringToBytes,
  toHex,
} from 'viem';
import { createApiClient } from '../../api/api-client';
import type { Client } from '../../client/index';
import { factoryAbi } from '../abi';
import {
  LOOTEX_PLATFORM_FEE_RECEIVER,
  contracts as factoryContracts,
} from '../constants';
import { sendTransactionAsync, waitForContractDeployment } from '../utils';

export const deployContract = async ({
  client,
  chainId,
  name,
  symbol,
  imageUrl,
  earningAddress,
  creatorFeeAddress,
  ownerAddress,
  isCreatorFee,
  walletClient,
}: {
  client: Client;
  chainId: number;
  name: string;
  symbol: string;
  imageUrl: string;
  earningAddress?: `0x${string}`;
  creatorFeeAddress?: `0x${string}`;
  ownerAddress: `0x${string}`;
  isCreatorFee?: boolean;
  walletClient: WalletClient<Transport, Chain, Account>;
}) => {
  const apiClient = createApiClient({
    client,
  });
  const publicClient = client.getPublicClient({ chainId });

  const contract = await apiClient.studio.createContract({
    schemaName: 'ERC721',
    chainId: chainId.toString(),
    mode: 'Badge',
    name,
    symbol,
    logoImageUrl: imageUrl,
  });

  if (!contract) throw new Error('Failed to create drop contract');

  // // Step 3: Update blindbox metadata
  // await apiClient.studio.updateBlindBox({
  //   contractId: contract.id,
  //   isBlindbox: true,
  //   blindboxUrl: imageUrl,
  //   blindboxName: assetName || name,
  //   blindboxDescription: assetDescription,
  // });

  const _earningAddress = earningAddress || ownerAddress;
  await apiClient.studio.updateContract({
    contractId: contract.id,
    dropFeeInfo: {
      [_earningAddress]: 0.9,
      [LOOTEX_PLATFORM_FEE_RECEIVER]: 0.1,
    },
    creatorFeeAddress:
      creatorFeeAddress || contract.creatorFeeAddress || ownerAddress,
    isCreatorFee,
  });

  // Fetch full contract metadata
  const fullContract = await apiClient.studio.getCraetedContract({
    contractId: contract.id,
  });

  // Step 5: Deploy contract via factory
  const calldata = encodeDeployData({
    defaultOwner: ownerAddress,
    name,
    symbol,
    contractURI: '',
    trustedForwarders: [],
    saleRecipient: ownerAddress,
    royaltyRecipient: fullContract.creatorFeeAddress || ownerAddress,
    royaltyBps: fullContract.isCreatorFee
      ? Math.floor(Number(Number.parseFloat(fullContract.creatorFee)) * 100)
      : 0,
    platformFeeRecipient: LOOTEX_PLATFORM_FEE_RECEIVER,
    platformFeeBps: 1000,
  });

  const deployEncodedData = encodeFunctionData({
    abi: factoryAbi,
    functionName: 'deployProxy',
    args: [formatBytes32String('DropERC721'), calldata],
  });

  const factoryAddress = factoryContracts[chainId]?.factory as `0x${string}`;
  if (!factoryAddress)
    throw new Error(`No factory contract found for chainId: ${chainId}`);

  const deployReceipt = await sendTransactionAsync({
    walletClient,
    publicClient,
    to: factoryAddress,
    data: deployEncodedData,
  });

  // Step 6: Sync deployed contract
  const deployedContract = await apiClient.studio.syncDeployedContract({
    contractId: contract.id,
    txHash: deployReceipt.transactionHash,
  });

  if (!deployedContract?.contractAddress)
    throw new Error('Failed to sync deployed contract');

  // Wait for on-chain deployment
  await waitForContractDeployment({
    contractAddress: deployedContract.contractAddress,
    client: publicClient,
  });

  return { deployedContract, deployReceipt, contract };
};

const formatBytes32String = (input: string): `0x${string}` => {
  const bytes = stringToBytes(input);
  if (bytes.length > 32) {
    throw new Error('String too long for bytes32');
  }
  const paddedBytes = pad(bytes, { size: 32, dir: 'right' });
  return toHex(paddedBytes);
};

const encodeDeployData = ({
  defaultOwner,
  name,
  symbol,
  contractURI,
  trustedForwarders,
  saleRecipient,
  royaltyRecipient,
  royaltyBps,
  platformFeeRecipient,
  platformFeeBps,
}: {
  defaultOwner: Address;
  name: string;
  symbol: string;
  contractURI: string;
  trustedForwarders: Address[];
  saleRecipient: Address;
  royaltyRecipient: Address;
  royaltyBps: number;
  platformFeeRecipient: Address;
  platformFeeBps: number;
}) => {
  const selector = keccak256(
    stringToBytes(
      'initialize(address,string,string,string,address[],address,address,uint128,uint128,address)',
    ),
  ).slice(0, 10);

  const data = encodeAbiParameters(
    [
      { name: 'defaultOwner', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'contractURI', type: 'string' },
      { name: 'trustedForwarders', type: 'address[]' },
      { name: 'saleRecipient', type: 'address' },
      { name: 'royaltyRecipient', type: 'address' },
      { name: 'royaltyBps', type: 'uint128' },
      { name: 'platformFeeBps', type: 'uint128' },
      { name: 'platformFeeRecipient', type: 'address' },
    ],
    [
      defaultOwner,
      name,
      symbol,
      contractURI,
      trustedForwarders,
      saleRecipient,
      royaltyRecipient,
      BigInt(royaltyBps),
      BigInt(platformFeeBps),
      platformFeeRecipient,
    ],
  );

  return selector + data.substring(2);
};
