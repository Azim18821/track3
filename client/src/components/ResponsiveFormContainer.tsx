import React, { ReactNode, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Capacitor } from '@capacitor/core';
import KeyboardAvoidingView from './KeyboardAvoidingView';

interface ResponsiveFormContainerProps {
  children: ReactNode;
  className?: string;
  keyboardOffset?: number;
  submitButton?: ReactNode;
  scrollable?: boolean;
}

/**
 * A specialized container for forms that handles:
 * - iOS keyboard avoidance
 * - Properly sized input fields
 * - Fixed submit button on mobile
 * - Scrollable content when needed
 */
const ResponsiveFormContainer: React.FC<ResponsiveFormContainerProps> = ({
  children,
  className = '',
  keyboardOffset = 60,
  submitButton,
  scrollable = true,
}) => {
  const isMobile = useIsMobile();
  const isIOS = Capacitor.getPlatform() === 'ios';
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  useEffect(() => {
    if (!isIOS) return;
    
    const handleKeyboardWillShow = () => {
      setIsKeyboardVisible(true);
    };
    
    const handleKeyboardWillHide = () => {
      setIsKeyboardVisible(false);
    };
    
    window.addEventListener('keyboardWillShow', handleKeyboardWillShow);
    window.addEventListener('keyboardWillHide', handleKeyboardWillHide);
    
    return () => {
      window.removeEventListener('keyboardWillShow', handleKeyboardWillShow);
      window.removeEventListener('keyboardWillHide', handleKeyboardWillHide);
    };
  }, [isIOS]);
  
  // Base container classes
  const containerClasses = `
    w-full 
    ${scrollable ? 'overflow-y-auto' : ''} 
    pb-safe-min
    ${className}
  `.trim();
  
  // Content container classes
  const contentClasses = `
    w-full
    ${scrollable ? 'flex-1' : ''}
    ${isMobile ? 'px-4' : 'px-6 sm:px-8 lg:px-10'}
    pt-4 pb-20
  `.trim();
  
  // Fixed button container classes
  const buttonContainerClasses = `
    fixed bottom-0 left-0 right-0 
    bg-background/80 backdrop-blur-sm
    border-t border-border
    px-4 py-3 pb-safe
    z-30
  `.trim();

  return (
    <KeyboardAvoidingView 
      className={containerClasses}
      offset={keyboardOffset}
    >
      {/* Main content area */}
      <div className={contentClasses}>
        {children}
      </div>
      
      {/* Fixed submit button for mobile */}
      {submitButton && !isKeyboardVisible && (
        <div className={buttonContainerClasses}>
          {submitButton}
        </div>
      )}
    </KeyboardAvoidingView>
  );
};

export default ResponsiveFormContainer;