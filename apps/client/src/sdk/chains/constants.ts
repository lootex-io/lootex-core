import {
  type Chain as ViemChain,
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  mantle,
  mantleTestnet,
  polygon,
  polygonMumbai,
  soneiumMinato,
} from 'viem/chains';

export type Chain = ViemChain & { shortName: string };

const createChain = (
  chain: ViemChain,
  shortName: string,
  overrideRpcUrl?: string,
): Chain => {
  return {
    ...chain,
    shortName,
    ...(overrideRpcUrl && {
      rpcUrls: {
        default: {
          http: [overrideRpcUrl],
        },
      },
    }),
  };
};

const soneium: ViemChain = {
  ...soneiumMinato,
  id: 1868,
  name: 'Soneium',
  nativeCurrency: { name: 'Soneium Ether', symbol: 'ETH', decimals: 18 },
  testnet: false,
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://soneium.blockscout.com',
      apiUrl: 'https://soneium.blockscout.com/api',
    },
  },
};

export const supportedChains = [
  createChain(mainnet, 'eth', 'https://eth.llamarpc.com'),
  createChain(bsc, 'bnb'),
  createChain(polygon, 'matic'),
  createChain(base, 'base'),
  createChain(mantle, 'mnt'),
  createChain(avalanche, 'Avalanche'),
  createChain(arbitrum, 'arb1'),
  createChain(soneium, 'soneium', 'https://rpc.soneium.org'),
  createChain(soneiumMinato, 'soneium-minato'),
  createChain(polygonMumbai, 'maticmum'),
  createChain(mantleTestnet, 'mntt'),
];

/**
 * Gets a chain by its identifier
 * @param identifier - The chain identifier. Can be:
 *   - Chain ID as number (e.g. 1 for Ethereum mainnet)
 *   - Chain ID as hex string (e.g. "0x1")
 *   - EIP-155 formatted string (e.g. "eip155:1")
 *   - Chain short name (e.g. "eth" for Ethereum mainnet)
 * @returns The matching chain object
 * @throws Error if no chain matches the identifier
 * @example
 * // Get by numeric ID
 * const eth = getChain(1)
 *
 * // Get by hex ID
 * const polygon = getChain("0x89")
 *
 * // Get by EIP-155 format
 * const bsc = getChain("eip155:56")
 *
 * // Get by short name
 * const arbitrum = getChain("arb1")
 */
export const getChain = <T extends number | string>(identifier: T): Chain => {
  const lookupFn = (identifier: T): ((chain: Chain) => boolean) => {
    if (typeof identifier === 'number') {
      return (chain) => chain.id === identifier;
    }

    if (identifier.startsWith('0x')) {
      return (chain) => chain.id === Number.parseInt(identifier, 16);
    }

    if (identifier.startsWith('eip155:')) {
      return (chain) => chain.id.toString() === identifier.split?.(':')?.[1];
    }

    return (chain) =>
      [chain.shortName, chain.id.toString()].includes(identifier);
  };

  const chain = supportedChains.find(lookupFn(identifier));

  if (!chain) throw new Error(`Chain with identifier ${identifier} not found`);

  return chain;
};
