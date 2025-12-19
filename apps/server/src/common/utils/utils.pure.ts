import { RESTRICTED_LIMIT } from './constants';

/**
 * Pure Utility Functions
 * @module
 */
const OPEN_LOGIN_PREFIX = 'tkey-';

export const createWordSearchRegex = (words: Array<string>): RegExp =>
  new RegExp(`\\b(${words.join('|')})\\b`, 'i');

export const normaliseTorusVerifier = ({ value }: { value: string }) => {
  return value.indexOf(OPEN_LOGIN_PREFIX) === 0
    ? value.split(OPEN_LOGIN_PREFIX)[1]
    : value;
};

export const queryLimit = ({ value }: { value: number }): number => {
  return Math.min(RESTRICTED_LIMIT, value || 20);
};

export const jsonToUrlParam = (json) => {
  return Object.keys(json)
    .map((key) => (json[key] ? key + '=' + json[key] : ''))
    .filter((e) => e != '')
    .join('&');
};

/**
 * 异步操作超时操作
 * @param promise
 * @param timeout
 */
export const withTimeout = (promise, timeout = 5000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), timeout),
    ),
  ]);
};

export const asyncConcurrent = async (array, iterator, concurrency = 5) => {
  const allAsyncTasks = [];
  const executingAsyncTasks = [];
  const executeResult = {};
  for (const [index, item] of array.entries()) {
    const asyncTask = Promise.resolve()
      .then(() => iterator(item, index, array))
      .then((value) => {
        executeResult[index] = { status: 'fulfilled', value };
      })
      .catch((error) => {
        executeResult[index] = { status: 'rejected', error };
      })
      .finally(() => {
        executingAsyncTasks.splice(executingAsyncTasks.indexOf(asyncTask), 1);
      });
    allAsyncTasks.push(asyncTask);
    if (concurrency <= array.length) {
      executingAsyncTasks.push(asyncTask);
      if (executingAsyncTasks.length >= concurrency) {
        await Promise.race(executingAsyncTasks);
      }
    }
  }
  await Promise.all(allAsyncTasks);
  return array.map((_, index) => executeResult[index]);
};

export const randomNum = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 非线性反比公式, weight = 1 / (value^2)
 * weightedLottery([20, 200], 5)  // 20-200 积分范围， 5 抽奖5次
 * 结果：[20, 22, 21, 23, 24]
 * @param pointsRange
 * @param numDraws
 */
export const weightedLottery = (pointsRange, numDraws = 1) => {
  // 确保积分范围有效
  if (!Array.isArray(pointsRange) || pointsRange.length !== 2) {
    throw new Error(
      'pointsRange must be an array with two elements [min, max]',
    );
  }

  const [min, max] = pointsRange;
  if (min >= max) {
    throw new Error('min must be less than max');
  }

  // 创建积分列表和对应权重
  const points = [];
  const weights = [];

  for (let value = min; value <= max; value++) {
    points.push(value);
    weights.push(1 / Math.pow(value, 2)); // 使用 weight = 1 / (value^2)
  }

  // 归一化权重
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const probabilities = weights.map((weight) => weight / totalWeight);

  // 随机抽取积分
  const results = [];
  for (let i = 0; i < numDraws; i++) {
    const rand = Math.random();
    let cumulativeProbability = 0;

    for (let j = 0; j < probabilities.length; j++) {
      cumulativeProbability += probabilities[j];
      if (rand <= cumulativeProbability) {
        results.push(points[j]);
        break;
      }
    }
  }

  return results;
};

/**
 * 线性反比公式, weight = 1 / value
 * @param pointsRange
 * @param numDraws
 */
export const linedWeightedLottery = (pointsRange, numDraws = 1) => {
  // 确保积分范围有效
  if (!Array.isArray(pointsRange) || pointsRange.length !== 2) {
    throw new Error(
      'pointsRange must be an array with two elements [min, max]',
    );
  }

  const [min, max] = pointsRange;
  if (min >= max) {
    throw new Error('min must be less than max');
  }

  // 创建积分列表和对应权重
  const points = [];
  const weights = [];

  for (let value = min; value <= max; value++) {
    points.push(value);
    weights.push(1 / value); // 权重与积分值成反比
  }

  // 归一化权重
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const probabilities = weights.map((weight) => weight / totalWeight);

  // 随机抽取积分
  const results = [];
  for (let i = 0; i < numDraws; i++) {
    const rand = Math.random();
    let cumulativeProbability = 0;

    for (let j = 0; j < probabilities.length; j++) {
      cumulativeProbability += probabilities[j];
      if (rand <= cumulativeProbability) {
        results.push(points[j]);
        break;
      }
    }
  }

  return results;
};
