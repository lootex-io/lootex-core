import { GP_PAYMENT_CONTRACT_ABI } from '@/api/v3/account-gp/constants';

export const api = 'https://api-holesky.etherscan.io/api';

export const GP_PAYMASTER_CONTRACT =
  '0x00000f79B7FaF42EEBAdbA19aCc07cD08Af44789';
// 在env中定义 测试环境用 0xae63825c63bffca7088cc5a61afdb1bb041006a2
// export const GP_PAYMASTER_ID = '0x99141283469ff129efc3139f963c511029ac5b66';

export const GP_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'target', type: 'address' }],
    name: 'AddressEmptyCode',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'address', name: 'implementation', type: 'address' },
    ],
    name: 'ERC1967InvalidImplementation',
    type: 'error',
  },
  { inputs: [], name: 'ERC1967NonPayable', type: 'error' },
  { inputs: [], name: 'FailedInnerCall', type: 'error' },
  { inputs: [], name: 'InvalidInitialization', type: 'error' },
  { inputs: [], name: 'NotInitializing', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  { inputs: [], name: 'ReentrancyGuardReentrantCall', type: 'error' },
  { inputs: [], name: 'UUPSUnauthorizedCallContext', type: 'error' },
  {
    inputs: [{ internalType: 'bytes32', name: 'slot', type: 'bytes32' }],
    name: 'UUPSUnsupportedProxiableUUID',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      { indexed: true, internalType: 'address', name: '_to', type: 'address' },
      {
        indexed: true,
        internalType: 'uint256',
        name: '_lootAmount',
        type: 'uint256',
      },
    ],
    name: 'Deposit',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint64',
        name: 'version',
        type: 'uint64',
      },
    ],
    name: 'Initialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'Upgraded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: '_receiver',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Withdraw',
    type: 'event',
  },
  {
    inputs: [],
    name: 'UPGRADE_INTERFACE_VERSION',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERSION',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'baseToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'new_owner', type: 'address' }],
    name: 'changeOwner',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_to', type: 'address' },
      { internalType: 'uint256', name: '_amountOfErc20', type: 'uint256' },
      { internalType: 'uint256', name: '_deadline', type: 'uint256' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'contract IERC20Custom',
        name: '_token',
        type: 'address',
      },
      { internalType: 'address', name: '_owner', type: 'address' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proxiableUUID',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_new_contract', type: 'address' },
    ],
    name: 'setERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'newImplementation', type: 'address' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_receiver', type: 'address' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

