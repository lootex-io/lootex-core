import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';

export const soneium = defineChain({
  id: 1868,
  name: 'Soneium',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.soneium.org'] },
  },
  blockExplorers: {
    default: {
      name: 'Soneium Explorer',
      url: 'https://soneium.blockscout.com',
    },
  },
});

export const soneiumMinato = defineChain({
  id: 1946,
  name: 'Soneium Minato',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.minato.soneium.org'] },
  },
  blockExplorers: {
    default: {
      name: 'Minato Explorer',
      url: 'https://explorer-testnet.soneium.org',
    },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [soneium, soneiumMinato],
  transports: {
    [soneium.id]: http(),
    [soneiumMinato.id]: http(),
  },
});

export const defaultChain = soneium;
