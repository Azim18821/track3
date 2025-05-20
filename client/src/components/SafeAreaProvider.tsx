import { useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface SafeAreaProviderProps {
  children: ReactNode;
}

/**
 * This component provides CSS variables for iOS safe areas
 * It correctly handles safe area insets by transforming
 * env(safe-area-inset-*) values into CSS variables that can be
 * consistently accessed throughout the application
 */
/**
 * This component has been disabled as we are now using a full-screen approach
 * with no safe area insets. This creates a more immersive app experience.
 */
const SafeAreaProvider = ({ children }: SafeAreaProviderProps) => {
  // No safe area handling is performed - app is full screen
  return children;
};

export default SafeAreaProvider;