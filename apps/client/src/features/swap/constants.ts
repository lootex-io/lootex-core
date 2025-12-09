import { defaultChain } from '@/lib/wagmi';
import { NATIVE, type Token, WETH9 } from 'lootex/token';
import { z } from 'zod';

export const tokens: Token[] = [
  NATIVE[defaultChain.id],
  WETH9[defaultChain.id],
];

export const schema = z.object({
  fromToken: z.string().optional(),
  toToken: z.string().optional(),
  fromAmount: z
    .string()
    .min(1)
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
  toAmount: z
    .string()
    .min(1)
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
});
