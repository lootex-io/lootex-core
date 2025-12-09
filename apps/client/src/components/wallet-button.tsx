'use client';

import { useBalance, useDisconnect } from 'wagmi';
import { PriceCell } from './data-cells';
import { Button } from './ui/button';
import { formatUnits } from 'viem';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useState } from 'react';
import { useConnection } from 'wagmi';

const WalletDetailsModal = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const disconnect = useDisconnect();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wallet Balance</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => disconnect.mutate()}>Disconnect</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const WalletButton = () => {
  const { address } = useConnection();
  const { data: balance } = useBalance({
    address,
  });

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="h-8 md:h-10 md:text-base"
        onClick={() => setIsOpen(true)}
      >
        <PriceCell
          price={balance ? formatUnits(balance.value, balance.decimals) : '0'}
          symbol={balance?.symbol}
          decimals={5}
          showTooltip={false}
        />
      </Button>
      <WalletDetailsModal isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  );
};
