require('dotenv').config();
const axios = require('axios');

const apiKey = process.env.OPENSEA_API_KEY;
const baseUrl = process.env.BASE_URL;
const apiUrl = baseUrl + '/api/v3/aggregator/syncOrder';
const slug = process.argv[2];

// 添加链名称映射
const chainNameMap = {
  'ethereum': 'ethereum',
  'matic': 'matic',
  'arbitrum': 'arbitrum',
  'optimism': 'optimism',
  'base': 'base',
  'bsc': 'bsc'
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
    const url = `https://api.opensea.io/api/v2/listings/collection/${slug}/best?limit=100${next ? `&next=${encodeURIComponent(next)}` : ''}`;
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
        console.log(`Waiting ${waitTime/1000}s before retry...`);
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
  const startTime = Date.now();
  try {
    console.log('Fetching Lootex local listings...');
    
    const url = `http://localhost:3000/api/v3/aggregator/os/collection-nfts?slug=${slug}`;
    const response = await axios.get(url);
    
    if (!response.data || !response.data.tokens) {
      console.log('No Lootex local listings found');
      return [];
    }

    const tokenIds = response.data.tokens;
    const validTokenIds = tokenIds.filter(tokenId => tokenId != null);

    if (validTokenIds.length !== tokenIds.length) {
      console.warn(`Filtered out ${tokenIds.length - validTokenIds.length} invalid token IDs`);
    }

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // 转换为秒
    console.log(`Found ${validTokenIds.length} Lootex local listings (took ${duration.toFixed(2)}s)`);

    return validTokenIds;
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.error(`Error fetching Lootex local listings (after ${duration.toFixed(2)}s):`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
};

const fetchListingsAndSync = async (slug) => {
  // 使用 Map 来存储 tokenId 和对应的价格
  let openSeaTokenPrices = new Map();
  let next = '';
  let page = 1;

  while (true) {
    try {
      const openSeaListingsData = await getOpenSeaListings(slug, next);
      if (!openSeaListingsData) break;

      // 保存每个 token 的价格信息
      openSeaListingsData.listings.forEach(listing => {
        const price = {
          value: parseFloat(listing.price.current.value),
          currency: listing.price.current.currency
        };
        listing.protocol_data.parameters.offer.forEach(offer => {
          const tokenId = offer.identifierOrCriteria;
          // 只保存最低价格
          if (!openSeaTokenPrices.has(tokenId) || price.value < openSeaTokenPrices.get(tokenId).value) {
            openSeaTokenPrices.set(tokenId, price);
          }
        });
      });

      // console.log(`Found OpenSea listings page ${page}:`);
      // console.log(
      //   JSON.stringify(
      //     Array.from(openSeaTokenPrices.entries())
      //       .map(([tokenId, price]) => `${tokenId}: ${price.value} ${price.currency}`),
      //     null,
      //     2
      //   )
      // );

      if (openSeaListingsData.next) {
        next = openSeaListingsData.next;
        page++;
      } else {
        break; // 沒有下一頁時退出循環
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break; // 發生錯誤時退出循環
    }
  }

  console.log(`Found ${openSeaTokenPrices.size} OpenSea listings in total`);

  // 获取 Lootex 的列表
  const lootexTokenIds = await getLootexLocalListings(slug);

  // 获取所有 OpenSea token，按价格排序
  const openSeaTokens = Array.from(openSeaTokenPrices.entries())
    .map(([tokenId]) => tokenId);

  // 比较两个列表
  const onlyInOpenSea = openSeaTokens.filter(id => !lootexTokenIds.includes(id));
  const onlyInLootex = lootexTokenIds.filter(id => !openSeaTokens.includes(id));

  if (onlyInOpenSea.length > 0 || onlyInLootex.length > 0) {
    console.log('\x1b[31m%s\x1b[0m', 'NEED SYNC: Differences found in listings');
    if (onlyInOpenSea.length > 0) {
      console.log('TokenIds only in OpenSea:', 
        onlyInOpenSea.map(id => ({
          tokenId: id,
          price: openSeaTokenPrices.get(id).value,
          currency: openSeaTokenPrices.get(id).currency
        }))
      );
    }
    if (onlyInLootex.length > 0) {
      console.log('TokenIds only in Lootex:', onlyInLootex);
    }

    // 只返回需要同步的 tokenIds
    const tokensToSync = [...onlyInOpenSea, ...onlyInLootex];
    console.log('Total tokens to sync:', tokensToSync.length);
    return tokensToSync;
  } else {
    console.log('\x1b[32m%s\x1b[0m', 'All listings are in sync');
    return []; // 如果没有差异，返回空数组
  }
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

    // 使用 OpenSea slug 获取需要同步的 token IDs
    const tokenIds = await fetchListingsAndSync(openSeaSlug);
    if (!tokenIds.length) {
      console.log('No tokens need to be synced.');
      return;
    }

    console.log('Tokens to sync:', tokenIds.length);

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
