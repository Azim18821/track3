import React, { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  respectSafeArea?: boolean;
  transparentHeader?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  children,
  className = "",
  fullHeight = false,
  respectSafeArea = true,
  transparentHeader = false
}) => {
  const isIOS = Capacitor.getPlatform() === 'ios';
  
  return (
    <main 
      className={`container py-6 px-4 max-w-5xl mx-auto 
        ${fullHeight ? 'h-full flex flex-col' : ''}
        pb-28
        ${className}`}
      style={{
        // Apply iOS-specific styles for better native look and feel
        ...(isIOS && {
          WebkitOverflowScrolling: 'touch', // Enable momentum scrolling on iOS
          WebkitTapHighlightColor: 'rgba(0,0,0,0)', // Remove tap highlight
        })
      }}
    >
      {children}
    </main>
  );
};

export default PageContainer;