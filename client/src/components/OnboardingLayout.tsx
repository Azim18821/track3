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
      
      {/* Theme toggle - position depends on platform */}
      <div className={`absolute z-10 ${isIOSStandalone ? 'top-[calc(env(safe-area-inset-top)+0.5rem)] right-4' : 'top-4 right-4'}`}>
        <ThemeToggle />
      </div>
      
      {/* Main content area with adaptive padding */}
      <main className={`flex-grow flex justify-center px-1 sm:px-4 
        ${isIOSStandalone ? 'items-start pt-[calc(env(safe-area-inset-top)+0.5rem)]' : 'items-start sm:items-center py-2 sm:py-4'}`}>
        {children}
      </main>
      
      {/* Footer with proper bottom spacing */}
      <footer className={`text-center text-xs text-muted-foreground
        ${isIOSStandalone ? 'pt-2' : 'py-2 sm:py-3'}`}>
        © {new Date().getFullYear()} TrackEaze • All rights reserved
      </footer>
    </div>
  );
}