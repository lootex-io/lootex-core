import {
  type Account,
  type Address,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  isAddress,
  keccak256,
  pad,
  parseUnits,
  stringToBytes,
  toHex,
  zeroAddress,
} from 'viem';
import { createApiClient } from '../api/api-client';
import type { Client } from '../client/index';
import { factoryAbi, proxyAbi } from './abi';
import {
  LOOTEX_PLATFORM_FEE_RECEIVER,
  MAX_BADGE_TOTAL_SUPPLY,
  contracts as factoryContracts,
} from './constants';
import {
  getLazyMintData,
  isNativeCurrency,
  waitForContractDeployment,
} from './utils';

type DeployDropContractOptions = {
  address: string;
  chainId: number;
  client: Client;
  walletClient: WalletClient<Transport, Chain, Account>;
  assetName?: string;
  assetDescription?: string;
  name?: string;
  symbol?: string;
  imageFile: File | Buffer;
  startTime?: Date;
  amount?: number;
  price?: string;
  currencyAddress?: `0x${string}`;
  limitPerWallet?: string;
  earningAddress?: `0x${string}`;
  creatorFeeAddress?: `0x${string}`;
  isCreatorFee?: boolean;
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

const sendTransactionAsync = async ({
  walletClient,
  publicClient,
  to,
  data,
}: {
  walletClient: WalletClient<Transport, Chain, Account>;
  publicClient: PublicClient;
  to: Address;
  data: `0x${string}`;
}) => {
  const txHash = await walletClient.sendTransaction({
    to,
    data,
  });

  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });
    return receipt;
  } catch (error) {
    console.error('Error waiting for transaction receipt:', error);
    throw new Error('Failed to wait for transaction receipt');
  }
};

const deployBadgeDrop = async (options: DeployDropContractOptions) => {
  const {
    address,
    chainId,
    client,
    walletClient,
    name = 'My Awesome NFT Collection',
    symbol = 'MANFT',
    imageFile,
    assetName = 'My Awesome NFT Collection',
    assetDescription = 'My Awesome NFT Collection',
    startTime = new Date(Date.now() + 24 * 60 * 60 * 1000),
    amount = 1000,
    price = '0',
    currencyAddress = zeroAddress,
    limitPerWallet = '',
    earningAddress,
    creatorFeeAddress,
    isCreatorFee = false,
  } = options;

  if (!isAddress(address)) throw new Error('Invalid address provided');
  if (!chainId) throw new Error('No chainId provided');
  if (!walletClient) throw new Error('No wallet client provided');
  if (!imageFile) throw new Error('No image file provided');

  const apiClient = createApiClient({
    client,
  });
  const publicClient = client.getPublicClient({ chainId });

  // Step 1: Upload image
  let image;
  if (imageFile instanceof Buffer && assetName) {
    const buffer = Buffer.from(imageFile);
    const file = new File([buffer], `${assetName}.png`, { type: 'image/png' });
    image = await apiClient.studio.uploadBlindBoxImage(file);
  }
  if (imageFile instanceof File && assetName) {
    image = await apiClient.studio.uploadBlindBoxImage(imageFile);
  }
  const imageUrl = image?.url || '';

  // Step 2: Create contract
  const contract = await apiClient.studio.createContract({
    schemaName: 'ERC721',
    chainId: chainId.toString(),
    mode: 'Badge',
    name,
    symbol,
    logoImageUrl: imageUrl,
  });

  if (!contract) throw new Error('Failed to create drop contract');

  // Step 3: Update blindbox metadata
  await apiClient.studio.updateBlindBox({
    contractId: contract.id,
    isBlindbox: true,
    blindboxUrl: imageUrl,
    blindboxName: assetName || name,
    blindboxDescription: assetDescription,
  });

  // Step 4: Create claim condition
  await apiClient.studio.createClaimCondition({
    contractId: contract.id,
    amount:
      Number(amount) < Number(MAX_BADGE_TOTAL_SUPPLY)
        ? amount.toString()
        : MAX_BADGE_TOTAL_SUPPLY.toString(),
    startTime,
    price,
    currencyAddress: currencyAddress || zeroAddress,
    limitPerWallet,
    allowlist: '',
  });

  const _earningAddress = earningAddress || address;
  await apiClient.studio.updateContract({
    contractId: contract.id,
    dropFeeInfo: {
      [_earningAddress]: 0.9,
      [LOOTEX_PLATFORM_FEE_RECEIVER]: 0.1,
    },
    creatorFeeAddress:
      creatorFeeAddress || contract.creatorFeeAddress || address,
    isCreatorFee,
  });

  // Fetch full contract metadata
  const fullContract = await apiClient.studio.getCraetedContract({
    contractId: contract.id,
  });

  // Step 5: Deploy contract via factory
  const calldata = encodeDeployData({
    defaultOwner: address,
    name,
    symbol,
    contractURI: '',
    trustedForwarders: [],
    saleRecipient: address,
    royaltyRecipient: fullContract.creatorFeeAddress || address,
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

  // Step 7: Lazy mint
  const blindBox = await apiClient.studio.syncBlindBox({
    contractId: contract.id,
  });

  if (!blindBox?.tokenUri || !blindBox?.blindboxKey)
    throw new Error('Unable to get blindbox tokenUri or blindboxKey');

  const baseURI = `${blindBox.tokenUri}/`;

  const lazyMintData = await getLazyMintData({
    contractAddress: deployedContract.contractAddress,
    client: walletClient,
    revealedURI: baseURI,
    key: blindBox.blindboxKey,
    chainId: contract.chainId,
  });

  const lazyMintEncodedData = encodeFunctionData({
    abi: proxyAbi,
    functionName: 'lazyMint',
    args: [BigInt(amount), baseURI, lazyMintData],
  });

  const lazyMintReceipt = await sendTransactionAsync({
    walletClient,
    publicClient,
    to: deployedContract.contractAddress,
    data: lazyMintEncodedData,
  });

  // Step 8: Set claim conditions
  const sortedConditions =
    fullContract?.drops
      ?.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
      ?.map((condition, index) => {
        const merkleRoot = condition.allowlist
          ? condition.merkleRoot
          : '0x' + '0'.repeat(64);

        return {
          startTimestamp: Math.floor(
            new Date(condition.startTime).getTime() / 1000,
          ),
          maxClaimableSupply: Number(condition.amount),
          supplyClaimed: 0,
          quantityLimitPerWallet: Number(
            condition.limitPerWallet || condition.amount,
          ),
          merkleRoot,
          pricePerToken: parseUnits(
            condition.price,
            condition.currency?.decimals || 18,
          ),
          currency: isNativeCurrency(condition.currency?.address)
            ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
            : condition.currency.address,
          metadata: `phase-${index}`,
        };
      }) || [];

  const setConditionsEncodedData = encodeFunctionData({
    abi: proxyAbi,
    functionName: 'setClaimConditions',
    args: [sortedConditions, false],
  });

  const setConditionsReceipt = await sendTransactionAsync({
    walletClient,
    publicClient,
    to: deployedContract.contractAddress,
    data: setConditionsEncodedData,
  });

  return {
    deployReceipt,
    lazyMintReceipt,
    setConditionsReceipt,
    deployedContractAddress: deployedContract.contractAddress,
  };
};

export default deployBadgeDrop;
