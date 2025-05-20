import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/use-responsive';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
  padSafeArea?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centered?: boolean;
}

/**
 * A responsive container that adapts to different screen sizes and device types.
 * Features:
 * - Automatic safe area padding for iOS
 * - Centered content option
 * - Maximum width constraints
 * - Full height option
 */
const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  fullHeight = false,
  padSafeArea = true,
  maxWidth = 'lg',
  centered = false,
}) => {
  const { isIOS, isIPad, deviceType } = useResponsive();
  
  // Determine container max width class
  const maxWidthClass = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }[maxWidth];
  
  // Set up padding based on device type
  const paddingClass = deviceType === 'mobile' 
    ? 'px-4 py-4' 
    : isIPad 
      ? 'px-8 py-6' 
      : 'px-6 py-4';

  const safeAreaPaddingClass = padSafeArea 
    ? 'pt-safe pb-safe pl-safe pr-safe pb-32' 
    : '';

  return (
    <div
      className={cn(
        'w-full',
        fullHeight ? 'min-h-[100svh] max-h-[100svh] h-[100svh]' : '',
        isIOS && safeAreaPaddingClass,
        isIOS ? 'overflow-hidden ios-fixed-container' : '',
        className
      )}
    >
      <div
        className={cn(
          paddingClass,
          maxWidthClass,
          centered ? 'mx-auto' : '',
          'w-full',
          isIOS ? 'overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch' : ''
        )}
        style={isIOS ? {
          height: fullHeight ? 'calc(100svh - var(--sat) - var(--sab))' : 'auto',
          width: '100%',
          maxWidth: '100%',
          paddingBottom: deviceType === 'mobile' ? '8rem' : '0'
        } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

export default ResponsiveContainer;