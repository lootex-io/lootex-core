require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.OPENSEA_API_KEY;
const baseUrl = process.env.BASE_URL;
const apiUrl = baseUrl + '/api/v3/aggregator/syncOrder';
const slug = process.argv[2];

// Lootex API headers
const lootexHeaders = {
  'x-client-id': 'lootex',
  'x-api-key': '0394ad1f-260c-4422-99f5-64383606a201'
};

// 添加链名称映射
const chainNameMap = {
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  'matic': 'matic',
  'arbitrum': 'arbitrum',
  'optimism': 'optimism',
  'base': 'base',
  'bsc': 'bsc',
};

const chainIdMap = {
  'ethereum': 1,
  'matic': 137,
  'arbitrum': 42161,
  'optimism': 10,
  'base': 8453,
  'bsc': 56
};

const getCollectionByContract = async (chain, address) => {
  try {
    const url = `https://api.opensea.io/api/v2/chain/${chain}/contract/${address}`;
    const response = await axios.get(url, {
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });

    return {
      contractAddress: response.data.address,
      chainId: chainIdMap[response.data.chain] || 1,
      openSeaSlug: response.data.collection
    };
  } catch (error) {
    console.error('Error fetching collection by contract:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

const getCollectionBySlug = async (slug) => {
  try {
    // 获取集合基本信息
    const collectionUrl = 'https://api.opensea.io/api/v2/collections/' + slug;
    const collectionResponse = await axios.get(collectionUrl, {
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });

    const collection = collectionResponse.data;
    console.log('Collection data:', collection);

    // 如果 contracts 数组为空，直接抛出错误
    if (!collection.contracts || collection.contracts.length === 0) {
      throw new Error(`No contract information available for collection: ${slug}`);
    }

    // 使用第一个合约
    const contract = collection.contracts[0];
    return {
      contractAddress: contract.address,
      chainId: chainIdMap[contract.chain] || 1,
      openSeaSlug: slug
    };
  } catch (error) {
    console.error('Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 404) {
      throw new Error(`Collection not found on OpenSea: ${slug}`);
    }

    throw error;
  }
};

const getCollectionInfo = async (inputSlug) => {
  // 检查是否为 Lootex 格式的 slug
  if (inputSlug.includes(':')) {
    const [chainShortName, contractAddress] = inputSlug.split(':');
    console.log(`Detected Lootex format - Chain: ${chainShortName}, Address: ${contractAddress}`);

    const chainName = chainNameMap[chainShortName.toLowerCase()];
    if (!chainName) {
      throw new Error(`Unsupported chain: ${chainShortName}`);
    }

    return await getCollectionByContract(chainName, contractAddress);
  } else {
    // OpenSea slug 格式
    console.log(`Using OpenSea slug: ${inputSlug}`);
    return await getCollectionBySlug(inputSlug);
  }
};

const getOpenSeaListings = async (slug, next = '') => {
  try {
    const url = `https://api.opensea.io/api/v2/listings/collection/${slug}/all?limit=100${next ? `&next=${encodeURIComponent(next)}` : ''}`;
    console.log(`Fetching OpenSea listings from: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'accept': 'application/json',
        'x-api-key': apiKey
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching listings:', error.message);
    return null;
  }
};

const syncOrder = async (chainId, contractAddress, tokenId, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(apiUrl, {
        chainId: parseInt(chainId),
        contractAddress,
        tokenId
      }, {
        headers: lootexHeaders
      });
      console.log(`Synced order for tokenId: ${tokenId}`);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;

      console.error(`Error syncing order for tokenId ${tokenId} (Attempt ${attempt}/${retries}):`);
      console.error(`Status: ${status}`);
      console.error(`Message: ${error.message}`);
      if (errorData) {
        console.error('Error details:', errorData);
      }

      // 如果是 500 錯誤，增加重試等待時間
      if (status === 500) {
        const waitTime = 3000 * Math.pow(2, attempt - 1); // 3s, 6s, 12s
        console.log(`Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (attempt === retries) {
        throw error; // 非 500 錯誤或最後一次重試失敗時拋出錯誤
      }
    }
  }
};

const rateLimitedSyncOrders = async (orders, limit = 3, interval = 1500) => {
  const queue = [...orders];
  const results = [];
  const errors = [];
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  const processQueue = async () => {
    while (queue.length > 0) {
      const batch = queue.splice(0, limit);
      try {
        const batchPromises = batch.map(order =>
          syncOrder(order.chainId, order.contractAddress, order.tokenId)
            .then(result => {
              consecutiveErrors = 0; // 重置連續錯誤計數
              return result;
            })
            .catch(error => {
              consecutiveErrors++;
              errors.push({ tokenId: order.tokenId, error });

              // 如果連續錯誤太多，增加等待時間
              if (consecutiveErrors >= maxConsecutiveErrors) {
                console.log(`Too many consecutive errors (${consecutiveErrors}), increasing wait time...`);
                return new Promise(resolve => setTimeout(resolve, interval * 2));
              }
              return null;
            })
        );

        results.push(...await Promise.all(batchPromises));

        if (queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        console.error('Batch processing error:', error);
        // 將失敗的訂單放回隊列尾部重試
        queue.push(...batch);
      }
    }
  };

  await processQueue();
  return { results, errors };
};

const getLootexLocalListings = async (slug) => {
  try {
    const url = `${baseUrl}/api/v3/aggregator/os/collection-nfts?slug=${slug}`;
    console.log(`Fetching Lootex local listings from: ${url}`);
    const response = await axios.get(url, { headers: lootexHeaders });

    if (!response.data || !response.data.tokens) {
      console.log('No Lootex local listings found');
      return [];
    }

    const tokenIds = response.data.tokens;
    console.log(`Found ${tokenIds.length} Lootex local listings`);

    // 只確保 tokenId 不是 null 或 undefined
    const validTokenIds = tokenIds.filter(tokenId => tokenId != null);

    if (validTokenIds.length !== tokenIds.length) {
      console.warn(`Filtered out ${tokenIds.length - validTokenIds.length} invalid token IDs`);
    }

    // 保持原始格式，不做型別轉換
    return validTokenIds;
  } catch (error) {
    console.error('Error fetching Lootex local listings:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
};

const fetchListingsAndSync = async (slug) => {
  let openSeaTokenIds = new Set();
  let next = '';
  let attempts = 0;
  const maxAttempts = 4;

  while (attempts < maxAttempts) {
    const openSeaListingsData = await getOpenSeaListings(slug, next);
    if (!openSeaListingsData) break;

    const uniqueTokenIds = new Set(
      openSeaListingsData.listings.flatMap(listing =>
        listing.protocol_data.parameters.offer.map(offer => offer.identifierOrCriteria)
      )
    );
    uniqueTokenIds.forEach(id => openSeaTokenIds.add(id));

    console.log('Fetched OpenSea tokenIds:', Array.from(uniqueTokenIds));

    if (openSeaListingsData.next) {
      next = openSeaListingsData.next;
      attempts++;
    } else {
      break;
    }
  }

  const lootexTokenIds = new Set(await getLootexLocalListings(slug));
  console.log('Fetched Lootex tokenIds:', Array.from(lootexTokenIds));

  const allTokenIds = new Set([...openSeaTokenIds, ...lootexTokenIds]);
  console.log('Combined unique tokenIds:', Array.from(allTokenIds));

  return Array.from(allTokenIds);
};

const main = async () => {
  if (!apiKey) {
    console.error('OPENSEA_API_KEY is not set in the .env file');
    process.exit(1);
  }

  try {
    // 获取集合信息
    const { contractAddress, chainId, openSeaSlug } = await getCollectionInfo(slug);
    console.log(`Found collection info - Contract: ${contractAddress}, Chain ID: ${chainId}, OpenSea Slug: ${openSeaSlug}`);

    // 使用 OpenSea slug 获取 token IDs
    const tokenIds = await fetchListingsAndSync(openSeaSlug);
    if (!tokenIds.length) {
      console.error('No token IDs found.');
      return;
    }

    console.log('Total unique tokenIds:', tokenIds.length);

    const orders = tokenIds.map(tokenId => ({
      chainId,
      contractAddress,
      tokenId
    }));

    const { results, errors } = await rateLimitedSyncOrders(orders);

    console.log('Sync process completed');
    console.log(`Successfully synced: ${results.filter(r => r !== null).length}`);
    console.log(`Failed to sync: ${errors.length}`);

    if (errors.length > 0) {
      console.log('Errors encountered:');
      errors.forEach(({ tokenId, error }) => {
        console.log(`TokenId ${tokenId}: ${error.message}`);
      });
    }
  } catch (error) {
    console.error('Failed to process collection:', error);
    process.exit(1);
  }
};

main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
