import type { Asset } from 'lootex/asset';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const maxSelectedItems = 20;

type Item = {
  orderHash: `0x${string}`;
  perPrice: string;
  priceSymbol: string;
} & Pick<Asset, 'assetId' | 'assetImageUrl' | 'assetName' | 'assetTokenId'>;

type SelectionStore = {
  selectedItems: Item[]; //assetid
  setSelectedItems: (assets: Asset[]) => void;
  selectItem: (asset: Asset) => void;
  removeItem: (asset: Asset) => void;
  removeItemByOrderHash: (orderHash: `0x${string}`) => void;
  removeItemsByOrderHashes: (orderHashes: `0x${string}`[]) => void;
  checkIsSelected: (asset: Asset) => boolean;
  toggleItem: (asset: Asset) => void;
  clear: () => void;
};

const mapAssetToItem = (asset: Asset): Item => {
  return {
    ...asset,
    assetId: asset.assetId,
    assetImageUrl: asset.assetImageUrl,
    assetName: asset.assetName,
    assetTokenId: asset.assetTokenId,
    orderHash: asset.order?.listing?.hash ?? '0x',
    perPrice: asset.order?.listing?.price?.toString() ?? '0',
    priceSymbol: asset.order?.listing?.priceSymbol ?? '',
  };
};

export const useSelectionStore = create<SelectionStore>()((set, get) => ({
  selectedItems: [],
  setSelectedItems: (assets) =>
    set({ selectedItems: assets.map(mapAssetToItem) }),
  selectItem: (asset) =>
    set((state) => ({
      selectedItems:
        state.selectedItems.length < maxSelectedItems
          ? [...state.selectedItems, mapAssetToItem(asset)]
          : state.selectedItems,
    })),
  removeItem: (asset) =>
    set((state) => ({
      selectedItems: state.selectedItems.filter(
        (i) => i !== mapAssetToItem(asset),
      ),
    })),
  toggleItem: (asset) =>
    set((state) => ({
      selectedItems: state.selectedItems.some(
        (item) =>
          item.orderHash === mapAssetToItem(asset).orderHash &&
          item.assetId === asset.assetId,
      )
        ? state.selectedItems.filter(
            (i) =>
              i.orderHash !== mapAssetToItem(asset).orderHash ||
              i.assetId !== asset.assetId,
          )
        : [...state.selectedItems, mapAssetToItem(asset)],
    })),
  removeItemByOrderHash: (orderHash) =>
    set((state) => ({
      selectedItems: state.selectedItems.filter(
        (i) => i.orderHash !== orderHash,
      ),
    })),
  removeItemsByOrderHashes: (orderHashes) =>
    set((state) => ({
      selectedItems: state.selectedItems.filter(
        (i) => !orderHashes.includes(i.orderHash),
      ),
    })),
  clear: () => set({ selectedItems: [] }),
  checkIsSelected: (asset) => {
    const selectedItems = get().selectedItems;

    return selectedItems.some(
      (i) =>
        i.orderHash === mapAssetToItem(asset).orderHash &&
        i.assetId === asset.assetId,
    );
  },
}));
