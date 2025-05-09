import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/use-responsive';

interface ResponsiveTextProps {
  children: ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  noWrap?: boolean;
  truncate?: boolean;
  lineClamp?: number;
}

/**
 * A responsive text component that automatically adjusts its size based on the device type.
 * Features:
 * - Automatic size adjustments for different devices
 * - Text truncation with ellipsis
 * - Line clamping
 * - Font weight control
 * - Text alignment
 */
const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  className = '',
  size = 'base',
  as: Component = 'span',
  weight = 'normal',
  align = 'left',
  noWrap = false,
  truncate = false,
  lineClamp,
}) => {
  const { isIPad, deviceType } = useResponsive();
  
  // Determine text size classes based on device type and specified size
  const getSizeClass = () => {
    // Base sizes for mobile
    const sizesMap = {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      md: 'text-lg',
      lg: 'text-xl',
      xl: 'text-2xl',
      '2xl': 'text-3xl',
      '3xl': 'text-4xl',
    };
    
    // Adjust sizes for tablets (iPad)
    if (isIPad) {
      return {
        xs: 'text-sm',
        sm: 'text-base',
        base: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-3xl',
        '2xl': 'text-4xl',
        '3xl': 'text-5xl',
      }[size];
    }
    
    // Desktop gets even larger sizes
    if (deviceType === 'desktop') {
      return {
        xs: 'text-sm',
        sm: 'text-base',
        base: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-3xl',
        '2xl': 'text-4xl',
        '3xl': 'text-5xl',
      }[size];
    }
    
    // Default to mobile sizes
    return sizesMap[size];
  };
  
  // Weight classes
  const weightClass = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  }[weight];
  
  // Text alignment
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];
  
  // Optional classes
  const wrapClass = noWrap ? 'whitespace-nowrap' : '';
  const truncateClass = truncate ? 'truncate' : '';
  const lineClampClass = lineClamp ? `line-clamp-${lineClamp}` : '';

  return (
    <Component
      className={cn(
        getSizeClass(),
        weightClass,
        alignClass,
        wrapClass,
        truncateClass,
        lineClampClass,
        className
      )}
    >
      {children}
    </Component>
  );
};

export default ResponsiveText;