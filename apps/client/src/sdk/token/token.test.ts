import { expect, test } from 'vitest';

import { LOOT, NATIVE, WETH9 } from './constants';
import {
  createToken,
  isNativeToken,
  isTokenEqual,
  isWrappedToken,
  toWrappedToken,
} from './token';

const eth = NATIVE[1];
const weth = WETH9[1];
const loot = LOOT[1];

test('createToken', () => {
  expect(createToken(eth)).toEqual(eth);
  expect(createToken(weth)).toEqual(weth);
  expect(createToken(loot)).toEqual(loot);
});

test('isTokenEqual', () => {
  expect(isTokenEqual(eth, eth)).toBeTruthy();
  expect(isTokenEqual(eth, weth)).toBeFalsy();
  expect(isTokenEqual(eth, loot)).toBeFalsy();
});

test('isNativeToken', () => {
  expect(isNativeToken(eth)).toBeTruthy();
  expect(isNativeToken(weth)).toBeFalsy();
  expect(isNativeToken(loot)).toBeFalsy();
});

test('isWrappedToken', () => {
  expect(isWrappedToken(eth)).toBeFalsy();
  expect(isWrappedToken(weth)).toBeTruthy();
  expect(isWrappedToken(loot)).toBeFalsy();
});

test('toWrappedToken', () => {
  expect(toWrappedToken(eth)).toBe(weth);
  expect(toWrappedToken(weth)).toBe(weth);
  expect(toWrappedToken(loot)).toBe(loot);
});
