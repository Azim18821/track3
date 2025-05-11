import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';

interface KeyboardAvoidingViewProps {
  children: ReactNode;
  className?: string;
  offset?: number; // Additional offset in pixels
  behavior?: 'padding' | 'position' | 'height';
  enabled?: boolean; // Whether keyboard avoiding is enabled
}

/**
 * A component that automatically adjusts its height or position to avoid 
 * being covered by the virtual keyboard on iOS devices.
 * 
 * Features:
 * - Detects keyboard visibility and adjusts view accordingly
 * - Three adjustment behaviors: padding, position, or height
 * - Customizable offset to fine-tune the adjustment
 * - Can be disabled when needed
 */
const KeyboardAvoidingView: React.FC<KeyboardAvoidingViewProps> = ({
  children,
  className = '',
  offset = 0,
  behavior = 'padding',
  enabled = true
}) => {
  const isIOS = Capacitor.getPlatform() === 'ios';
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const viewRef = useRef<HTMLDivElement>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Only enable keyboard avoiding on iOS and when explicitly enabled
  const isEnabled = isIOS && enabled;
  
  useEffect(() => {
    if (!isEnabled) return;
    
    // Track keyboard events
    const handleKeyboardWillShow = (event: any) => {
      // Extract keyboard height from event
      const keyboardHeight = event.keyboardHeight || 0;
      
      // Add offset and update state
      setKeyboardHeight(keyboardHeight + offset);
      setKeyboardVisible(true);
      
      // Scroll to active element if it's a form field
      const activeElement = document.activeElement;
      if (activeElement && 
          (activeElement.tagName === 'INPUT' || 
           activeElement.tagName === 'TEXTAREA' || 
           activeElement.tagName === 'SELECT')) {
        setTimeout(() => {
          (activeElement as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };
    
    const handleKeyboardWillHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
      
      // When keyboard hides, scroll back to where we were
      if (viewRef.current) {
        setTimeout(() => {
          viewRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
      }
    };
    
    // Add event listeners for keyboard events
    window.addEventListener('keyboardWillShow', handleKeyboardWillShow);
    window.addEventListener('keyboardDidShow', handleKeyboardWillShow);
    window.addEventListener('keyboardWillHide', handleKeyboardWillHide);
    window.addEventListener('keyboardDidHide', handleKeyboardWillHide);
    
    return () => {
      window.removeEventListener('keyboardWillShow', handleKeyboardWillShow);
      window.removeEventListener('keyboardDidShow', handleKeyboardWillShow);
      window.removeEventListener('keyboardWillHide', handleKeyboardWillHide);
      window.removeEventListener('keyboardDidHide', handleKeyboardWillHide);
    };
  }, [isEnabled, offset]);
  
  // Compute styles based on behavior
  let dynamicStyle: React.CSSProperties = {};
  
  if (keyboardVisible && isEnabled) {
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
      className={cn(
        'keyboard-avoiding-view',
        keyboardVisible && isEnabled ? 'keyboard-visible' : '',
        className
      )}
      style={dynamicStyle}
    >
      {children}
    </div>
  );
};

export default KeyboardAvoidingView;