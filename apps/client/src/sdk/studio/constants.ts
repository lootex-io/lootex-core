export const MAX_BADGE_TOTAL_SUPPLY = 100_000;
export const LOOTEX_PLATFORM_FEE_RECEIVER =
  '0x0597D2187941a2De3070F6141FaACEECE7Bb5Fe4';

export const contracts: Record<
  number,
  {
    network: string;
    factory: string;
  }
> = {
  1: {
    network: 'ethereum',
    factory: '0xBe061AaBbEe68EAf37aC48d364A92Aa9107ed8c8',
  },
  56: {
    network: 'bnb',
    factory: '0xe62fC391356bD805b10F19d06b4Ed79DD43b644D',
  },
  137: {
    network: 'polygon',
    factory: '0xe62fC391356bD805b10F19d06b4Ed79DD43b644D',
  },
  1868: {
    network: 'soneium mainnet',
    factory: '0x7D86e7e13163E0Bf1C02e548568DD397846Ffb61',
  },
  1946: {
    network: 'soneium minato',
    factory: '0x5caE26592A5ED806dadEa3A9308734F89AD95D7f',
  },
  5000: {
    network: 'mantle',
    factory: '0x47E0a369FB0D47b96aD57f41CC9f68941eec0d0c',
  },
  8453: {
    network: 'base',
    factory: '0x4D6DDbe4Df637769B612352DEd5940595A488fb9',
  },
  42161: {
    network: 'arbitrum one',
    factory: '0x12c233d9ACeC9ce3AaADA74e8D51CCcDe802Bec2',
  },
  43114: {
    network: 'avalanche',
    factory: '0xe62fC391356bD805b10F19d06b4Ed79DD43b644D',
  },
};
