'use client';

import { useConnect, useDisconnect, useConnection, useConnectors } from 'wagmi';
import { Button } from '@/components/ui/button';

export const WalletModal = () => {
  return (
    <div>
      <p>Wallet Modal</p>
    </div>
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

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect.mutate()}
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
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect.mutate({ connector })}
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
          {buttonText || `Connect ${connector.name}`}
        </button>
      ))}
    </div>
  );
};
