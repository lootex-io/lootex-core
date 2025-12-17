import {
  type Account,
  type Address,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
  encodeAbiParameters,
  keccak256,
  pad,
  toBytes,
  toHex,
  zeroAddress,
} from 'viem';
import { readContract } from 'viem/actions';

import { proxyAbi } from './abi.js';

export const isNativeCurrency = (address: `0x${string}`) => {
  return (
    address === zeroAddress ||
    address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  );
};

export const waitForContractDeployment = async ({
  contractAddress,
  client,
}: {
  contractAddress: `0x${string}`;
  client: PublicClient;
}) => {
  if (!contractAddress) throw new Error('No contract address provided');

  let isDeployed = false;
  while (!isDeployed) {
    const code = await client.request({
      method: 'eth_getCode',
      params: [contractAddress, 'latest'],
    });

    isDeployed = code !== '0x';

    if (!isDeployed) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};

const keccak256EncodePacked = (
  hexURI: `0x${string}`,
  keyHex: `0x${string}`,
  chainId: number,
) => {
  const uriBytesHex = hexURI.startsWith('0x') ? hexURI.slice(2) : hexURI;
  const keyHexFormatted = keyHex.startsWith('0x') ? keyHex.slice(2) : keyHex;
  const chainIdHex = pad(toHex(chainId), { size: 32 }).slice(2);

  const packedData =
    `0x${uriBytesHex}${keyHexFormatted}${chainIdHex}` as `0x${string}`;
  return keccak256(packedData);
};

export const getLazyMintData = async ({
  contractAddress,
  revealedURI,
  key,
  chainId,
  client,
}: {
  contractAddress: `0x${string}`;
  client: WalletClient;
  revealedURI: string;
  key: string;
  chainId: number;
}) => {
  const hexURI = toHex(toBytes(revealedURI));
  const keyBytes = toHex(toBytes(key));

  const encryptedURI = (await readContract(client, {
    address: contractAddress,
    abi: proxyAbi,
    functionName: 'encryptDecrypt',
    args: [hexURI, keyBytes],
  })) as `0x${string}`;

  const provenanceHash = keccak256EncodePacked(hexURI, keyBytes, chainId);

  const encoded = encodeAbiParameters(
    [{ type: 'bytes' }, { type: 'bytes32' }],
    [encryptedURI, provenanceHash],
  );

  return encoded;
};

export const sendTransactionAsync = async ({
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
