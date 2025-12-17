# lootex

## 0.2.22

### Patch Changes

- cd73e6e: Allow override baseUrl

## 0.2.21

### Patch Changes

- 888b5c1: Add is0PlatformFee to simple order types

## 0.2.20

### Patch Changes

- 8d722ed: Fix api client request query encode issue

## 0.2.19

### Patch Changes

- def1d28: Fix marketplace function

## 0.2.18

### Patch Changes

- c096247: Improve deploy drop related functions

## 0.2.17

### Patch Changes

- 082affb: Fix missing headers in createAuthLootexClient

## 0.2.16

### Patch Changes

- 1b24d97: Add creaetAuthLootexClient function to streamline private key sign in
- 71ae502: Fallback studio creator fee address to wallet address if not provided
- bc5a927: Mint function can take a recipient address
- 6f917b2: Use tsc to build package and better support cjs and esm

## 0.2.15

### Patch Changes

- 9bbb56a: Improve Marketplace module and docs

## 0.2.14

### Patch Changes

- 9fce41a: test marketplace module
- b59a103: Add allow currencies field to collection and asset types

## 0.2.13

### Patch Changes

- 7722961: Add studio module

## 0.2.12

### Patch Changes

- 7ed32f5: Allow passing customHeaders when initializing lootex client

## 0.2.11

### Patch Changes

- 4fc1e2c: Add GetLaunchpad endpoint

## 0.2.10

### Patch Changes

- 11ae766: Adjust limit per wallet calculation from prepare mint

## 0.2.9

### Patch Changes

- 6b539f8: Fix whitelist price conversion from drop

## 0.2.8

### Patch Changes

- 754db65: Add order expiration to validation

## 0.2.7

### Patch Changes

- 24fe8dc: Improve order validating logic to properly support partial fill cases
- ab04461: Support partial fill buy on erc1155 assets

## 0.2.6

### Patch Changes

- bc56d72: Expose limitPerWallet from prepare-mint

## 0.2.5

### Patch Changes

- 34caae1: Optimize order validatation for multicall

## 0.2.4

### Patch Changes

- 9b3cd5b: Get collection drop info supports token id

## 0.2.3

### Patch Changes

- 001ebc7: Support Erc1155 Drop

## 0.2.2

### Patch Changes

- b4a0641: Remove smart-account module

## 0.2.1

### Patch Changes

- 9991e68: Add strictValidateOrders
- f3abe49: Update studio syncTokenURI endpoint

## 0.2.0

### Minor Changes

- 383aeda: Remove Privy and React modules & fix dependency issues

## 0.1.62

### Patch Changes

- 4dc8fdc: Fix mint with native token

## 0.1.61

### Patch Changes

- 4c55d21: Support mint with ERC20

## 0.1.60

### Patch Changes

- 7065ce0: Add decimals to studio condition currency and remove post-publish contractDrop

## 0.1.59

### Patch Changes

- 5f4ee05: Add support for currency in studio condition

## 0.1.58

### Patch Changes

- 3119437: Add validateOrdersSignatures

## 0.1.57

### Patch Changes

- cc6e0ba: Optimize batchTransfer to use a single transfer for single asset
- 0dd25cb: Support ASTR to WETH swap on Sonoeium

## 0.1.56

### Patch Changes

- be851a8: Support staging environment in client configuration
- 6e62d7f: Support accept collection offer with multiple assets

## 0.1.55

### Patch Changes

- d52e7ff: Accept custom headers from create api client
- 739f679: Upgrade to viem@2.22.10

## 0.1.54

### Patch Changes

- 9a48aa6: Allow passing default dropInfo to getDrop

## 0.1.53

### Patch Changes

- 06a9261: Add displayConditioinId to getDrop

## 0.1.52

### Patch Changes

- 12f1910: Studio supports multiple drop info images

## 0.1.51

### Patch Changes

- 3bc353d: Add studio contract status sync endpoint
- 0540e69: Add soneium mainnet rpc

## 0.1.50

### Patch Changes

- 0fa6274: Update studio fee related types

## 0.1.49

### Patch Changes

- f507803: Update Soneium mainnet aggregator address

## 0.1.48

### Patch Changes

- 9c7f57d: Update default service fee rate
- c3b0123: Add collection creator fee info to asset

## 0.1.47

### Patch Changes

- 6c2c940: Add creator fee related types to collection
- eea42be: Update Sonieum Mainnet explorer url

## 0.1.46

### Patch Changes

- 5b9e249: Add `collectionSlug` as required params in getDrop()
- c376ecb: Add currentConditionId to getDrop
- 93dae0c: Fix gp deposit address from smart account

## 0.1.45

### Patch Changes

- e1f155d: Fix soneium chain config

## 0.1.44

### Patch Changes

- 7415b02: Support Soneium mainnet

## 0.1.43

### Patch Changes

- ad058f9: Add GP collection quest endpoint
- 2c0e911: Add GP deposit and purchaser addresses in dev environment

## 0.1.42

### Patch Changes

- f1bb71d: Add create studio condition api and replace dropStage with dropId

## 0.1.41

### Patch Changes

- a3c1b59: Add missing types for OrderHistory

