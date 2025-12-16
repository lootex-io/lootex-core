import { Chain } from '@/common/libs/libs.service';
import { ActiveChainConfig } from '@/common/utils/chain.config';

// if you want to run new chain, add it here
export const SupportedChains = [
  ActiveChainConfig.name as Chain,
];

export const chainIds = {
  [ActiveChainConfig.name]: ActiveChainConfig.id,
};

// chain blocktime (in milliseconds)
export const chainBlocktime = {
  [ActiveChainConfig.name]: ActiveChainConfig.blockTimeMs,
};

export const POLLER_CONVERSION_RATE = 1;
export const POLLER_RETRY_DELAY = 5000;
export const POLLER_RETRY_LIMIT = 5;
export const PollingBatch = {
  [ActiveChainConfig.name]: 100, // Default batch size
};

export const PollingInterval = {
  [ActiveChainConfig.name]: 10000, // Default interval 10s
};

// export const ChainPerBlockTime = {
//   '1': 12, // eth https://etherscan.io/chart/blocktime
//   '56': 3, // bsc https://www.google.com/search?q=bnb+average+block+time
//   '137': 2, // polygon https://polygonscan.com/chart/blocktime
//   '43114': 2, // avalanche https://www.google.com/search?q=avax+averge+block+time
//   '42161': 0.26, // arbitrum https://officercia.mirror.xyz/d798TVQyA1ALq3qr1R9vvujdF7x-erXxK2wQWwbgRKY#:~:text=Arbitrum%20average%20block%20time%3A%20~0.26s%3B
//   '5000': 0.35, // mantle https://docs.mantle.xyz/network/introduction/faqs, https://explorer.mantle.xyz/blocks
// };

// old
export const SeaportAddress = {
  [ActiveChainConfig.name]: ActiveChainConfig.contracts.seaport[0] || '',
};
export const SeaportAddresses: {
  [key: string]: string[];
} = {
  [ActiveChainConfig.name]: ActiveChainConfig.contracts.seaport,
};

export const AggregatorAddresses: Record<number, `0x${string}`> = {
  [ActiveChainConfig.id]: ActiveChainConfig.contracts.aggregator as `0x${string}`,
};

/**
 * Lootex Seaport Addresses
 */
export const LootexSeaportAddressArray = [
  '0xBb7C4d295A1f72e52A2398F6e32A9166C70BfF79', // eth Saori https://etherscan.io/address/0xbb7c4d295a1f72e52a2398f6e32a9166c70bff79
  '0xC64E66041935Be181F94136b9E9e23E95CeDebb0', // bnb Saori https://bscscan.com/address/0xc64e66041935be181f94136b9e9e23e95cedebb0
  '0xF1abf805788c8607B44D677Bb44031B2e226be2B', // polygon Saori https://polygonscan.com/address/0xf1abf805788c8607b44d677bb44031b2e226be2b
  '0xB1a8c24108fd0Ca271ea332676Ef4ded5e484D23', // avax Saori https://cchain.explorer.avax.network/address/0xb1a8c24108fd0ca271ea332676ef4ded5e484d23/transactions
  '0xdC246FB0Cc491B94e3cFAFdD659c31b9111b2ED2', // arbi Saori https://arbiscan.io/address/0xdc246fb0cc491b94e3cfafdd659c31b9111b2ed2
  '0x37507a230Cd7b2180842b46F536410493a923DAB', // mnt Saori https://explorer.mantle.xyz/address/0x37507a230cd7b2180842b46f536410493a923dab/transactions
  '0x54E7f9282736e8e965e99CFb7491C31A1f5a00cC', // base Saori https://basescan.org/address/0x54e7f9282736e8e965e99cfb7491c31a1f5a00cc#code
  '0x804b1e49cdf3cd3cf309f14bf6ccb47dfe64f7bb', // soneium Minato Saori https://explorer-testnet.soneium.org/address/0x804B1e49cdf3cD3cF309F14BF6CCB47dfe64f7BB?tab=contract
  '0x5C019E4D86CD7Fa9a8c1C3d9D53FF90b3198705d', // Lootex Seaport 1.6 (eth, avax, arbi, base)
  '0xC8D03c8456B6dd7d32579B4764b01dB2F05B5310', // Lootex Seaport 1.6 (bsc, mnt)
  '0xED5c25804fB00df98Fe54516509c19531A0fBBe4', // Lootex Seaport 1.6 (polygon)
  '0xa313d4f11e69a320a68167e7aafacea8f3413593', // soneium Saori https://explorer.soneium.org/address/0xa313d4f11e69a320a68167e7aafacea8f3413593

  // Testnet
  // '0x00000000000001ad428e4906ae43d8f9852d0dd6', // OpenSea Seaport https://mumbai.polygonscan.com/address/0x00000000000001ad428e4906ae43d8f9852d0dd6
];