export const GP_PAYMASTER_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_owner',
        type: 'address',
      },
      {
        internalType: 'contract IEntryPoint',
        name: '_entryPoint',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_verifyingSigner',
        type: 'address',
      },
    ],
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'uint32',
        name: 'unstakeDelaySec',
        type: 'uint32',
      },
    ],
    name: 'addStake',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'paymasterId',
        type: 'address',
      },
    ],
    name: 'depositFor',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'entryPoint',
    outputs: [
      {
        internalType: 'contract IEntryPoint',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'paymasterId',
        type: 'address',
      },
    ],
    name: 'getBalance',
    outputs: [
      {
        internalType: 'uint256',
        name: 'balance',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDeposit',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            type: 'address',
          },
          {
            type: 'uint256',
          },
          {
            type: 'bytes',
          },
          {
            type: 'bytes',
          },
          {
            type: 'uint256',
          },
          {
            type: 'uint256',
          },
          {
            type: 'uint256',
          },
          {
            type: 'uint256',
          },
          {
            type: 'uint256',
          },
          {
            type: 'bytes',
          },
          {
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation',
        name: 'userOp',
        type: 'tuple',
      },
      {
        internalType: 'address',
        name: 'paymasterId',
        type: 'address',
      },
      {
        internalType: 'uint48',
        name: 'validUntil',
        type: 'uint48',
      },
      {
        internalType: 'uint48',
        name: 'validAfter',
        type: 'uint48',
      },
    ],
    name: 'getHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'paymasterIdBalances',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'enum IPaymaster.PostOpMode',
        name: 'mode',
        type: 'uint8',
      },
      {
        internalType: 'bytes',
        name: 'context',
        type: 'bytes',
      },
      {
        internalType: 'uint256',
        name: 'actualGasCost',
        type: 'uint256',
      },
    ],
    name: 'postOp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_newVerifyingSigner',
        type: 'address',
      },
    ],
    name: 'setSigner',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'setUnaccountedEPGasOverhead',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unlockStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            type: 'address',
          },
          {
            type: 'uint256',
          },
          {
            type: 'bytes',
          },
          {
            type: 'bytes',
          },
          {
            type: 'uint256',
          },
          {
            type: 'uint256',
          },
          {
            type: 'uint256',
          },
          {
            type: 'uint256',
          },
          {
            type: 'uint256',
          },
          {
            type: 'bytes',
          },
          {
            type: 'bytes',
          },
        ],
        internalType: 'struct UserOperation',
        name: 'userOp',
        type: 'tuple',
      },
      {
        internalType: 'bytes32',
        name: 'userOpHash',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'maxCost',
        type: 'uint256',
      },
    ],
    name: 'validatePaymasterUserOp',
    outputs: [
      {
        internalType: 'bytes',
        name: 'context',
        type: 'bytes',
      },
      {
        internalType: 'uint256',
        name: 'validationData',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'verifyingSigner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address payable',
        name: 'withdrawAddress',
        type: 'address',
      },
    ],
    name: 'withdrawStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address payable',
        name: 'withdrawAddress',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'withdrawTo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: '_oldValue',
        type: 'uint256',
      },
      {
        indexed: true,
        name: '_newValue',
        type: 'uint256',
      },
    ],
    name: 'EPGasOverheadChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: '_paymasterId',
        type: 'address',
      },
      {
        indexed: true,
        name: '_charge',
        type: 'uint256',
      },
    ],
    name: 'GasBalanceDeducted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: '_paymasterId',
        type: 'address',
      },
      {
        indexed: true,
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'GasDeposited',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: '_paymasterId',
        type: 'address',
      },
      {
        indexed: true,
        name: '_to',
        type: 'address',
      },
      {
        indexed: true,
        name: '_value',
        type: 'uint256',
      },
    ],
    name: 'GasWithdrawn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: '_oldSigner',
        type: 'address',
      },
      {
        indexed: true,
        name: '_newSigner',
        type: 'address',
      },
      {
        indexed: true,
        name: '_actor',
        type: 'address',
      },
    ],
    name: 'VerifyingSignerChanged',
    type: 'event',
  },
  {
    inputs: [],
    name: 'CanNotWithdrawToZeroAddress',
    type: 'error',
  },
  {
    inputs: [],
    name: 'DepositCanNotBeZero',
    type: 'error',
  },
  {
    inputs: [],
    name: 'EntryPointCannotBeZero',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amountRequired',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'currentBalance',
        type: 'uint256',
      },
    ],
    name: 'InsufficientBalance',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'sigLength',
        type: 'uint256',
      },
    ],
    name: 'InvalidPaymasterSignatureLength',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PaymasterIdCannotBeZero',
    type: 'error',
  },
  {
    inputs: [],
    name: 'VerifyingSignerCannotBeZero',
    type: 'error',
  },
];

/**
 * GP 充值合约
 */
