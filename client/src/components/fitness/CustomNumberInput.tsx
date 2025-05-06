import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MinusIcon, PlusIcon } from 'lucide-react';

interface CustomNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
  formatValue?: (value: number) => string;
  parseValue?: (value: string) => number;
  controls?: boolean;
  label?: string;
  labelClassName?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export function CustomNumberInput({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  className,
  disabled = false,
  formatValue = (v) => `${v}`,
  parseValue = (v) => parseFloat(v),
  controls = true,
  label,
  labelClassName,
  inputClassName,
  buttonClassName,
}: CustomNumberInputProps) {
  const [localValue, setLocalValue] = useState<string>(formatValue(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local value when the prop changes
  useEffect(() => {
    setLocalValue(formatValue(value));
  }, [value, formatValue]);

  // Increment/decrement functions
  const increment = () => {
    if (disabled) return;
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const decrement = () => {
    if (disabled) return;
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout to update the actual value
    timeoutRef.current = setTimeout(() => {
      const parsed = parseValue(e.target.value);
      if (!isNaN(parsed)) {
        const clamped = Math.max(min, Math.min(max, parsed));
        onChange(clamped);
      }
    }, 300);
  };

  // Handle blur event to make sure we reset the displayed value if invalid
  const handleBlur = () => {
    const parsed = parseValue(localValue);
    if (isNaN(parsed)) {
      // Reset to the last valid value
      setLocalValue(formatValue(value));
    } else {
      // Clamp the value to min/max
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setLocalValue(formatValue(clamped));
    }
  };

  // Handle keydown for increment/decrement via arrow keys
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    }
  };

  return (
    <div className={cn('flex flex-col space-y-1.5', className)}>
      {label && (
        <label 
          htmlFor={inputRef.current?.id} 
          className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', labelClassName)}
        >
          {label}
        </label>
      )}
      <div className="flex">
        {controls && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn('rounded-r-none', buttonClassName)}
            onClick={decrement}
            disabled={disabled || value <= min}
            tabIndex={-1}
          >
            <MinusIcon className="h-3 w-3" />
          </Button>
        )}
        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            'text-center',
            controls && 'rounded-none border-x-0',
            inputClassName
          )}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          role="spinbutton"
        />
        {controls && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn('rounded-l-none', buttonClassName)}
            onClick={increment}
            disabled={disabled || value >= max}
            tabIndex={-1}
          >
            <PlusIcon className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}