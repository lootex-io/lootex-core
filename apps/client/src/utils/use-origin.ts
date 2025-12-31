import { useEffect, useState } from 'react';

export const useOrigin = () => {
  const [origin, setOrigin] = useState<string>();

  useEffect(() => {
    setOrigin(window?.location?.origin || undefined);
  }, []);

  return origin;
};
