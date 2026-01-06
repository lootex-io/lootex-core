import { describe, expect, it } from 'vitest';

import { stringifyQuery } from './request';

describe('stringifyQuery', () => {
  it('should stringify query', () => {
    expect(stringifyQuery({ a: 1, b: [2, 3] })).toBe('a=1&b[0]=2&b[1]=3');
  });
});
