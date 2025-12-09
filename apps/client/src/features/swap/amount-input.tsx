import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from './use-debounce';

interface AmountInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  className?: string;
}

export const AmountInput = ({
  value,
  onChange,
  isLoading,
  className,
}: AmountInputProps) => {
  const debouncedOnChange = useDebounce(onChange, 300);
  const [internalValue, setInternalValue] = useState(value);
  const [fontSize, setFontSize] = useState('3rem'); // Default large size
  const inputRef = useRef<HTMLInputElement>(null);

  // Adjust font size based on input width
  const adjustFontSize = () => {
    const input = inputRef.current;
    if (!input) return;

    const valueLength = (internalValue || '').length;

    if (valueLength <= 10) {
      setFontSize('1.875rem'); // 30px
    } else if (valueLength <= 12) {
      setFontSize('1.75rem'); // 28px
    } else if (valueLength <= 14) {
      setFontSize('1.625rem'); // 26px
    } else if (valueLength <= 16) {
      setFontSize('1.5rem'); // 24px
    } else {
      setFontSize('1.375rem'); // 22px
    }
  };

  useEffect(() => {
    setInternalValue(value);
    adjustFontSize();
  }, [value]);

  useEffect(() => {
    adjustFontSize();
  }, [internalValue]);

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <input
      ref={inputRef}
      type="number"
      style={{ fontSize }}
      className={cn(
        'w-full font-black bg-transparent outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
        className,
      )}
      placeholder="0"
      value={internalValue}
      onChange={(e) => {
        const regex = /^\d*\.?\d*$/;
        if (e.target.value === '' || regex.test(e.target.value)) {
          setInternalValue(e.target.value);
          debouncedOnChange(e);
        }
      }}
      disabled={isLoading}
    />
  );
};
