export const ERC721_TRANSFER_TOPIC0 =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ERC1155_TRANSFER_SINGLE_TOPIC0 =
  '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62';
export const ERC1155_TRANSFER_BATCH_TOPIC0 =
  '0x4e2915f7c0a7f1c0b5a6c8d4a1f3f0c8e7d2d4d0a8b5c2c6e7d3a9c7a8e7d2d4';
export const LOOTEX_SEAPORT_FULFILL_ORDER_TOPIC0 =
  '0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31';
export const LOOTEX_SEAPORT_CANCEL_ORDER_TOPIC0 =
  '0x6bacc01dbe442496068f7d234edd811f1a5f833243e0aec824f86ab861f3c90d';
export const FUSIONX_V3_SWAP_TOPIC0 =
  '0x19b47279256b2a23a1665c810c8d55a1758940ee09377d4f8d26497a3577dc83';
export const UNISWAP_V3_SWAP_TOPIC0 =
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
export const FUSIONX_V3_FRENS_WMNT_POOL_ADDRESS =
  '0xb0af0176877736d0e61ba0554f7c8f2d9aea3a7f';

export const OpenseaSeaportAddresses = [
  '0x00000000006c3852cbEf3e08E8dF289169EdE581', // Seaport 1.1
  '0x00000000000006c7676171937C444f6BDe3D6282', // Seaport 1.2*
  '0x0000000000000aD24e80fd803C6ac37206a45f15', // Seaport 1.3*
  '0x00000000000001ad428e4906aE43D8F9852d0dD6', // Seaport 1.4*
  '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Seaport 1.5
  '0x0000000000000068F116a894984e2DB1123eB395', // Seaport 1.6
];

export const COLLECTION_BEST_LISTING_KEY = 'collectionBestListing';
export const COLLECTION_BEST_OFFER_KEY = 'collectionBestOffer';

export const EIP_712_ORDER_TYPE = {
  OrderComponents: [
    { name: 'offerer', type: 'address' },
    { name: 'zone', type: 'address' },
    { name: 'offer', type: 'OfferItem[]' },
    { name: 'consideration', type: 'ConsiderationItem[]' },
    { name: 'orderType', type: 'uint8' },
    { name: 'startTime', type: 'uint256' },
    { name: 'endTime', type: 'uint256' },
    { name: 'zoneHash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' },
    { name: 'conduitKey', type: 'bytes32' },
    { name: 'counter', type: 'uint256' },
  ],
  OfferItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
  ],
  ConsiderationItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
  ],
};

export const EIP_712_BULK_ORDER_TYPE = {
  BulkOrder: [{ name: 'tree', type: 'OrderComponents[2][2]' }],
  OrderComponents: [
    { name: 'offerer', type: 'address' },
    { name: 'zone', type: 'address' },
    { name: 'offer', type: 'OfferItem[]' },
    { name: 'consideration', type: 'ConsiderationItem[]' },
    { name: 'orderType', type: 'uint8' },
    { name: 'startTime', type: 'uint256' },
    { name: 'endTime', type: 'uint256' },
    { name: 'zoneHash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' },
    { name: 'conduitKey', type: 'bytes32' },
    { name: 'counter', type: 'uint256' },
  ],
  OfferItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
  ],
  ConsiderationItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
  ],
};

