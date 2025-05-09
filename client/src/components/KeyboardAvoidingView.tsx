import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface KeyboardAvoidingViewProps {
  children: ReactNode;
  className?: string;
  offset?: number; // Additional offset in pixels
  behavior?: 'padding' | 'position' | 'height';
}

/**
 * A component that automatically adjusts its height or position to avoid 
 * being covered by the virtual keyboard on iOS devices.
 */
const KeyboardAvoidingView: React.FC<KeyboardAvoidingViewProps> = ({
  children,
  className = '',
  offset = 0,
  behavior = 'padding'
}) => {
  const isIOS = Capacitor.getPlatform() === 'ios';
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const viewRef = useRef<HTMLDivElement>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  useEffect(() => {
    if (!isIOS) return;
    
    // Track keyboard events
    const handleKeyboardWillShow = (info: any) => {
      const keyboardHeight = info.keyboardHeight || 0;
      setKeyboardHeight(keyboardHeight + offset);
      setKeyboardVisible(true);
    };
    
    const handleKeyboardWillHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    };
    
    // Add event listeners for keyboard events
    window.addEventListener('keyboardWillShow', handleKeyboardWillShow);
    window.addEventListener('keyboardWillHide', handleKeyboardWillHide);
    
    return () => {
      window.removeEventListener('keyboardWillShow', handleKeyboardWillShow);
      window.removeEventListener('keyboardWillHide', handleKeyboardWillHide);
    };
  }, [isIOS, offset]);
  
  // Compute styles based on behavior
  let dynamicStyle: React.CSSProperties = {};
  
  if (keyboardVisible && isIOS) {
    switch (behavior) {
      case 'padding':
        dynamicStyle = { paddingBottom: `${keyboardHeight}px` };
        break;
      case 'position':
        dynamicStyle = { transform: `translateY(-${keyboardHeight}px)` };
        break;
      case 'height':
        dynamicStyle = { height: `calc(100% - ${keyboardHeight}px)` };
        break;
    }
  }
  
  return (
    <div 
      ref={viewRef}
      className={`keyboard-avoiding-view ${className}`}
      style={dynamicStyle}
    >
      {children}
    </div>
  );
};

export default KeyboardAvoidingView;