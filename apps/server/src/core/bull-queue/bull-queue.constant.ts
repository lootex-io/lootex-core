export interface ApiJobData {
  cacheKey: string;
  data: any;
}

export const QueueCollection = {
  name: 'Collection-Api',
  process: {
    collectionInfo: 'collectionInfo',
  },
};

export const QueueAsset = {
  name: 'Asset-Api',
  process: {
    assetInfo: 'assetInfo',
  },
};

export const QueueOrder = {
  name: 'Order',
  process: {
    updateBestOrder: 'updateBestOrder',
  },
};

/**
 * queue constant for explore api
 */
export const QueueExplore = {
  name: 'Explore-Api',
  process: {
    assets: 'assets',
  },
};

export const QueueBiruStore = {
  name: 'BiruStore',
  process: {
    mintedNftTask: 'mintedNftTask',
  },
};

export const CACHE_API_DATA_DURATION = 86400;
export const QUEUE_REDIS_JOB_LOCK = 3; // 发送queue消息3s锁