export const Seaport_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'conduitController', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'offerer', type: 'address' },
          { internalType: 'address', name: 'zone', type: 'address' },
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              { internalType: 'uint256', name: 'startAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'endAmount', type: 'uint256' },
            ],
            internalType: 'structOfferItem[]',
            name: 'offer',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              { internalType: 'uint256', name: 'startAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'endAmount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structConsiderationItem[]',
            name: 'consideration',
            type: 'tuple[]',
          },
          { internalType: 'enumOrderType', name: 'orderType', type: 'uint8' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
          { internalType: 'uint256', name: 'salt', type: 'uint256' },
          { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
          { internalType: 'uint256', name: 'counter', type: 'uint256' },
        ],
        internalType: 'structOrderComponents[]',
        name: 'orders',
        type: 'tuple[]',
      },
    ],
    name: 'cancel',
    outputs: [{ internalType: 'bool', name: 'cancelled', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'offerer', type: 'address' },
              { internalType: 'address', name: 'zone', type: 'address' },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                internalType: 'structOfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                    internalType: 'addresspayable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'structConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enumOrderType',
                name: 'orderType',
                type: 'uint8',
              },
              { internalType: 'uint256', name: 'startTime', type: 'uint256' },
              { internalType: 'uint256', name: 'endTime', type: 'uint256' },
              { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
              { internalType: 'uint256', name: 'salt', type: 'uint256' },
              { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'structOrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          { internalType: 'uint120', name: 'numerator', type: 'uint120' },
          { internalType: 'uint120', name: 'denominator', type: 'uint120' },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
          { internalType: 'bytes', name: 'extraData', type: 'bytes' },
        ],
        internalType: 'structAdvancedOrder',
        name: 'advancedOrder',
        type: 'tuple',
      },
      {
        components: [
          { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
          { internalType: 'enumSide', name: 'side', type: 'uint8' },
          { internalType: 'uint256', name: 'index', type: 'uint256' },
          { internalType: 'uint256', name: 'identifier', type: 'uint256' },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'structCriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      { internalType: 'bytes32', name: 'fulfillerConduitKey', type: 'bytes32' },
      { internalType: 'address', name: 'recipient', type: 'address' },
    ],
    name: 'fulfillAdvancedOrder',
    outputs: [{ internalType: 'bool', name: 'fulfilled', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'offerer', type: 'address' },
              { internalType: 'address', name: 'zone', type: 'address' },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                internalType: 'structOfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                    internalType: 'addresspayable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'structConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enumOrderType',
                name: 'orderType',
                type: 'uint8',
              },
              { internalType: 'uint256', name: 'startTime', type: 'uint256' },
              { internalType: 'uint256', name: 'endTime', type: 'uint256' },
              { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
              { internalType: 'uint256', name: 'salt', type: 'uint256' },
              { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'structOrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          { internalType: 'uint120', name: 'numerator', type: 'uint120' },
          { internalType: 'uint120', name: 'denominator', type: 'uint120' },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
          { internalType: 'bytes', name: 'extraData', type: 'bytes' },
        ],
        internalType: 'structAdvancedOrder[]',
        name: 'advancedOrders',
        type: 'tuple[]',
      },
      {
        components: [
          { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
          { internalType: 'enumSide', name: 'side', type: 'uint8' },
          { internalType: 'uint256', name: 'index', type: 'uint256' },
          { internalType: 'uint256', name: 'identifier', type: 'uint256' },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'structCriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      {
        components: [
          { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
          { internalType: 'uint256', name: 'itemIndex', type: 'uint256' },
        ],
        internalType: 'structFulfillmentComponent[][]',
        name: 'offerFulfillments',
        type: 'tuple[][]',
      },
      {
        components: [
          { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
          { internalType: 'uint256', name: 'itemIndex', type: 'uint256' },
        ],
        internalType: 'structFulfillmentComponent[][]',
        name: 'considerationFulfillments',
        type: 'tuple[][]',
      },
      { internalType: 'bytes32', name: 'fulfillerConduitKey', type: 'bytes32' },
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'maximumFulfilled', type: 'uint256' },
    ],
    name: 'fulfillAvailableAdvancedOrders',
    outputs: [
      { internalType: 'bool[]', name: 'availableOrders', type: 'bool[]' },
      {
        components: [
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint256', name: 'identifier', type: 'uint256' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          { internalType: 'address', name: 'offerer', type: 'address' },
          { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
        ],
        internalType: 'structExecution[]',
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
              { internalType: 'address', name: 'offerer', type: 'address' },
              { internalType: 'address', name: 'zone', type: 'address' },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                internalType: 'structOfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                    internalType: 'addresspayable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'structConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enumOrderType',
                name: 'orderType',
                type: 'uint8',
              },
              { internalType: 'uint256', name: 'startTime', type: 'uint256' },
              { internalType: 'uint256', name: 'endTime', type: 'uint256' },
              { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
              { internalType: 'uint256', name: 'salt', type: 'uint256' },
              { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'structOrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'structOrder[]',
        name: 'orders',
        type: 'tuple[]',
      },
      {
        components: [
          { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
          { internalType: 'uint256', name: 'itemIndex', type: 'uint256' },
        ],
        internalType: 'structFulfillmentComponent[][]',
        name: 'offerFulfillments',
        type: 'tuple[][]',
      },
      {
        components: [
          { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
          { internalType: 'uint256', name: 'itemIndex', type: 'uint256' },
        ],
        internalType: 'structFulfillmentComponent[][]',
        name: 'considerationFulfillments',
        type: 'tuple[][]',
      },
      { internalType: 'bytes32', name: 'fulfillerConduitKey', type: 'bytes32' },
      { internalType: 'uint256', name: 'maximumFulfilled', type: 'uint256' },
    ],
    name: 'fulfillAvailableOrders',
    outputs: [
      { internalType: 'bool[]', name: 'availableOrders', type: 'bool[]' },
      {
        components: [
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint256', name: 'identifier', type: 'uint256' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          { internalType: 'address', name: 'offerer', type: 'address' },
          { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
        ],
        internalType: 'structExecution[]',
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
          { internalType: 'addresspayable', name: 'offerer', type: 'address' },
          { internalType: 'address', name: 'zone', type: 'address' },
          { internalType: 'address', name: 'offerToken', type: 'address' },
          { internalType: 'uint256', name: 'offerIdentifier', type: 'uint256' },
          { internalType: 'uint256', name: 'offerAmount', type: 'uint256' },
          {
            internalType: 'enumBasicOrderType',
            name: 'basicOrderType',
            type: 'uint8',
          },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
          { internalType: 'uint256', name: 'salt', type: 'uint256' },
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
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structAdditionalRecipient[]',
            name: 'additionalRecipients',
            type: 'tuple[]',
          },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'structBasicOrderParameters',
        name: 'parameters',
        type: 'tuple',
      },
    ],
    name: 'fulfillBasicOrder',
    outputs: [{ internalType: 'bool', name: 'fulfilled', type: 'bool' }],
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
          { internalType: 'addresspayable', name: 'offerer', type: 'address' },
          { internalType: 'address', name: 'zone', type: 'address' },
          { internalType: 'address', name: 'offerToken', type: 'address' },
          { internalType: 'uint256', name: 'offerIdentifier', type: 'uint256' },
          { internalType: 'uint256', name: 'offerAmount', type: 'uint256' },
          {
            internalType: 'enumBasicOrderType',
            name: 'basicOrderType',
            type: 'uint8',
          },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
          { internalType: 'uint256', name: 'salt', type: 'uint256' },
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
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structAdditionalRecipient[]',
            name: 'additionalRecipients',
            type: 'tuple[]',
          },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'structBasicOrderParameters',
        name: 'parameters',
        type: 'tuple',
      },
    ],
    name: 'fulfillBasicOrder_efficient_6GL6yc',
    outputs: [{ internalType: 'bool', name: 'fulfilled', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'offerer', type: 'address' },
              { internalType: 'address', name: 'zone', type: 'address' },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                internalType: 'structOfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                    internalType: 'addresspayable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'structConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enumOrderType',
                name: 'orderType',
                type: 'uint8',
              },
              { internalType: 'uint256', name: 'startTime', type: 'uint256' },
              { internalType: 'uint256', name: 'endTime', type: 'uint256' },
              { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
              { internalType: 'uint256', name: 'salt', type: 'uint256' },
              { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'structOrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'structOrder',
        name: 'order',
        type: 'tuple',
      },
      { internalType: 'bytes32', name: 'fulfillerConduitKey', type: 'bytes32' },
    ],
    name: 'fulfillOrder',
    outputs: [{ internalType: 'bool', name: 'fulfilled', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'contractOfferer', type: 'address' },
    ],
    name: 'getContractOffererNonce',
    outputs: [{ internalType: 'uint256', name: 'nonce', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'offerer', type: 'address' }],
    name: 'getCounter',
    outputs: [{ internalType: 'uint256', name: 'counter', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'offerer', type: 'address' },
          { internalType: 'address', name: 'zone', type: 'address' },
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              { internalType: 'uint256', name: 'startAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'endAmount', type: 'uint256' },
            ],
            internalType: 'structOfferItem[]',
            name: 'offer',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              { internalType: 'uint256', name: 'startAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'endAmount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structConsiderationItem[]',
            name: 'consideration',
            type: 'tuple[]',
          },
          { internalType: 'enumOrderType', name: 'orderType', type: 'uint8' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
          { internalType: 'uint256', name: 'salt', type: 'uint256' },
          { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
          { internalType: 'uint256', name: 'counter', type: 'uint256' },
        ],
        internalType: 'structOrderComponents',
        name: 'order',
        type: 'tuple',
      },
    ],
    name: 'getOrderHash',
    outputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    name: 'getOrderStatus',
    outputs: [
      { internalType: 'bool', name: 'isValidated', type: 'bool' },
      { internalType: 'bool', name: 'isCancelled', type: 'bool' },
      { internalType: 'uint256', name: 'totalFilled', type: 'uint256' },
      { internalType: 'uint256', name: 'totalSize', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'incrementCounter',
    outputs: [{ internalType: 'uint256', name: 'newCounter', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'information',
    outputs: [
      { internalType: 'string', name: 'version', type: 'string' },
      { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' },
      { internalType: 'address', name: 'conduitController', type: 'address' },
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
              { internalType: 'address', name: 'offerer', type: 'address' },
              { internalType: 'address', name: 'zone', type: 'address' },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                internalType: 'structOfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                    internalType: 'addresspayable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'structConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enumOrderType',
                name: 'orderType',
                type: 'uint8',
              },
              { internalType: 'uint256', name: 'startTime', type: 'uint256' },
              { internalType: 'uint256', name: 'endTime', type: 'uint256' },
              { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
              { internalType: 'uint256', name: 'salt', type: 'uint256' },
              { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'structOrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          { internalType: 'uint120', name: 'numerator', type: 'uint120' },
          { internalType: 'uint120', name: 'denominator', type: 'uint120' },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
          { internalType: 'bytes', name: 'extraData', type: 'bytes' },
        ],
        internalType: 'structAdvancedOrder[]',
        name: 'orders',
        type: 'tuple[]',
      },
      {
        components: [
          { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
          { internalType: 'enumSide', name: 'side', type: 'uint8' },
          { internalType: 'uint256', name: 'index', type: 'uint256' },
          { internalType: 'uint256', name: 'identifier', type: 'uint256' },
          {
            internalType: 'bytes32[]',
            name: 'criteriaProof',
            type: 'bytes32[]',
          },
        ],
        internalType: 'structCriteriaResolver[]',
        name: 'criteriaResolvers',
        type: 'tuple[]',
      },
      {
        components: [
          {
            components: [
              { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
              { internalType: 'uint256', name: 'itemIndex', type: 'uint256' },
            ],
            internalType: 'structFulfillmentComponent[]',
            name: 'offerComponents',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
              { internalType: 'uint256', name: 'itemIndex', type: 'uint256' },
            ],
            internalType: 'structFulfillmentComponent[]',
            name: 'considerationComponents',
            type: 'tuple[]',
          },
        ],
        internalType: 'structFulfillment[]',
        name: 'fulfillments',
        type: 'tuple[]',
      },
      { internalType: 'address', name: 'recipient', type: 'address' },
    ],
    name: 'matchAdvancedOrders',
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint256', name: 'identifier', type: 'uint256' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          { internalType: 'address', name: 'offerer', type: 'address' },
          { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
        ],
        internalType: 'structExecution[]',
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
              { internalType: 'address', name: 'offerer', type: 'address' },
              { internalType: 'address', name: 'zone', type: 'address' },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                internalType: 'structOfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                    internalType: 'addresspayable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'structConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enumOrderType',
                name: 'orderType',
                type: 'uint8',
              },
              { internalType: 'uint256', name: 'startTime', type: 'uint256' },
              { internalType: 'uint256', name: 'endTime', type: 'uint256' },
              { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
              { internalType: 'uint256', name: 'salt', type: 'uint256' },
              { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'structOrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'structOrder[]',
        name: 'orders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            components: [
              { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
              { internalType: 'uint256', name: 'itemIndex', type: 'uint256' },
            ],
            internalType: 'structFulfillmentComponent[]',
            name: 'offerComponents',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
              { internalType: 'uint256', name: 'itemIndex', type: 'uint256' },
            ],
            internalType: 'structFulfillmentComponent[]',
            name: 'considerationComponents',
            type: 'tuple[]',
          },
        ],
        internalType: 'structFulfillment[]',
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
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              { internalType: 'uint256', name: 'identifier', type: 'uint256' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structReceivedItem',
            name: 'item',
            type: 'tuple',
          },
          { internalType: 'address', name: 'offerer', type: 'address' },
          { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
        ],
        internalType: 'structExecution[]',
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
    outputs: [{ internalType: 'string', name: 'contractName', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'offerer', type: 'address' },
              { internalType: 'address', name: 'zone', type: 'address' },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                internalType: 'structOfferItem[]',
                name: 'offer',
                type: 'tuple[]',
              },
              {
                components: [
                  {
                    internalType: 'enumItemType',
                    name: 'itemType',
                    type: 'uint8',
                  },
                  { internalType: 'address', name: 'token', type: 'address' },
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
                    internalType: 'addresspayable',
                    name: 'recipient',
                    type: 'address',
                  },
                ],
                internalType: 'structConsiderationItem[]',
                name: 'consideration',
                type: 'tuple[]',
              },
              {
                internalType: 'enumOrderType',
                name: 'orderType',
                type: 'uint8',
              },
              { internalType: 'uint256', name: 'startTime', type: 'uint256' },
              { internalType: 'uint256', name: 'endTime', type: 'uint256' },
              { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
              { internalType: 'uint256', name: 'salt', type: 'uint256' },
              { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
              {
                internalType: 'uint256',
                name: 'totalOriginalConsiderationItems',
                type: 'uint256',
              },
            ],
            internalType: 'structOrderParameters',
            name: 'parameters',
            type: 'tuple',
          },
          { internalType: 'bytes', name: 'signature', type: 'bytes' },
        ],
        internalType: 'structOrder[]',
        name: 'orders',
        type: 'tuple[]',
      },
    ],
    name: 'validate',
    outputs: [{ internalType: 'bool', name: 'validated', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  { inputs: [], name: 'BadContractSignature', type: 'error' },
  { inputs: [], name: 'BadFraction', type: 'error' },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'BadReturnValueFromERC20OnTransfer',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint8', name: 'v', type: 'uint8' }],
    name: 'BadSignatureV',
    type: 'error',
  },
  { inputs: [], name: 'CannotCancelOrder', type: 'error' },
  {
    inputs: [],
    name: 'ConsiderationCriteriaResolverOutOfRange',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ConsiderationLengthNotEqualToTotalOriginal',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
      { internalType: 'uint256', name: 'considerationIndex', type: 'uint256' },
      { internalType: 'uint256', name: 'shortfallAmount', type: 'uint256' },
    ],
    name: 'ConsiderationNotMet',
    type: 'error',
  },
  { inputs: [], name: 'CriteriaNotEnabledForItem', type: 'error' },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256[]', name: 'identifiers', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    name: 'ERC1155BatchTransferGenericFailure',
    type: 'error',
  },
  { inputs: [], name: 'InexactFraction', type: 'error' },
  { inputs: [], name: 'InsufficientNativeTokensSupplied', type: 'error' },
  { inputs: [], name: 'Invalid1155BatchTransferEncoding', type: 'error' },
  { inputs: [], name: 'InvalidBasicOrderParameterEncoding', type: 'error' },
  {
    inputs: [{ internalType: 'address', name: 'conduit', type: 'address' }],
    name: 'InvalidCallToConduit',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
      { internalType: 'address', name: 'conduit', type: 'address' },
    ],
    name: 'InvalidConduit',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    name: 'InvalidContractOrder',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'InvalidERC721TransferAmount',
    type: 'error',
  },
  { inputs: [], name: 'InvalidFulfillmentComponentData', type: 'error' },
  {
    inputs: [{ internalType: 'uint256', name: 'value', type: 'uint256' }],
    name: 'InvalidMsgValue',
    type: 'error',
  },
  { inputs: [], name: 'InvalidNativeOfferItem', type: 'error' },
  { inputs: [], name: 'InvalidProof', type: 'error' },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    name: 'InvalidRestrictedOrder',
    type: 'error',
  },
  { inputs: [], name: 'InvalidSignature', type: 'error' },
  { inputs: [], name: 'InvalidSigner', type: 'error' },
  {
    inputs: [
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
    ],
    name: 'InvalidTime',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'fulfillmentIndex', type: 'uint256' },
    ],
    name: 'MismatchedFulfillmentOfferAndConsiderationComponents',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'enumSide', name: 'side', type: 'uint8' }],
    name: 'MissingFulfillmentComponentOnAggregation',
    type: 'error',
  },
  { inputs: [], name: 'MissingItemAmount', type: 'error' },
  { inputs: [], name: 'MissingOriginalConsiderationItems', type: 'error' },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'NativeTokenTransferGenericFailure',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'NoContract',
    type: 'error',
  },
  { inputs: [], name: 'NoReentrantCalls', type: 'error' },
  { inputs: [], name: 'NoSpecifiedOrdersAvailable', type: 'error' },
  {
    inputs: [],
    name: 'OfferAndConsiderationRequiredOnFulfillment',
    type: 'error',
  },
  { inputs: [], name: 'OfferCriteriaResolverOutOfRange', type: 'error' },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    name: 'OrderAlreadyFilled',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'enumSide', name: 'side', type: 'uint8' }],
    name: 'OrderCriteriaResolverOutOfRange',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    name: 'OrderIsCancelled',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'orderHash', type: 'bytes32' }],
    name: 'OrderPartiallyFilled',
    type: 'error',
  },
  { inputs: [], name: 'PartialFillsNotEnabledForOrder', type: 'error' },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'identifier', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'TokenTransferGenericFailure',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
      { internalType: 'uint256', name: 'considerationIndex', type: 'uint256' },
    ],
    name: 'UnresolvedConsiderationCriteria',
    type: 'error',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'orderIndex', type: 'uint256' },
      { internalType: 'uint256', name: 'offerIndex', type: 'uint256' },
    ],
    name: 'UnresolvedOfferCriteria',
    type: 'error',
  },
  { inputs: [], name: 'UnusedItemParameters', type: 'error' },
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
      { indexed: true, internalType: 'address', name: 'zone', type: 'address' },
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
      { indexed: true, internalType: 'address', name: 'zone', type: 'address' },
      {
        indexed: false,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        components: [
          { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'identifier', type: 'uint256' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        indexed: false,
        internalType: 'structSpentItem[]',
        name: 'offer',
        type: 'tuple[]',
      },
      {
        components: [
          { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'identifier', type: 'uint256' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          {
            internalType: 'addresspayable',
            name: 'recipient',
            type: 'address',
          },
        ],
        indexed: false,
        internalType: 'structReceivedItem[]',
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
        components: [
          { internalType: 'address', name: 'offerer', type: 'address' },
          { internalType: 'address', name: 'zone', type: 'address' },
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              { internalType: 'uint256', name: 'startAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'endAmount', type: 'uint256' },
            ],
            internalType: 'structOfferItem[]',
            name: 'offer',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'enumItemType', name: 'itemType', type: 'uint8' },
              { internalType: 'address', name: 'token', type: 'address' },
              {
                internalType: 'uint256',
                name: 'identifierOrCriteria',
                type: 'uint256',
              },
              { internalType: 'uint256', name: 'startAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'endAmount', type: 'uint256' },
              {
                internalType: 'addresspayable',
                name: 'recipient',
                type: 'address',
              },
            ],
            internalType: 'structConsiderationItem[]',
            name: 'consideration',
            type: 'tuple[]',
          },
          { internalType: 'enumOrderType', name: 'orderType', type: 'uint8' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'bytes32', name: 'zoneHash', type: 'bytes32' },
          { internalType: 'uint256', name: 'salt', type: 'uint256' },
          { internalType: 'bytes32', name: 'conduitKey', type: 'bytes32' },
          {
            internalType: 'uint256',
            name: 'totalOriginalConsiderationItems',
            type: 'uint256',
          },
        ],
        indexed: false,
        internalType: 'structOrderParameters',
        name: 'orderParameters',
        type: 'tuple',
      },
    ],
    name: 'OrderValidated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32[]',
        name: 'orderHashes',
        type: 'bytes32[]',
      },
    ],
    name: 'OrdersMatched',
    type: 'event',
  },
];

