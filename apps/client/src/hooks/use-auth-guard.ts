import { useConnection, useConnect } from 'wagmi';

export const useAuthGuard = () => {
  const { isConnected } = useConnection();
  const connect = useConnect();

  // Since we don't have a modal, we can try to connect to the first connector or just warn.
  // For now, we'll just check connection.

  return (callback: () => void) => {
    if (!isConnected) {
      // Ideally trigger connect modal, but we don't have one.
      // We can try to connect to the first available connector if not connected?
      // Or just alert.
      alert('Please connect your wallet first.');
    } else {
      callback();
    }
  };
};
