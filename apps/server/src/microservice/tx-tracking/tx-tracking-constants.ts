export const enum TxTrackingType {
  GP_PAY = 1,
}

export class TxTrackingGPPayData {
  chainId: number;
  accountId: string;
  walletAddress: string;
  endTime: number; // 单位s
  fromBlockNumber: number;
  consumeGp: number;
  signatures: string[];
}