export const UNISWAP_V3_POOL_ABI = [
  { inputs: [], stateMutability: 'nonpayable', type: 'constructor' },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'int24',
        name: 'tickLower',
        type: 'int24',
      },
      {
        indexed: true,
        internalType: 'int24',
        name: 'tickUpper',
        type: 'int24',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'amount',
        type: 'uint128',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount0',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount1',
        type: 'uint256',
      },
    ],
    name: 'Burn',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'int24',
        name: 'tickLower',
        type: 'int24',
      },
      {
        indexed: true,
        internalType: 'int24',
        name: 'tickUpper',
        type: 'int24',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'amount0',
        type: 'uint128',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'amount1',
        type: 'uint128',
      },
    ],
    name: 'Collect',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'amount0',
        type: 'uint128',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'amount1',
        type: 'uint128',
      },
    ],
    name: 'CollectProtocol',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount0',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount1',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'paid0',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'paid1',
        type: 'uint256',
      },
    ],
    name: 'Flash',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint16',
        name: 'observationCardinalityNextOld',
        type: 'uint16',
      },
      {
        indexed: false,
        internalType: 'uint16',
        name: 'observationCardinalityNextNew',
        type: 'uint16',
      },
    ],
    name: 'IncreaseObservationCardinalityNext',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint160',
        name: 'sqrtPriceX96',
        type: 'uint160',
      },
      { indexed: false, internalType: 'int24', name: 'tick', type: 'int24' },
    ],
    name: 'Initialize',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'int24',
        name: 'tickLower',
        type: 'int24',
      },
      {
        indexed: true,
        internalType: 'int24',
        name: 'tickUpper',
        type: 'int24',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'amount',
        type: 'uint128',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount0',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount1',
        type: 'uint256',
      },
    ],
    name: 'Mint',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint8',
        name: 'feeProtocol0Old',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'feeProtocol1Old',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'feeProtocol0New',
        type: 'uint8',
      },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'feeProtocol1New',
        type: 'uint8',
      },
    ],
    name: 'SetFeeProtocol',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'int256',
        name: 'amount0',
        type: 'int256',
      },
      {
        indexed: false,
        internalType: 'int256',
        name: 'amount1',
        type: 'int256',
      },
      {
        indexed: false,
        internalType: 'uint160',
        name: 'sqrtPriceX96',
        type: 'uint160',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'liquidity',
        type: 'uint128',
      },
      { indexed: false, internalType: 'int24', name: 'tick', type: 'int24' },
    ],
    name: 'Swap',
    type: 'event',
  },
  {
    inputs: [
      { internalType: 'int24', name: 'tickLower', type: 'int24' },
      { internalType: 'int24', name: 'tickUpper', type: 'int24' },
      { internalType: 'uint128', name: 'amount', type: 'uint128' },
    ],
    name: 'burn',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'int24', name: 'tickLower', type: 'int24' },
      { internalType: 'int24', name: 'tickUpper', type: 'int24' },
      { internalType: 'uint128', name: 'amount0Requested', type: 'uint128' },
      { internalType: 'uint128', name: 'amount1Requested', type: 'uint128' },
    ],
    name: 'collect',
    outputs: [
      { internalType: 'uint128', name: 'amount0', type: 'uint128' },
      { internalType: 'uint128', name: 'amount1', type: 'uint128' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint128', name: 'amount0Requested', type: 'uint128' },
      { internalType: 'uint128', name: 'amount1Requested', type: 'uint128' },
    ],
    name: 'collectProtocol',
    outputs: [
      { internalType: 'uint128', name: 'amount0', type: 'uint128' },
      { internalType: 'uint128', name: 'amount1', type: 'uint128' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'factory',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'fee',
    outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeGrowthGlobal0X128',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeGrowthGlobal1X128',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'flash',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint16',
        name: 'observationCardinalityNext',
        type: 'uint16',
      },
    ],
    name: 'increaseObservationCardinalityNext',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxLiquidityPerTick',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'int24', name: 'tickLower', type: 'int24' },
      { internalType: 'int24', name: 'tickUpper', type: 'int24' },
      { internalType: 'uint128', name: 'amount', type: 'uint128' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'mint',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'observations',
    outputs: [
      { internalType: 'uint32', name: 'blockTimestamp', type: 'uint32' },
      { internalType: 'int56', name: 'tickCumulative', type: 'int56' },
      {
        internalType: 'uint160',
        name: 'secondsPerLiquidityCumulativeX128',
        type: 'uint160',
      },
      { internalType: 'bool', name: 'initialized', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint32[]', name: 'secondsAgos', type: 'uint32[]' },
    ],
    name: 'observe',
    outputs: [
      { internalType: 'int56[]', name: 'tickCumulatives', type: 'int56[]' },
      {
        internalType: 'uint160[]',
        name: 'secondsPerLiquidityCumulativeX128s',
        type: 'uint160[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'positions',
    outputs: [
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      {
        internalType: 'uint256',
        name: 'feeGrowthInside0LastX128',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'feeGrowthInside1LastX128',
        type: 'uint256',
      },
      { internalType: 'uint128', name: 'tokensOwed0', type: 'uint128' },
      { internalType: 'uint128', name: 'tokensOwed1', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'protocolFees',
    outputs: [
      { internalType: 'uint128', name: 'token0', type: 'uint128' },
      { internalType: 'uint128', name: 'token1', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'feeProtocol0', type: 'uint8' },
      { internalType: 'uint8', name: 'feeProtocol1', type: 'uint8' },
    ],
    name: 'setFeeProtocol',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      {
        internalType: 'uint16',
        name: 'observationCardinality',
        type: 'uint16',
      },
      {
        internalType: 'uint16',
        name: 'observationCardinalityNext',
        type: 'uint16',
      },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'int24', name: 'tickLower', type: 'int24' },
      { internalType: 'int24', name: 'tickUpper', type: 'int24' },
    ],
    name: 'snapshotCumulativesInside',
    outputs: [
      { internalType: 'int56', name: 'tickCumulativeInside', type: 'int56' },
      {
        internalType: 'uint160',
        name: 'secondsPerLiquidityInsideX128',
        type: 'uint160',
      },
      { internalType: 'uint32', name: 'secondsInside', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'recipient', type: 'address' },
      { internalType: 'bool', name: 'zeroForOne', type: 'bool' },
      { internalType: 'int256', name: 'amountSpecified', type: 'int256' },
      { internalType: 'uint160', name: 'sqrtPriceLimitX96', type: 'uint160' },
      { internalType: 'bytes', name: 'data', type: 'bytes' },
    ],
    name: 'swap',
    outputs: [
      { internalType: 'int256', name: 'amount0', type: 'int256' },
      { internalType: 'int256', name: 'amount1', type: 'int256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'int16', name: '', type: 'int16' }],
    name: 'tickBitmap',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tickSpacing',
    outputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    name: 'ticks',
    outputs: [
      { internalType: 'uint128', name: 'liquidityGross', type: 'uint128' },
      { internalType: 'int128', name: 'liquidityNet', type: 'int128' },
      {
        internalType: 'uint256',
        name: 'feeGrowthOutside0X128',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'feeGrowthOutside1X128',
        type: 'uint256',
      },
      { internalType: 'int56', name: 'tickCumulativeOutside', type: 'int56' },
      {
        internalType: 'uint160',
        name: 'secondsPerLiquidityOutsideX128',
        type: 'uint160',
      },
      { internalType: 'uint32', name: 'secondsOutside', type: 'uint32' },
      { internalType: 'bool', name: 'initialized', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

export const FUSIONX_V3_SWAP_ABI = [
  {
    type: 'event',
    name: 'Swap',
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recipient',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'int256',
        name: 'amount0',
        type: 'int256',
      },
      {
        indexed: false,
        internalType: 'int256',
        name: 'amount1',
        type: 'int256',
      },
      {
        indexed: false,
        internalType: 'uint160',
        name: 'sqrtPriceX96',
        type: 'uint160',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'liquidity',
        type: 'uint128',
      },
      {
        indexed: false,
        internalType: 'int24',
        name: 'tick',
        type: 'int24',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'protocolFeesToken0',
        type: 'uint128',
      },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'protocolFeesToken1',
        type: 'uint128',
      },
    ],
  },
];
