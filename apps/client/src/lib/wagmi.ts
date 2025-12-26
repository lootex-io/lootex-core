import { http, createConfig } from 'wagmi';
import { soneium } from 'viem/chains';

export const config = createConfig({
  chains: [soneium],
  transports: {
    [soneium.id]: http(),
  },
});

export const defaultChain = soneium;
