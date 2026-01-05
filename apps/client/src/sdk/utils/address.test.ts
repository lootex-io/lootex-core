import { describe, expect, it } from 'vitest';
import { formatAddress } from './address';

describe('formatAddress', () => {
  it('should format a valid ethereum address correctly with default parameters', () => {
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const result = formatAddress(address);
    expect(result).toBe('0xd8dA...6045');
  });

  it('should format address with custom number of start and end characters', () => {
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const result = formatAddress(address, 10, 8);
    expect(result).toBe('0xd8dA6BF2...7aA96045');
  });

  it('should handle invalid address by returning empty string', () => {
    expect(formatAddress('invalid-address')).toBe('');
  });

  it('should normalize address casing', () => {
    const lowercase = '0xbf6692795a07684147838fc54a2764aa884c440c';
    const checksum = '0xbF6692795A07684147838fC54A2764aa884C440c';

    const result1 = formatAddress(lowercase);
    const result2 = formatAddress(checksum);

    expect(result1).toBe(result2);
    expect(result1).toBe('0xbF66...440c');
  });
});
