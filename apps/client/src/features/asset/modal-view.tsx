import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
import { DialogTitle } from '@radix-ui/react-dialog';
import type { Asset } from '@/sdk/exports/asset';
import { AssetTemplate } from '.';

export const AssetModal = ({
  asset,
  assetId,
  isOpen,
  setIsOpen,
  collectionSlug,
}: {
  asset?: Asset;
  assetId?: string;
  collectionSlug?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return isMobile ? (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerContent className="max-w-screen-lg h-[calc(100dvh-56px)] p-0 overflow-hidden">
        <DrawerTitle className="hidden">{asset?.assetName}</DrawerTitle>
        <AssetTemplate
          asset={asset}
          assetId={assetId}
          collectionSlug={collectionSlug}
          isDrawer={true}
        />
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-screen-lg h-[calc(100dvh-40px)] p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="hidden">{asset?.assetName}</DialogTitle>
        <AssetTemplate
          asset={asset}
          assetId={assetId}
          collectionSlug={collectionSlug}
        />
      </DialogContent>
    </Dialog>
  );
};
