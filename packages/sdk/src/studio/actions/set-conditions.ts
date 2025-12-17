import {
  type Account,
  type Chain,
  type Transport,
  type WalletClient,
  encodeFunctionData,
  parseUnits,
  zeroAddress,
} from 'viem';
import { createApiClient } from '../../api/api-client.js';
import type { Client } from '../../client/index.js';
import { proxyAbi } from '../abi.js';
import { MAX_BADGE_TOTAL_SUPPLY } from '../constants.js';
import { isNativeCurrency, sendTransactionAsync } from '../utils.js';

export const setConditions = async ({
  client,
  chainId,
  contractId,
  walletClient,
  amount = 1000,
  startTime = new Date(),
  endTime,
  price = '0',
  currencyAddress,
  limitPerWallet = '', // empty string means no limit
}: {
  client: Client;
  chainId: number;
  contractId: string;
  walletClient: WalletClient<Transport, Chain, Account>;
  amount: number;
  startTime: Date;
  endTime: Date;
  price: string;
  currencyAddress: `0x${string}`;
  limitPerWallet: string;
}) => {
  const apiClient = createApiClient({
    client,
  });
  const publicClient = client.getPublicClient({ chainId });

  // Step 4: Create claim condition
  await apiClient.studio.createClaimCondition({
    contractId,
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

  const contract = await apiClient.studio.getCraetedContract({
    contractId,
  });

  // Step 8: Set claim conditions
  const sortedConditions =
    contract?.drops
      ?.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
      ?.map((condition, index) => {
        const merkleRoot = condition.allowlist
          ? condition.merkleRoot
          : `0x${'0'.repeat(64)}`;

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
    to: contract.address,
    data: setConditionsEncodedData,
  });

  return setConditionsReceipt;
};
