require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const apiKey = process.env.OPENSEA_API_KEY;
const baseUrl = process.env.BASE_URL;
const apiUrl = baseUrl + '/api/v3/aggregator/syncOrder';

// 获取命令行参数，排除 --force 和 --debug
const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const slug = args[0]; // 第一个非选项参数作为 slug

// 添加参数检查
const force = process.argv.includes('--force');
const debug = process.argv.includes('--debug');

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

// 创建数据库连接池
const pool = new Pool({
  user: process.env.POSTGRES_USERNAME,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

// 获取所有需要监控的 collection slugs
const getWatchedCollections = async () => {
  try {
    const query = `
      SELECT slug, chain, address 
      FROM aggregator_opensea_watched_collection 
      WHERE deleted = false
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error fetching watched collections:', error);
    return [];
  }
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
      }, {
        // 增加超时设置
        timeout: 30000, // 30 秒
        // 添加自定义 headers
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Synced order for tokenId: ${tokenId}`);
      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      console.error(`Error syncing order for tokenId ${tokenId} (Attempt ${attempt}/${retries}):`);
      console.error(`Status: ${status}`);
      console.error(`Message: ${error.message}`);

      // 处理不同类型的错误
      if (error.code === 'ECONNABORTED' || status === 504) {
        console.log('Request timeout, will retry with longer timeout');
        // 超时错误，下次重试时增加超时时间
        const waitTime = 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s
        console.log(`Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (status === 500) {
        const waitTime = 3000 * Math.pow(2, attempt - 1); // 3s, 6s, 12s
        console.log(`Server error, waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // 如果是最后一次重试
      if (attempt === retries) {
        console.error('Max retries reached, giving up');
        throw error;
      }

      // 其他错误类型，等待较短时间后重试
      const waitTime = 1000 * attempt;
      console.log(`Other error, waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  return null; // 如果所有重试都失败
};

const rateLimitedSyncOrders = async (orders, limit = 3, interval = 1500) => {
  const queue = [...orders];
  const results = [];
  const errors = [];
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  const processQueue = async () => {
    while (queue.length > 0) {
      if (consecutiveErrors >= maxConsecutiveErrors) {
        console.log(`Too many consecutive errors (${consecutiveErrors}), pausing for 30s...`);
        await new Promise(resolve => setTimeout(resolve, 30000)); // 暂停30秒
        consecutiveErrors = 0; // 重置错误计数
      }

      const batch = queue.splice(0, limit);
      try {
        const batchPromises = batch.map(order =>
          syncOrder(order.chainId, order.contractAddress, order.tokenId)
            .then(result => {
              consecutiveErrors = 0;
              return result;
            })
            .catch(error => {
              consecutiveErrors++;
              errors.push({ 
                tokenId: order.tokenId, 
                error: {
                  message: error.message,
                  status: error.response?.status,
                  code: error.code
                }
              });
              return null;
            })
        );
        
        results.push(...await Promise.all(batchPromises));
        
        // 每个批次之间增加间隔
        if (queue.length > 0) {
          const waitTime = consecutiveErrors > 0 ? interval * 2 : interval;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        console.error('Batch processing error:', error);
        // 将失败的订单放回队列尾部重试
        queue.push(...batch);
        // 增加等待时间
        await new Promise(resolve => setTimeout(resolve, interval * 2));
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
  let openSeaTokenPrices = new Map();
  let duplicateCount = 0;
  let betterPriceCount = 0;
  let totalOriginalListings = 0;
  let next = '';
  let page = 1;

  try {
    // 分页获取所有 listings
    while (true) {
      const openSeaListingsData = await getOpenSeaListings(slug, next);
      if (!openSeaListingsData) break;

      totalOriginalListings += openSeaListingsData.listings.length;
      console.log(`Fetching page ${page}, found ${openSeaListingsData.listings.length} listings`);

      // 保存价格信息...
      openSeaListingsData.listings.forEach(listing => {
        const price = {
          value: parseFloat(listing.price.current.value),
          currency: listing.price.current.currency
        };
        
        listing.protocol_data.parameters.offer.forEach(offer => {
          const tokenId = offer.identifierOrCriteria;
          if (!openSeaTokenPrices.has(tokenId)) {
            openSeaTokenPrices.set(tokenId, price);
          } else {
            duplicateCount++;
            if (price.value < openSeaTokenPrices.get(tokenId).value) {
              openSeaTokenPrices.set(tokenId, price);
              betterPriceCount++;
            }
          }
        });
      });

      if (openSeaListingsData.next) {
        next = openSeaListingsData.next;
        page++;
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        break;
      }
    }

    // 打印统计信息
    console.log('\nOpenSea Listings Summary:');
    console.log('----------------------------------------');
    console.log(`Total pages fetched: ${page}`);
    console.log(`Total original listings: ${totalOriginalListings}`);
    console.log(`Unique tokenIds: ${openSeaTokenPrices.size}`);
    console.log(`Duplicates found: ${duplicateCount}`);
    console.log(`Price updates: ${betterPriceCount}`);

    // 只取前30个进行比较
    const openSeaTokens = Array.from(openSeaTokenPrices.entries())
      .slice(0, 30)
      .map(([tokenId]) => tokenId);
    
    // 总是打印前30个 OpenSea listings
    console.log('\nFirst 30 OpenSea listings:');
    console.log('----------------------------------------');
    openSeaTokens.forEach(tokenId => {
      const price = openSeaTokenPrices.get(tokenId);
      console.log(`TokenId: ${tokenId}, Price: ${price.value} ${price.currency}`);
    });

    const lootexTokenIds = await getLootexLocalListings(slug);
    const lootexFirst30 = lootexTokenIds.slice(0, 30);

    // 比较前30个 listings
    const onlyInOpenSea = openSeaTokens.filter(id => !lootexFirst30.includes(id));
    const onlyInLootex = lootexFirst30.filter(id => !openSeaTokens.includes(id));

    if (onlyInOpenSea.length > 0 || onlyInLootex.length > 0) {
      console.log('\x1b[31m%s\x1b[0m', '\nNEED SYNC: Differences found in first 30 listings');
      
      // 只在 debug 模式下打印其他详细信息
      if (debug) {
        console.log('\nFirst 30 Lootex listings:');
        console.log('----------------------------------------');
        lootexFirst30.forEach(tokenId => {
          console.log(`TokenId: ${tokenId}`);
        });
        
        if (onlyInOpenSea.length > 0) {
          console.log('\nTokenIds only in OpenSea:');
          console.log('----------------------------------------');
          onlyInOpenSea.forEach(id => {
            const price = openSeaTokenPrices.get(id);
            console.log(`TokenId: ${id}, Price: ${price.value} ${price.currency}`);
          });
        }
        
        if (lootexFirst30.length > 0) {
          console.log('\nTokenIds only in Lootex:');
          console.log('----------------------------------------');
          onlyInLootex.forEach(id => {
            console.log(`TokenId: ${id}`);
          });
        }
      }

      const tokensToSync = [...onlyInOpenSea, ...onlyInLootex];
      console.log(`\nDifferences found: ${tokensToSync.length}`);
      return tokensToSync;
    } else {
      console.log('\x1b[32m%s\x1b[0m', '\nFirst 30 listings are in sync');
      return [];
    }
  } catch (error) {
    console.error('Error in fetchListingsAndSync:', error);
    return [];
  }
};

const main = async () => {
  const startTime = Date.now();

  if (!apiKey) {
    console.error('OPENSEA_API_KEY is not set in the .env file');
    process.exit(1);
  }

  try {
    let collections = [];
    
    // 根据是否提供 slug 决定执行方式
    if (slug) {
      // 如果提供了 slug，只检查该 collection
      const { contractAddress, chainId, openSeaSlug } = await getCollectionInfo(slug);
      collections = [{
        slug: openSeaSlug,
        chain: chainId.toString(),
        address: contractAddress
      }];
      console.log(`Checking single collection: ${openSeaSlug}`);
    } else {
      // 如果没有提供 slug，从数据库获取所有需要监控的 collections
      collections = await getWatchedCollections();
      console.log(`Found ${collections.length} collections to monitor`);
    }

    if (force || debug) {
      console.log(`Force sync: ${force ? 'Yes' : 'No'}`);
      console.log(`Debug mode: ${debug ? 'Yes' : 'No'}`);
    }
    console.log();

    const needsSyncCollections = [];

    for (const collection of collections) {
      const collectionStartTime = Date.now();
      console.log(`\nChecking collection: ${collection.slug}`);
      console.log('----------------------------------------');

      const tokenIds = await fetchListingsAndSync(collection.slug);
      
      if (tokenIds.length > 0) {
        needsSyncCollections.push({
          slug: collection.slug,
          chain: collection.chain,
          address: collection.address,
          diffCount: tokenIds.length,
          tokenIds,
          checkDuration: ((Date.now() - collectionStartTime) / 1000).toFixed(2)
        });

        if (force) {
          const syncStartTime = Date.now();
          console.log(`\nForce syncing collection: ${collection.slug}`);
          const orders = tokenIds.map(tokenId => ({
            chainId: collection.chain,
            contractAddress: collection.address,
            tokenId: tokenId.toString()
          }));

          const { results, errors } = await rateLimitedSyncOrders(orders);
          const syncDuration = ((Date.now() - syncStartTime) / 1000).toFixed(2);
          console.log(`Sync completed for ${collection.slug} (took ${syncDuration}s)`);
          console.log(`Successfully synced: ${results.filter(r => r !== null).length}`);
          console.log(`Failed to sync: ${errors.length}`);

          if (force && debug && errors.length > 0) {
            console.log('Errors encountered:');
            errors.forEach(({ tokenId, error }) => {
              console.log(`TokenId ${tokenId}: ${error.message}`);
            });
          }
        }
      }
      
      const collectionDuration = ((Date.now() - collectionStartTime) / 1000).toFixed(2);
      console.log(`Completed in ${collectionDuration}s`);
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    // 输出汇总信息
    console.log('\n\nSummary');
    console.log('========================================');
    console.log(`Total collections checked: ${collections.length}`);
    console.log(`Collections needing sync: ${needsSyncCollections.length}`);
    console.log(`Total time: ${totalDuration}s`);
    
    if (needsSyncCollections.length > 0) {
      console.log('\nCollections that need sync:');
      console.log('----------------------------------------');
      needsSyncCollections.forEach(collection => {
        console.log(`Slug: ${collection.slug}`);
        console.log(`Chain: ${collection.chain}`);
        console.log(`Address: ${collection.address}`);
        console.log(`Differences found: ${collection.diffCount}`);
        console.log(`Check time: ${collection.checkDuration}s`);
        if (!force) {
          console.log('Run with --force to sync these collections');
        }
        console.log('----------------------------------------');
      });
    }

  } catch (error) {
    console.error('Failed to process collections:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});