// export const GP_TOPUP_PROJECTS_DEV = [
//   {
//     name: 'Game-Point',
//     chainId: 5000,
//     contractAddress: '0x2a2eC968fd65CC6D13272F3C6204dB565bdeaE7B',
//     abi: GP_ABI,
//     pollingBatch: 100,
//   },
// ];
export const GP_TOPUP_PROJECTS =
  process.env.NODE_ENV === 'production'
    ? [
        // production usage
        {
          name: 'Game-Point-TopUp-eth',
          chainId: 1,
          contractAddress: '0x6b85FAD5c1E501df1883601D510Fb0303af1d652',
          abi: GP_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-TopUp-bsc',
          chainId: 56,
          contractAddress: '0x9f40179DcE670d35adBca962De7d4606F93dB369',
          abi: GP_ABI,
          pollingBatch: 100,
        },
        {
          name: 'Game-Point-TopUp-mantle',
          chainId: 5000,
          contractAddress: '0x827Dd6eDbf1458d5fdE840D20C099E43c8BB95D3',
          abi: GP_ABI,
          pollingBatch: 100,
        },
        {
          name: 'Game-Point-TopUp-base',
          chainId: 8453,
          contractAddress: '0xe8433F395D559dE8F0994A7Dfd4937E5aAcD7a2B',
          abi: GP_ABI,
          pollingBatch: 100,
        },
      ] // dev usage 待更新
    : [
        {
          name: 'Game-Point-TopUp-eth',
          chainId: 1,
          contractAddress: '0x501eF02f0dB0b85b43cAF34aD33929A528BCCD01',
          abi: GP_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-TopUp-bsc',
          chainId: 56,
          contractAddress: '0x3dc89C18105aA8DE3F912DDA41dFFb5A41cf9790',
          abi: GP_ABI,
          pollingBatch: 100,
        },
        {
          name: 'Game-Point-TopUp-mantle',
          chainId: 5000,
          contractAddress: '0xC818781011f2ACD41eE1dB96F29D548F15dFa3bd',
          abi: GP_ABI,
          pollingBatch: 100,
        },
        {
          name: 'Game-Point-TopUp-base',
          chainId: 8453,
          contractAddress: '0x58b2be06f44d91ee650c6b182C4dcCA3f92d1FF2',
          abi: GP_ABI,
          pollingBatch: 100,
        },
      ];

export const GP_PURCHASE_PROJECTS =
  process.env.NODE_ENV === 'production'
    ? [
        // production usage
        {
          name: 'Game-Point-Purchase-base',
          chainId: 8453,
          contractAddress: '0xC21Fa127aae72575058dcEb612094B91210Dde4F',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-arbitrum',
          chainId: 42161,
          contractAddress: '0xE05dbA9962dB6FcAbe030d83010DED8a278f0cBA',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-avalanche',
          chainId: 43114,
          contractAddress: '0x8D02Aa00789B4cc1c0424B36696cCec967285A50',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-bsc',
          chainId: 56,
          contractAddress: '0x8D02Aa00789B4cc1c0424B36696cCec967285A50',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-mantle',
          chainId: 5000,
          contractAddress: '0xcd6AD6Af9FA955c1254fEa5eD52f5470716bc21B',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-polygon',
          chainId: 137,
          contractAddress: '0x6c214Ed20057E75C21517dDF0a1fb37Ca91097ac',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-soneium-minato',
          chainId: 1946,
          contractAddress: '0x8fE8b3cCb67284d84DB404a839345DdC6404012c',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-soneium',
          chainId: 1868,
          contractAddress: '0x637B6E07b96CaF12b810c462209CeCdB487Af31C',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-ethereum',
          chainId: 1,
          contractAddress: '0xb03aaf70191c22d1410d72c3ca9a86ae9eb9942c',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
      ]
    : [
        // dev usage
        {
          name: 'Game-Point-Purchase-base',
          chainId: 8453,
          contractAddress: '0xade5B1c74ceEc3072032DD60dd5A53f2ad4D473C',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-arbitrum',
          chainId: 42161,
          contractAddress: '0x99e22D8A24e8dbcf8d0A798b7832143e50dc1f8f',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-avalanche',
          chainId: 43114,
          contractAddress: '0x2510285eb5b1E2C9A8ee1DA55196Fe29174108A8',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-bsc',
          chainId: 56,
          contractAddress: '0x9770de5f05a0c04d5F50d0D1d899D5C872ddB062',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-mantle',
          chainId: 5000,
          contractAddress: '0xC839E3fEE3d5d4eeB986c6CdD7cBaF8452048083',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-polygon',
          chainId: 137,
          contractAddress: '0xE6F5EAcFf2a818d3Eb35330D232acF9F9c4322BA',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-soneium-minato',
          chainId: 1946,
          contractAddress: '0x47C592445d4aBA2E1488A29115764F2B1A133Dd0',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-soneium',
          chainId: 1868,
          contractAddress: '0x078Cc34862046e971d388d8B12dE3332a9F39D67',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
        {
          name: 'Game-Point-Purchase-ethereum',
          chainId: 1,
          contractAddress: '0xe0469f0BeeFf05EFFD5C46d35043079db9f1bFe3',
          abi: GP_PAYMENT_CONTRACT_ABI,
          pollingBatch: 50,
        },
      ];