export function getSoldItemEmailHtmlTemplate({
  tokenId,
  tokenName,
  tokenImageUrl,
  chainShortName,
  contractAddress,
  collectionName,
}: {
  tokenId: string;
  tokenName: string;
  tokenImageUrl: string;
  chainShortName: string;
  contractAddress: string;
  collectionName: string;
}): string {
  return `
  <!DOCTYPE html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <div style="background-color: #DCDADC; width: 100%;">
    <div style="margin: 0 auto; max-width: 600px; width: 100%;font-family: Helvetica, Arial, sans-serif; background-color: #FAF9FA;">
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <div
          style="width: 100%; height: 8px; background-color: #ff0088;"
        ></div>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <img style="width: 110px;" src="https://lootex-dev-s3-cdn.imgix.net/Lootex.png" alt=""/>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <div style="font-size: 40px; font-weight: 700; color: #191319;">Item Saled</div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <div style="color: #4D464D; font-size: 16px; line-height: 25px;">
            <div style="margin-bottom: 8px">Hi,</div>
            <div>
              Your item has been sold !
            </div>
          </div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td align="center"  style="padding-top: 48px; padding-left: 32px; padding-right: 32px">
          <div style="padding-top: 25px; padding-bottom: 25px; background-color: #DCDADC; color: #191319; font-size: 16px; font-weight: 700; border-radius: 16px; letter-spacing: 0.24em;">
              ${collectionName} #${tokenId}
              <br>
              ${tokenName}
              <br><br>
              <img
                style="height: 256px; width: 256px;"
                src="${tokenImageUrl}"
                alt="Default Image"
                onerror="this.outerHTML = \`<svg viewBox='0 0 595.28 595.28' focusable='false' class='chakra-icon css-1u9k2wq' width='256px' height='256px'><path fill-rule='evenodd' d='M405.66,245.33c14.67-54.74-17.75-110.98-72.4-125.62-54.65-14.64-110.85,17.86-125.52,72.59-8.61,32.14-.99,64.81,17.84,89.26-6.37,2.63-12.47,5.89-18.19,9.73l-27.85-131.01c-.1-.45-.62-.66-1-.39l-72.45,50.73c-1.27.89-1.89,2.46-1.57,3.98l28.51,134.1c.3,1.42,1.38,2.56,2.79,2.93l27.68,7.42c-9,51.74,22.78,102.69,74.41,116.52,54.65,14.64,110.85-17.86,125.52-72.59,6.11-22.81,4.05-45.87-4.39-66.09l10.04-5.79c.38-.22.86,0,.95.42l17.62,82.86c.3,1.42,1.38,2.56,2.78,2.94l78.29,20.98c.47.12.9-.29.8-.76l-30.55-143.7c-.35-1.64.4-3.32,1.85-4.16l36.09-20.84c1.45-.84,2.2-2.52,1.85-4.16l-9.25-43.49c-.09-.42-.56-.64-.93-.44l-66.44,35.37c1.36-3.49,2.54-7.09,3.53-10.79Z'></path></svg>\`"
              />
              <br><br>
              chain: ${chainShortName}
              <br>
              contract address: ${contractAddress}
          </div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="font-size: 16px; line-height: 25px; padding-top: 8px; text-align: center; color: #191319;">
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <div style="font-weight: 700; color: #4D464D; font-size: 16px; line-height: 25px;">Lootex Customer Support Team</div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 8px; padding-left: 32px; padding-right: 32px;">
          <div style="color: #4D464D; font-size: 16px; line-height: 25px;">
            This is an automated email. Please do not reply directly to this email
            address.
          </div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 8px; padding-left: 32px; padding-right: 32px;">
          <div style="color: #4D464D; font-size: 16px; line-height: 25px;">
            If you didn’t attempt to sign up but received this email, and please ignore this email.
          </div>
          <div style="color: #4D464D; font-size: 16px; line-height: 25px;">
            If you encounter any issue, please submit a ticket here : <a href="https://portal.lootex.io/en/support/home">https://portal.lootex.io/en/support/home</a>
        </div>
        </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <hr style="width: 100%; border: 1px solid #C7C4C7" />
        </td>
      </table>
      <table align="center" width="240px" border="0" cellspacing="0" cellpadding="0" style="padding-top: 48px; border-spacing: 8px;">
          <td align="center"  style="border: 1px solid #C7C4C7; border-radius: 16px; padding: 12px;">
            <a style="display: block; line-height: 0;height: 24px;" href="https://twitter.com/LootexIO" >
              <img style="height: 24px; width: 24px; filter: invert(1);" src="https://lootex-dev-s3-cdn.imgix.net/twitter.png" alt=""/>
            </a>
          </td>
          <td align="center" style="border: 1px solid #C7C4C7; border-radius: 16px; padding: 12px;">
            <a style="display: block; line-height: 0;height: 24px;" href="https://www.facebook.com/lootexio/" >
              <img style="height: 24px; width: 24px; filter: invert(1);" src="https://lootex-dev-s3-cdn.imgix.net/facebook.png" alt=""/>
            </a>
          </td>
          <td align="center" style="border: 1px solid #C7C4C7; border-radius: 16px; padding: 12px;">
            <a style="display: block; line-height: 0;height: 24px;" href="https://medium.com/lootex" >
              <img style="height: 24px; width: 24px; filter: invert(1);" src="https://lootex-dev-s3-cdn.imgix.net/medium.png" alt=""/>
            </a>
          </td>
          <td align="center" style="border: 1px solid #C7C4C7; border-radius: 16px; padding: 12px;">
            <a style="display: block; line-height: 0;height: 24px;" href="https://discord.com/invite/n48APrVumK" >
              <img style="height: 24px; width: 24px; filter: invert(1);" src="https://lootex-dev-s3-cdn.imgix.net/discord.png" alt=""/>
            </a>
          </td>
      </table>
      <table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">
        <td style="padding-top: 48px; padding-left: 32px; padding-right: 32px;">
          <div style="color: #4D464D; font-size: 12px; line-height: 25px; text-align: center;">
            © 2023 Lootex. All rights reserved.
          </div>
        </td>
      </table>
    </div>
  </div>
</html>
`;
}

