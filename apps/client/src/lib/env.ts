const env = {
  receivedCollectionOffersEnabled:
    process.env.NEXT_PUBLIC_RECEIVED_COLLECTION_OFFERS_ENABLED === 'true',
  apiBaseUrl:
    process.env.NEXT_PUBLIC_LOOTEX_ENVIRONMENT === 'production'
      ? 'https://v3-api.lootex.io'
      : (process.env.NEXT_PUBLIC_LOOTEX_ENVIRONMENT === 'staging' &&
          'https://staging-api.lootex.dev') ||
        'https://dex-v3-api-aws.lootex.dev',
};

export default env;
