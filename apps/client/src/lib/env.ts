const env = {
  receivedCollectionOffersEnabled:
    process.env.NEXT_PUBLIC_RECEIVED_COLLECTION_OFFERS_ENABLED === "true",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_LOOTEX_ENVIRONMENT === "production"
      ? "https://v3-api.lootex.io"
      : (process.env.NEXT_PUBLIC_LOOTEX_ENVIRONMENT === "staging" &&
          "https://staging-api.lootex.dev") ||
        "http://localhost:2999/",
};

export default env;
