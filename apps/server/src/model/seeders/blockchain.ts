import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

type Seeder = (params: MigrationParams<Sequelize>) => Promise<unknown>;

const data = [
  {
    name: 'Ethereum Mainnet',
    chain: 'ETH',
    network: 'mainnet',
    rpc: JSON.stringify([
      'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
      'wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}',
      'https://api.mycryptoapi.com/eth',
      'https://cloudflare-eth.com',
    ]),
    faucets: '[]',
    native_currency: JSON.stringify({
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    }),
    info_url: 'https://ethereum.org',
    short_name: 'eth',
    chain_id: 1,
    network_id: 1,
  },
  {
    name: 'Ethereum Testnet Rinkeby',
    chain: 'Rinkeby',
    network: 'testnet',
    rpc: JSON.stringify([
      'https://rinkeby.infura.io/v3/${INFURA_API_KEY}',
      'wss://rinkeby.infura.io/ws/v3/${INFURA_API_KEY}',
    ]),
    faucets: JSON.stringify(['https://faucet.rinkeby.io']),
    native_currency: JSON.stringify({
      name: 'Rinkeby Ether',
      symbol: 'RIN',
      decimals: 18,
    }),
    info_url: 'https://www.rinkeby.io',
    short_name: 'rin',
    chain_id: 4,
    network_id: 4,
  },
  {
    name: 'Binance Smart Chain Mainnet',
    chain: 'BSC',
    network: 'mainnet',
    rpc: JSON.stringify([
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org',
      'https://bsc-dataseed3.binance.org',
      'https://bsc-dataseed4.binance.org',
      'https://bsc-dataseed1.defibit.io',
      'https://bsc-dataseed2.defibit.io',
      'https://bsc-dataseed3.defibit.io',
      'https://bsc-dataseed4.defibit.io',
      'https://bsc-dataseed1.ninicoin.io',
      'https://bsc-dataseed2.ninicoin.io',
      'https://bsc-dataseed3.ninicoin.io',
      'https://bsc-dataseed4.ninicoin.io',
      'wss://bsc-ws-node.nariox.org',
    ]),
    faucets: JSON.stringify([]),
    native_currency: JSON.stringify({
      name: 'Binance Chain Native Token',
      symbol: 'BNB',
      decimals: 18,
    }),
    info_url: 'https://www.binance.org',
    short_name: 'bnb',
    chain_id: 56,
    network_id: 56,
  },
  {
    name: 'Binance Smart Chain Testnet',
    chain: 'BSC',
    network: 'mainnet',
    rpc: JSON.stringify([
      'https://data-seed-prebsc-1-s1.binance.org:8545',
      'https://data-seed-prebsc-2-s1.binance.org:8545',
      'https://data-seed-prebsc-1-s2.binance.org:8545',
      'https://data-seed-prebsc-2-s2.binance.org:8545',
      'https://data-seed-prebsc-1-s3.binance.org:8545',
      'https://data-seed-prebsc-2-s3.binance.org:8545',
    ]),
    faucets: JSON.stringify(['https://testnet.binance.org/faucet-smart']),
    native_currency: JSON.stringify({
      name: 'Binance Chain Native Token',
      symbol: 'tBNB',
      decimals: 18,
    }),
    info_url: 'https://testnet.binance.org/',
    short_name: 'bnbt',
    chain_id: 97,
    network_id: 97,
  },
  {
    name: 'Matic Mainnet',
    chain: 'Matic',
    network: 'mainnet',
    rpc: JSON.stringify([
      'https://rpc-mainnet.matic.network',
      'wss://ws-mainnet.matic.network',
    ]),
    faucets: JSON.stringify([]),
    native_currency: JSON.stringify({
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18,
    }),
    info_url: 'https://matic.network/',
    short_name: 'matic',
    chain_id: 137,
    network_id: 137,
  },
  {
    name: 'Matic Testnet Mumbai',
    chain: 'Matic',
    network: 'testnet',
    rpc: JSON.stringify([
      'https://rpc-mumbai.matic.today',
      'wss://ws-mumbai.matic.today',
    ]),
    faucets: JSON.stringify(['https://faucet.matic.network/']),
    native_currency: JSON.stringify({
      name: 'Matic',
      symbol: 'tMATIC',
      decimals: 18,
    }),
    info_url: 'https://matic.network/',
    short_name: 'maticmum',
    chain_id: 80001,
    network_id: 80001,
  },
  {
    name: 'Avalanche Mainnet',
    chain: 'AVAX',
    network: 'mainnet',
    rpc: JSON.stringify(['https://api.avax.network/ext/bc/C/rpc']),
    faucets: JSON.stringify([
      'https://free-online-app.com/faucet-for-eth-evm-chains/',
    ]),
    native_currency: JSON.stringify({
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    }),
    info_url: 'https://www.avax.network/',
    short_name: 'Avalanche',
    chain_id: 43114,
    network_id: 43114,
  },
  {
    name: 'Avalanche Fuji Testnet',
    chain: 'AVAX',
    network: 'testnet',
    rpc: JSON.stringify(['https://api.avax-test.network/ext/bc/C/rpc']),
    faucets: JSON.stringify(['https://faucet.avax-test.network/']),
    native_currency: JSON.stringify({
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    }),
    info_url: 'https://cchain.explorer.avax-test.network',
    short_name: 'Fuji',
    chain_id: 43113,
    network_id: 1,
  },
];

export const up: Seeder = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().bulkInsert('blockchain', data);
};

export const down: Seeder = async ({ context: sequelize }) => {
  await sequelize
    .getQueryInterface()
    .bulkDelete('blockchain', { chain_id: data.map((r) => r.chain_id) });
};