## 0.1.40

### Patch Changes

- 7c9a4d1: Add likes to get collections sort by param and export featured asset from account

## 0.1.39

### Patch Changes

- 88d94f8: Improve get assets, collections and orders params type
- 84c1484: Add studio badge mode types
- b3d06c2: Improve get order history params type

## 0.1.38

### Patch Changes

- 0119d76: Fix gp pay unverified operation

## 0.1.37

### Patch Changes

- bc0b586: Update collection trait types

## 0.1.36

### Patch Changes

- 0d56f75: Add rarity related types
- 625a916: Add collection featured to asset helper function

## 0.1.35

### Patch Changes

- bea0e95: Add getRpcUrl option to Client
- 903faea: Fix get collection traits request params
- 55adb0b: Avoid request empty query string

## 0.1.34

### Patch Changes

- a9f31b0: Change mainnet rpc

## 0.1.33

### Patch Changes

- ac1da05: Add disconnect social account endpoint
- e743c5e: Fix verify listing orders endpoint types

## 0.1.32

### Patch Changes

- 1e2d5e9: Fix currency history response type

## 0.1.31

### Patch Changes

- b23e6f7: Fix sync tx hash request method

## 0.1.30

### Patch Changes

- 3992cd4: Add wallet export

## 0.1.29

### Patch Changes

- acc8a9c: add game tags endpoint and export FeaturedAssetsSection from account
- 5fe453a: Update all multi-sig gp purchaser addresses

## 0.1.28

### Patch Changes

- a7f1cef: Fix file upload endpoints
- 06b8e6d: Add game export

## 0.1.27

### Patch Changes

- ef5dd9b: Requires Lootex api key in api client
- 2f80646: Add Games and Wallet api endpoints

## 0.1.26

### Patch Changes

- d98de02: Add syncTxHashes to aggregator executions
- ccd64ea: Add missing type exports

## 0.1.25

### Patch Changes

- 84a9bff: Add Drop module

## 0.1.24

### Patch Changes

- c866030: Fix getAssetId to cover more scenarios
- 3fd8f2b: Fix incorrect soneium batch trasnfer entry point address

## 0.1.23

### Patch Changes

- f834975: Support batch transfer for Soneium Testnet

## 0.1.22

### Patch Changes

- 77adf49: Export all endpoints types

## 0.1.21

### Patch Changes

- 5545e3f: Add collection trading board api

## 0.1.20

### Patch Changes

- 3d8b71b: ApiClient now supports accounts, assets, collections, explore, and studio endpoints

## 0.1.19

### Patch Changes

- a47d89e: Export and Define USD as a 6 decimals token
- 3fa8861: Make ApiClient a separate module
- 361bd15: Add isDrop to collection type

## 0.1.18

### Patch Changes

- a441322: Downgrade @privy-io/react-auth peer dependency to ^1.88.3
- 5cf5992: Add erc20Abi and erc721Abi exports
- 0b4a9d9: Allow Smart Account to override nonce in sendTransaction

## 0.1.17

### Patch Changes

- fc5cb2a: Support Asset batch transfer
- ab17e27: Export UsdPrice
- 2d79717: Add account and collection exports

## 0.1.16

### Patch Changes

- 8d71c80: Support sign up with Privy access token
- 5094ef6: Add new 'lootex/privy' export and dedicated usePrivySmartAccount hook
- 3cf6a0e: SmartAccount now loads Biconomy configs from Client directly

## 0.1.15

### Patch Changes

- 6fc9bba: Remove @opensea/seaport-js as dependency and optimize create orders checks RPC calls

## 0.1.14

### Patch Changes

- b9b61a5: Fallback POL/WPOL to legacy symbols as required by GP apis
- b0c35ef: Support adding tips in aggregator.fulfillOrders
- a41d3c7: Add better getChain support

## 0.1.13

### Patch Changes

- bebc22b: Remove trailing zeros of Fraction.toSignificant()

## 0.1.12

### Patch Changes

- fa6e7eb: Add Chains module and auth logout
- 9707fe2: Support standard gp purchaser and experimental multi-sig purchaser

## 0.1.11

### Patch Changes

- 53f5181: Fix formatAddress throwing unnecessary erro
- 1ed450a: Add Asset module

## 0.1.10

### Patch Changes

- dad9ae0: Add Smart Account module
- ea9b50b: Add react module with LootexProvider and useLootex
- b91660e: Add Privy login

## 0.1.9

### Patch Changes

- bca036a: Add Auth module

## 0.1.8

### Patch Changes

- 925f14b: Add utils

## 0.1.7

### Patch Changes

- 1635a37: Add IBaseSwapAdapter export
- f8d07e3: Change bundler to tsup

## 0.1.6

### Patch Changes

- 2963440: Fix aggregator unitPrice instance issue

## 0.1.5

### Patch Changes

- 9883790: Add aggregator abi export

## 0.1.4

### Patch Changes

- b3837a6: Fix enum exports

## 0.1.3

### Patch Changes

- b2a9815: Update aggregator exports

## 0.1.2

### Patch Changes

- ea2a9ea: Update README.md

## 0.1.1

### Patch Changes

- cb552ea: Fix client base urls
