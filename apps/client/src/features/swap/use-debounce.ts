import debounce from 'lodash/debounce';
import { useEffect, useMemo } from 'react';

export type CallbackFunction<T extends React.ChangeEvent<HTMLInputElement>> = (
  event: T,
) => void;

export const useDebounce = <T extends React.ChangeEvent<HTMLInputElement>>(
  func: CallbackFunction<T>,
  wait = 500,
) => {
  const debounced = useMemo(() => debounce(func, wait), [func, wait]);

  useEffect(() => {
    return () => {
      debounced.cancel();
    };
  }, [debounced]);

  return debounced;
};
