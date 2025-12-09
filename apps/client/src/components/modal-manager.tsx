'use client';

import { AcceptOfferModal } from '@/features/accept-offer/accept-offer-modal';
import { AssetModal } from '@/features/asset/modal-view';
import { CancelListingModal } from '@/features/cancel-listing/cancel-listing-modal';
import { MakeOfferModal } from '@/features/make-offer/make-offer-modal';
import { PurchaseModal } from '@/features/purchase/purchase-modal';
import { SellModal } from '@/features/sell/sell-modal';
import { Swap } from '@/features/swap/swap';
import { TransferModal } from '@/features/transfer/transfer-modal';
import { create } from 'zustand';

const modalComponents = {
  asset: AssetModal,
  purchase: PurchaseModal,
  sell: SellModal,
  makeOffer: MakeOfferModal,
  acceptOffer: AcceptOfferModal,
  cancelListing: CancelListingModal,
  swap: Swap,
  transfer: TransferModal,
};

export type ModalStoreState = {
  modals: {
    [key in keyof typeof modalComponents]: Omit<
      Parameters<(typeof modalComponents)[key]>[0],
      'setIsOpen'
    >;
  };
  setModal: <T extends keyof ModalStoreState['modals']>(
    modal: T,
  ) => (props: ModalStoreState['modals'][T]) => void;
  getModalProps: <T extends keyof ModalStoreState['modals']>(
    modal: T,
  ) => Parameters<(typeof modalComponents)[T]>[0];
};

export const useModalStore = create<ModalStoreState>()((set, get) => ({
  modals: Object.keys(modalComponents).reduce(
    (acc, key) => {
      acc[key as keyof typeof modalComponents] = {
        isOpen: false,
      };
      return acc;
    },
    {} as ModalStoreState['modals'],
  ),
  setModal: (modal) => (props) =>
    set((state) => ({
      ...state,
      modals: {
        ...state.modals,
        [modal]: props,
      },
    })),
  getModalProps: (modal) => {
    const setIsOpen = (open: boolean) =>
      get().setModal(modal)({ isOpen: open });

    return {
      ...get().modals[modal],
      setIsOpen,
    };
  },
}));

export const ModalManager = () => {
  const { getModalProps } = useModalStore();

  return (
    <>
      {Object.entries(modalComponents).map(([key, Component]) => (
        <Component
          key={key}
          {...getModalProps(key as keyof typeof modalComponents)}
        />
      ))}
    </>
  );
};

export const useModal = (modalKey: keyof typeof modalComponents) => {
  const { setModal, modals } = useModalStore();
  const isOpen = modals[modalKey]?.isOpen || false;
  const onOpen = (
    props: Omit<
      Parameters<(typeof modalComponents)[typeof modalKey]>[0],
      'isOpen' | 'setIsOpen'
    >,
  ) => setModal(modalKey)({ ...props, isOpen: true });

  const onClose = () => setModal(modalKey)({ isOpen: false });

  return { onOpen, onClose, isOpen };
};
