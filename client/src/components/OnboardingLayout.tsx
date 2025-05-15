import React, { ReactNode, useEffect, useState } from 'react';
import { ThemeToggle } from './ui/theme-toggle';

interface OnboardingLayoutProps {
  children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const [isIOSStandalone, setIsIOSStandalone] = useState(false);
  
  useEffect(() => {
    // Detect if running as standalone PWA on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone;
    
    setIsIOSStandalone(isIOS && isStandalone);
  }, []);

  return (
    <div className={`ios-screen-container w-full bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-background flex flex-col overflow-x-hidden
      ${isIOSStandalone ? 'ios-standalone-mode' : 'min-h-screen'}`}>
      
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Main content area with proper padding */}
      <main className={`flex-grow flex items-start sm:items-center justify-center px-1 sm:px-4 
        ${isIOSStandalone ? 'pt-0 pb-0' : 'py-2 sm:py-4'}`}>
        {children}
      </main>
      
      {/* Footer with proper spacing */}
      <footer className={`text-center text-xs text-muted-foreground
        ${isIOSStandalone ? 'pt-0 pb-0' : 'py-2 sm:py-3'}`}>
        © {new Date().getFullYear()} TrackEaze • All rights reserved
      </footer>
    </div>
  );
}