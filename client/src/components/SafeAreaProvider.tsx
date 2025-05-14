import { ReactNode } from 'react';

interface SafeAreaProviderProps {
  children: ReactNode;
}

/**
 * This component previously provided CSS variables for iOS safe areas
 * Now it's just a simple pass-through component for compatibility
 */
const SafeAreaProvider = ({ children }: SafeAreaProviderProps) => {
  // Simple pass-through with no iOS-specific logic
  return children;
};

export default SafeAreaProvider;