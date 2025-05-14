import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KeyboardAvoidingViewProps {
  children: ReactNode;
  className?: string;
  offset?: number; // Additional offset in pixels
  behavior?: 'padding' | 'position' | 'height';
  enabled?: boolean; // Whether keyboard avoiding is enabled
}

/**
 * A component that previously adjusted its height or position to avoid 
 * being covered by the virtual keyboard on iOS devices.
 * 
 * Now acts as a simple pass-through wrapper since iOS-specific code has been removed.
 */
const KeyboardAvoidingView: React.FC<KeyboardAvoidingViewProps> = ({
  children,
  className = '',
}) => {
  return (
    <div 
      className={cn(
        'keyboard-avoiding-view',
        className
      )}
    >
      {children}
    </div>
  );
};

export default KeyboardAvoidingView;