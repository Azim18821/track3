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
      
      {/* Theme toggle - adjusted position for iOS notch */}
      <div className={`absolute ${isIOSStandalone ? 'top-safe right-4' : 'top-4 right-4'} z-10`}>
        <ThemeToggle />
      </div>
      
      {/* Main content area with safe area padding when in standalone mode */}
      <main className={`flex-grow flex items-center justify-center px-1 sm:px-4 
        ${isIOSStandalone ? 'pt-safe pb-safe' : 'py-2 sm:py-4'}`}>
        {children}
      </main>
      
      {/* Footer with proper bottom spacing */}
      <footer className={`text-center text-xs text-muted-foreground
        ${isIOSStandalone ? 'pb-safe pt-2' : 'py-2 sm:py-3'}`}>
        © {new Date().getFullYear()} TrackEaze • All rights reserved
      </footer>
    </div>
  );
}