export const BLOCK_TAG = 'latest';
export const ORDER_FULFILLED_SIGNATURE =
  'OrderFulfilled(bytes32,address,address,address,(uint8,address,uint256,uint256)[],(uint8,address,uint256,uint256,address)[])';
export const ORDER_CANCELLED_SIGNATURE =
  'OrderCancelled(bytes32,address,address)';
export const ORDER_VALIDATED_SIGNATURE =
  'OrderValidated(bytes32,address,address)';
export const COUNTER_INCREMENTED_SIGNATURE =
  'CounterIncremented(uint256,address)';
export const SEAPORT_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'conduitController',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'BadContractSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'BadFraction',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'BadReturnValueFromERC20OnTransfer',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint8',
        name: 'v',
        type: 'uint8',
      },
    ],
    name: 'BadSignatureV',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ConsiderationCriteriaResolverOutOfRange',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'orderIndex',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'considerationIndex',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'shortfallAmount',
        type: 'uint256',
      },
    ],
    name: 'ConsiderationNotMet',
    type: 'error',
  },
  {
    inputs: [],
    name: 'CriteriaNotEnabledForItem',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'identifiers',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    name: 'ERC1155BatchTransferGenericFailure',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'EtherTransferGenericFailure',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InexactFraction',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InsufficientEtherSupplied',
    type: 'error',
  },
  {
    inputs: [],
    name: 'Invalid1155BatchTransferEncoding',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidBasicOrderParameterEncoding',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'conduit',
        type: 'address',
      },
    ],
    name: 'InvalidCallToConduit',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidCanceller',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'conduitKey',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'conduit',
        type: 'address',
      },
    ],
    name: 'InvalidConduit',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidERC721TransferAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidFulfillmentComponentData',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'InvalidMsgValue',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidNativeOfferItem',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidProof',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'InvalidRestrictedOrder',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidSignature',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidSigner',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidTime',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MismatchedFulfillmentOfferAndConsiderationComponents',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'enum Side',
        name: 'side',
        type: 'uint8',
      },
    ],
    name: 'MissingFulfillmentComponentOnAggregation',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MissingItemAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'MissingOriginalConsiderationItems',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'NoContract',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoReentrantCalls',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoSpecifiedOrdersAvailable',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OfferAndConsiderationRequiredOnFulfillment',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OfferCriteriaResolverOutOfRange',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderAlreadyFilled',
    type: 'error',
  },
  {
    inputs: [],
    name: 'OrderCriteriaResolverOutOfRange',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderIsCancelled',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderPartiallyFilled',
    type: 'error',
  },
  {
    inputs: [],
    name: 'PartialFillsNotEnabledForOrder',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'identifier',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TokenTransferGenericFailure',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UnresolvedConsiderationCriteria',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UnresolvedOfferCriteria',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UnusedItemParameters',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newCounter',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
    ],
    name: 'CounterIncremented',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'zone',
        type: 'address',
      },
    ],
    name: 'OrderCancelled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'zone',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'enum ItemType',
            name: 'itemType',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
        ],
        indexed: false,
        internalType: 'struct SpentItem[]',
        name: 'offer',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'enum ItemType',
            name: 'itemType',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
          {
            internalType: 'address payable',
            name: 'recipient',
            type: 'address',
          },
        ],
        indexed: false,
        internalType: 'struct ReceivedItem[]',
        name: 'consideration',
        type: 'tuple[]',
      },
    ],
    name: 'OrderFulfilled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'zone',
        type: 'address',
      },
    ],
    name: 'OrderValidated',
    type: 'event',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'zone',
            type: 'address',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
            ],
            internalType: 'struct OfferItem[]',
            name: 'offer',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ConsiderationItem[]',
            name: 'consideration',
            type: 'tuple[]',
          },
          {
            internalType: 'enum OrderType',
            name: 'orderType',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'startTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endTime',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'zoneHash',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'counter',
            type: 'uint256',
          },
        ],
        internalType: 'struct OrderComponents[]',
        name: 'orders',
        type: 'tuple[]',
      },
    ],
    name: 'cancel',
    outputs: [
      {
        internalType: 'bool',
        name: 'cancelled',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'uint120',
            name: 'numerator',
            type: 'uint120',
          },
          {
            internalType: 'uint120',
            name: 'denominator',
            type: 'uint120',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'extraData',
            type: 'bytes',
          },
        ],
        internalType: 'struct AdvancedOrder',
        name: 'advancedOrder',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'enum Side',
            name: 'side',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'index',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'struct CriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      {
        internalType: 'bytes32',
        name: 'fulfillerConduitKey',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
    ],
    name: 'fulfillAdvancedOrder',
    outputs: [
      {
        internalType: 'bool',
        name: 'fulfilled',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'uint120',
            name: 'numerator',
            type: 'uint120',
          },
          {
            internalType: 'uint120',
            name: 'denominator',
            type: 'uint120',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'extraData',
            type: 'bytes',
          },
        ],
        internalType: 'struct AdvancedOrder[]',
        name: 'advancedOrders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'enum Side',
            name: 'side',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'index',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'struct CriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'itemIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct FulfillmentComponent[][]',
        name: 'offerFulfillments',
        type: 'tuple[][]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'itemIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct FulfillmentComponent[][]',
        name: 'considerationFulfillments',
        type: 'tuple[][]',
      },
      {
        internalType: 'bytes32',
        name: 'fulfillerConduitKey',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'maximumFulfilled',
        type: 'uint256',
      },
    ],
    name: 'fulfillAvailableAdvancedOrders',
    outputs: [
      {
        internalType: 'bool[]',
        name: 'availableOrders',
        type: 'bool[]',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifier',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Execution[]',
        name: 'executions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct Order[]',
        name: 'orders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'itemIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct FulfillmentComponent[][]',
        name: 'offerFulfillments',
        type: 'tuple[][]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'itemIndex',
            type: 'uint256',
          },
        ],
        internalType: 'struct FulfillmentComponent[][]',
        name: 'considerationFulfillments',
        type: 'tuple[][]',
      },
      {
        internalType: 'bytes32',
        name: 'fulfillerConduitKey',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'maximumFulfilled',
        type: 'uint256',
      },
    ],
    name: 'fulfillAvailableOrders',
    outputs: [
      {
        internalType: 'bool[]',
        name: 'availableOrders',
        type: 'bool[]',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifier',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Execution[]',
        name: 'executions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'considerationToken',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'considerationIdentifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'considerationAmount',
            type: 'uint256',
          },
          {
            internalType: 'address payable',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'zone',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'offerToken',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'offerIdentifier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'offerAmount',
            type: 'uint256',
          },
          {
            internalType: 'enum BasicOrderType',
            name: 'basicOrderType',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'startTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endTime',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'zoneHash',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'offererConduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'fulfillerConduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'totalOriginalAdditionalRecipients',
            type: 'uint256',
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct AdditionalRecipient[]',
            name: 'additionalRecipients',
            type: 'tuple[]',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct BasicOrderParameters',
        name: 'parameters',
        type: 'tuple',
      },
    ],
    name: 'fulfillBasicOrder',
    outputs: [
      {
        internalType: 'bool',
        name: 'fulfilled',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct Order',
        name: 'order',
        type: 'tuple',
      },
      {
        internalType: 'bytes32',
        name: 'fulfillerConduitKey',
        type: 'bytes32',
      },
    ],
    name: 'fulfillOrder',
    outputs: [
      {
        internalType: 'bool',
        name: 'fulfilled',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'offerer',
        type: 'address',
      },
    ],
    name: 'getCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: 'counter',
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
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'zone',
            type: 'address',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
            ],
            internalType: 'struct OfferItem[]',
            name: 'offer',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'startAmount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endAmount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ConsiderationItem[]',
            name: 'consideration',
            type: 'tuple[]',
          },
          {
            internalType: 'enum OrderType',
            name: 'orderType',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'startTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'endTime',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'zoneHash',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'counter',
            type: 'uint256',
          },
        ],
        internalType: 'struct OrderComponents',
        name: 'order',
        type: 'tuple',
      },
    ],
    name: 'getOrderHash',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'getOrderStatus',
    outputs: [
      {
        internalType: 'bool',
        name: 'isValidated',
        type: 'bool',
      },
      {
        internalType: 'bool',
        name: 'isCancelled',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'totalFilled',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalSize',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'incrementCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: 'newCounter',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'information',
    outputs: [
      {
        internalType: 'string',
        name: 'version',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'domainSeparator',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'conduitController',
        type: 'address',
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
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'uint120',
            name: 'numerator',
            type: 'uint120',
          },
          {
            internalType: 'uint120',
            name: 'denominator',
            type: 'uint120',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'extraData',
            type: 'bytes',
          },
        ],
        internalType: 'struct AdvancedOrder[]',
        name: 'advancedOrders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'orderIndex',
            type: 'uint256',
          },
          {
            internalType: 'enum Side',
            name: 'side',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'index',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'identifier',
            type: 'uint256',
          },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'struct CriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'uint256',
                name: 'orderIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'itemIndex',
                type: 'uint256',
              },
            ],
            internalType: 'struct FulfillmentComponent[]',
            name: 'offerComponents',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'orderIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'itemIndex',
                type: 'uint256',
              },
            ],
            internalType: 'struct FulfillmentComponent[]',
            name: 'considerationComponents',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct Fulfillment[]',
        name: 'fulfillments',
        type: 'tuple[]',
      },
    ],
    name: 'matchAdvancedOrders',
    outputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifier',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Execution[]',
        name: 'executions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct Order[]',
        name: 'orders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            components: [
              {
                internalType: 'uint256',
                name: 'orderIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'itemIndex',
                type: 'uint256',
              },
            ],
            internalType: 'struct FulfillmentComponent[]',
            name: 'offerComponents',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'orderIndex',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'itemIndex',
                type: 'uint256',
              },
            ],
            internalType: 'struct FulfillmentComponent[]',
            name: 'considerationComponents',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct Fulfillment[]',
        name: 'fulfillments',
        type: 'tuple[]',
      },
    ],
    name: 'matchOrders',
    outputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'enum ItemType',
                name: 'itemType',
                type: 'uint8',
              },
              {
                internalType: 'address',
                name: 'token',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'identifier',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'address payable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'struct ReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'offerer',
            type: 'address',
          },
          {
            internalType: 'bytes32',
            name: 'conduitKey',
            type: 'bytes32',
          },
        ],
        internalType: 'struct Execution[]',
        name: 'executions',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [
      {
        internalType: 'string',
        name: 'contractName',
        type: 'string',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: 'address',
                name: 'offerer',
                type: 'address',
              },
              {
                internalType: 'address',
                name: 'zone',
                type: 'address',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct OfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enum ItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  {
                    internalType: 'address',
                    name: 'token',
                    type: 'address',
                  },
                  {
                    internalType: 'uint256',
                    name: 'identifierOrCriteria',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'startAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'endAmount',
                    type: 'uint256',
                  },
                  {
                    internalType: 'address payable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'struct ConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enum OrderType',
                name: 'orderType',
                type: 'uint8',
              },
              {
                internalType: 'uint256',
                name: 'startTime',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'endTime',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'zoneHash',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'salt',
                type: 'uint256',
              },
              {
                internalType: 'bytes32',
                name: 'conduitKey',
                type: 'bytes32',
              },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'struct OrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes',
          },
        ],
        internalType: 'struct Order[]',
        name: 'orders',
        type: 'tuple[]',
      },
    ],
    name: 'validate',
    outputs: [
      {
        internalType: 'bool',
        name: 'validated',
        type: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
