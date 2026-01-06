import type { Pool } from './types';

export const routers: Record<number, `0x${string}`> = {
  [1]: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  [56]: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
  [137]: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  [5000]: '0x4bf659cA398A73AaF73818F0c64c838B9e229c08',
  [5001]: '0xE3a68317a2F1c41E5B2efBCe2951088efB0Cf524',
  [8453]: '0x2626664c2603336E57B271c5C0b26F421741e481',
  [42161]: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  [43114]: '0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE',
  [1868]: '0xd2DdF58Bcc188F335061e41C73ED2A8894c2dD98',
};

export const quoters: Record<number, `0x${string}`> = {
  [1]: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  [56]: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
  [137]: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  [5000]: '0x90f72244294E7c5028aFd6a96E18CC2c1E913995',
  [8453]: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  [42161]: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  [43114]: '0xbe0F5544EC67e9B3b2D979aaA43f18Fd87E6257F',
  [1868]: '0x715BE426a0c8E0A14aBc0130f08F06aa41B1f218',
};

export const pools: Record<number, Pool[]> = {
  [1]: [
    {
      // USDC <> WETH
      token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      fee: 500,
      address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    },
    {
      // LOOT <> WETH
      token0: '0x721a1b990699ee9d90b6327faad0a3e840ae8335',
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      fee: 3000,
      address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
    },
    {
      // WETH <> DEFROGS
      token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      token1: '0xd555498a524612c67f286dF0e0a9a64a73a7Cdc7',
      fee: 10000,
      address: '0x38EaC00C7170AEE9e8D0FeEd6877593792dcbb58',
    },
    {
      // PFPASIA <> WETH
      token0: '0x413530a7beB9Ff6C44e9e6C9001C93B785420C32',
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      fee: 10000,
      address: '0x646946F0518c6Ba27f1B2C6b4387EC6035bC42e3',
    },
  ],
  [56]: [
    {
      // USDC <> WBNB
      token0: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      fee: 500,
      address: '0x81A9b5F18179cE2bf8f001b8a634Db80771F1824',
    },
    {
      // LOOT <> WBNB
      token0: '0x14A9A94E555FDd54C21d7f7E328e61D7eBEce54b',
      token1: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      fee: 2500,
      address: '0x1a4c7af448e4a70cc828ce2fd5680fef5bfbed4e',
    },
  ],
  [137]: [
    {
      // WPOL <> USDC
      token0: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      token1: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      fee: 500,
      address: '0xB6e57ed85c4c9dbfEF2a68711e9d6f36c56e0FcB',
    },
  ],
  [5000]: [
    {
      // WMNT <> LOOT
      token0: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
      token1: '0x94a42083948d86432246eAD625B30d49014A4BFF',
      fee: 10000,
    },
    {
      // WMNT <> FRENS
      token0: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
      token1: '0x827C60AdaBef4419a0B23Fe675FD1827b588CaAc',
      fee: 10000,
    },
    {
      // USDC <> WMNT
      token0: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
      token1: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
      fee: 500,
    },
  ],
  [42161]: [
    {
      // WETH <> USDC
      token0: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      token1: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      address: '0xC6962004f452bE9203591991D15f6b388e09E8D0',
      fee: 500,
    },
  ],
  [43114]: [
    {
      // WAVAX <> USDC
      token0: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
      token1: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      address: '0xfAe3f424a0a47706811521E3ee268f00cFb5c45E',
      fee: 500,
    },
  ],
  [8453]: [
    {
      // WETH <> USDC
      token0: '0x4200000000000000000000000000000000000006',
      token1: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      address: '0xd0b53D9277642d899DF5C87A3966A349A798F224',
      fee: 500,
    },
    {
      // LOOT <> WETH
      token0: '0x4200000000000000000000000000000000000006',
      token1: '0x94a42083948d86432246ead625b30d49014a4bff',
      address: '0x0ac06665379794D9418E1C6F743fBC3dbe02a3BA',
      fee: 3000,
    },
    {
      // WETH <> MYSTCL
      token0: '0x4200000000000000000000000000000000000006',
      token1: '0xDC46c1e93B71fF9209A0F8076a9951569DC35855',
      address: '0xdF5eB97e3E23Ca7F5a5FD2264680377C211310bA',
      fee: 10000,
    },
  ],
  [1868]: [
    {
      // ASTR <> WETH
      token0: '0x2CAE934a1e84F693fbb78CA5ED3B0A6893259441',
      token1: '0x4200000000000000000000000000000000000006',
      address: '0xe15bD143D36E329567aE9A176682AB9fAFc9C3D2',
      fee: 3000,
    },
  ],
};
