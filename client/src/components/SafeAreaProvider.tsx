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
const SafeAreaProvider = ({ children }: SafeAreaProviderProps) => {
  useEffect(() => {
    if (Capacitor.getPlatform() === 'ios') {
      // Set up a MutationObserver to watch for changes in the document
      const observer = new MutationObserver(() => {
        updateSafeAreaVariables();
      });
      
      // Start observing
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style']
      });
      
      // Initial update
      updateSafeAreaVariables();
      
      // Clear observer on cleanup
      return () => {
        observer.disconnect();
      };
    }
  }, []);
  
  // Function to update safe area CSS variables
  const updateSafeAreaVariables = () => {
    // Get the current safe area values using getComputedStyle
    // We create a temp element to read the computed values
    const tempDiv = document.createElement('div');
    tempDiv.style.paddingTop = 'env(safe-area-inset-top)';
    tempDiv.style.paddingRight = 'env(safe-area-inset-right)';
    tempDiv.style.paddingBottom = 'env(safe-area-inset-bottom)';
    tempDiv.style.paddingLeft = 'env(safe-area-inset-left)';
    document.body.appendChild(tempDiv);
    
    const styles = window.getComputedStyle(tempDiv);
    
    // Extract pixel values
    const top = parseInt(styles.paddingTop) || 0;
    const right = parseInt(styles.paddingRight) || 0;
    const bottom = parseInt(styles.paddingBottom) || 0;
    const left = parseInt(styles.paddingLeft) || 0;
    
    // Remove the temp element
    document.body.removeChild(tempDiv);
    
    // Set CSS variables
    document.documentElement.style.setProperty('--sat', `${top}px`);
    document.documentElement.style.setProperty('--sar', `${right}px`);
    document.documentElement.style.setProperty('--sab', `${bottom}px`);
    document.documentElement.style.setProperty('--sal', `${left}px`);
    
    // Set a variable to check for notched devices
    document.documentElement.style.setProperty('--has-notch', top > 20 ? '1' : '0');
    
    // Add a class to the body if we have a notched device
    if (top > 20) {
      document.body.classList.add('has-notch');
    } else {
      document.body.classList.remove('has-notch');
    }
    
    // Add a class based on the home indicator
    if (bottom > 20) {
      document.body.classList.add('has-home-indicator');
    } else {
      document.body.classList.remove('has-home-indicator');
    }
  };
  
  return children;
};

export default SafeAreaProvider;