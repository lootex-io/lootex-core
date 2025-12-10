export class OpenSeaUtil {
  static convertChainId(chainStr: string): number {
    switch (chainStr) {
      case 'ethereum':
        return 1;
      case 'matic':
      case 'polygon':
        return 137;
      case 'bsc':
        return 56;
      case 'arbitrum':
        return 42161;
      case 'avalanche':
        return 43114;
      case 'base':
        return 8453;
        break;
    }
  }

  static convertChainStr(chainId: number) {
    switch (chainId) {
      case 1:
        return 'ethereum';
      case 137:
        return 'matic';
      case 56:
        return 'bsc';
      case 42161:
        return 'arbitrum';
      case 43114:
        return 'avalanche';
      case 8453:
        return 'base';
        break;
    }
    return '';
  }
}
