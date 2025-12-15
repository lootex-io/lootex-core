'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  useConnect,
  useDisconnect,
  useConnection,
  useConnectors,
  useChainId,
  type Connector,
  type UseConnectReturnType,
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { Copy, LogOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatAddress } from 'lootex/utils';
import { useToast } from '@/hooks/use-toast';
import { PriceCell } from './data-cells';
import { config } from '@/lib/wagmi';
import { Separator } from '@/components/ui/separator';
import useWalletBalances from '@/hooks/use-wallet-balances';

export const WalletModal = ({
  open,
  onOpenChange,
  onDisconnect,
  connectors,
  connect,
  isConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDisconnect: () => void;
  connectors: readonly Connector[];
  connect: UseConnectReturnType;
  isConnected: boolean;
}) => {
  const { address, connector } = useConnection();

  const chainId = useChainId();
  const chain = config.chains.find((c) => c.id === chainId);

  const { data: balances } = useWalletBalances({
    enabled: isConnected,
  });

  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md px-0">
        <DialogHeader className="px-6">
          <DialogTitle className="font-body">
            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
                <div className="flex flex-col  items-start">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-xl font-semibold">
                      {formatAddress(address ?? '')}
                    </h1>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(address ?? '');
                        toast({
                          title: 'Address copied to clipboard',
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Image
                      alt={connector?.name || 'connector icon'}
                      src={connector?.icon || ''}
                      width={14}
                      height={14}
                    />
                    <span className="text-sm font-normal text-muted-foreground">
                      {connector?.name}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              'Sign in'
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6">
          {isConnected ? (
            <div className="flex flex-col gap-3 items-stretch bg-secondary p-3 rounded-[0.5rem]">
              <span className="font-semibold text-lg">
                {chain?.name || 'Unknown Network'}
              </span>
              <Separator />
              <div className="flex flex-col gap-3 items-stretch self-stretch">
                <span className="font-extrabold text-xs">Tokens</span>
                {balances?.map((balance) => (
                  <div
                    key={balance.token.address}
                    className="flex items-center gap-2"
                  >
                    <Image
                      src={balance.token.icon}
                      alt={balance.token.name}
                      width={24}
                      height={24}
                    />
                    <PriceCell
                      price={balance.formatted}
                      symbol={balance.token.symbol}
                      decimals={5}
                      showTooltip={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid gap-2">
                {connectors.map((connector) => (
                  <button
                    type="button"
                    key={connector.uid}
                    onClick={() => {
                      connect.mutate({ connector });
                      onOpenChange(false);
                    }}
                    className="flex w-full items-center justify-start gap-2 rounded-xl p-2 text-left font-semibold transition-all hover:bg-neutral-200"
                  >
                    <Image
                      alt={connector?.name || 'connector icon'}
                      src={connector?.icon || ''}
                      width={48}
                      height={48}
                    />
                    <span>{connector.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {isConnected && (
          <div className="flex flex-col gap-4 px-6">
            <Separator />
            <DialogFooter>
              <button
                type="button"
                onClick={onDisconnect}
                className="flex w-full items-center justify-start gap-2 rounded-xl p-3 text-left font-semibold transition-all hover:bg-neutral-200 text-destructive"
              >
                <LogOut className="h-6 w-6" />
                Disconnect Wallet
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const ConnectButton = ({
  buttonText,
  connectButtonStyle,
}: {
  buttonText?: React.ReactNode;
  connectButtonStyle?: React.CSSProperties;
}) => {
  const { address, isConnected } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const [open, setOpen] = useState(false);

  const handleDisconnect = () => {
    disconnect.mutate();
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontFamily: 'var(--font-poetsen-one)',
          borderRadius: '20px',
          height: '40px',
          minWidth: 'auto',
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBlock: '0px',
          alignItems: 'center',
          backgroundColor: '#2C2C2C',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          ...connectButtonStyle,
        }}
      >
        {isConnected
          ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
          : buttonText || 'Connect Wallet'}
      </button>
      <WalletModal
        open={open}
        onOpenChange={setOpen}
        onDisconnect={handleDisconnect}
        connectors={connectors}
        connect={connect}
        isConnected={isConnected}
      />
    </>
  );
};
