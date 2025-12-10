import { RESTRICTED_LIMIT } from './constants';

export function pagination(total: number, page = 1, limit = 10) {
  try {
    return {
      page,
      limitPerPage: limit,
      count: total,
      totalPage: Math.ceil(total / limit) || 0,
    };
  } catch (err) {
    throw new TypeError('pagination format error: ' + err.message);
  }
}

export function parseLimit(limit: string) {
  try {
    return parseInt(limit, 10) > RESTRICTED_LIMIT
      ? RESTRICTED_LIMIT
      : parseInt(limit, 10);
  } catch (err) {
    throw new TypeError('limit format error: ' + err.message);
  }
}
