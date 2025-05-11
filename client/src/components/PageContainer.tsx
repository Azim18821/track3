import React, { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  respectSafeArea?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  children,
  className = "",
  fullHeight = false,
  respectSafeArea = true
}) => {
  const isIOS = Capacitor.getPlatform() === 'ios';
  
  return (
    <main 
      className={`container py-6 px-4 max-w-5xl mx-auto 
        ${fullHeight ? 'h-full flex flex-col' : ''}
        ${respectSafeArea && isIOS ? 'pt-safe pb-safe pl-safe pr-safe pb-20' : ''}
        ${className}`}
    >
      {children}
    </main>
  );
};

export default PageContainer;