import React, { ReactNode } from 'react';
import { ThemeToggle } from './ui/theme-toggle';

interface OnboardingLayoutProps {
  children: ReactNode;
}

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="w-full bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-background flex flex-col overflow-x-hidden min-h-screen">
      
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Main content area */}
      <main className="flex-grow flex items-start sm:items-center justify-center px-1 sm:px-4 py-2 sm:py-4">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-2 sm:py-3">
        © {new Date().getFullYear()} TrackEaze • All rights reserved
      </footer>
    </div>
  );
}