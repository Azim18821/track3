import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for debouncing a value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes or component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for auto-saving data
 */
export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  delay = 1000
): {
  saving: boolean;
  lastSaved: Date | null;
  error: Error | null;
} {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Debounce the data changes
  const debouncedData = useDebounce(data, delay);
  
  // Keep track of the previous data to avoid unnecessary saves
  const previousDataRef = useRef<T>();

  // Save function that updates state
  const handleSave = useCallback(async (dataToSave: T) => {
    if (JSON.stringify(dataToSave) === JSON.stringify(previousDataRef.current)) {
      return; // Skip if data hasn't changed
    }
    
    try {
      setSaving(true);
      setError(null);
      await saveFunction(dataToSave);
      setLastSaved(new Date());
      previousDataRef.current = dataToSave;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An error occurred while saving'));
    } finally {
      setSaving(false);
    }
  }, [saveFunction]);

  // Effect to trigger save when debounced data changes
  useEffect(() => {
    handleSave(debouncedData);
  }, [debouncedData, handleSave]);

  return { saving, lastSaved, error };
}
