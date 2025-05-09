import React, { useEffect, useState, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';
import { fixIOSBackgroundScroll } from '@/utils/ios-utils';
import { X } from 'lucide-react';

interface IOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  hideCloseButton?: boolean;
  showHeader?: boolean;
  fullHeight?: boolean;
  position?: 'center' | 'bottom';
  className?: string;
  preventDismiss?: boolean;
  innerClassName?: string;
}

/**
 * An iOS-optimized modal component that:
 * - Properly handles iOS background scrolling
 * - Supports bottom sheets with pull-down dismiss
 * - Uses iOS-like animations and styling
 * - Respects safe area insets
 */
const IOSModal: React.FC<IOSModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  hideCloseButton = false,
  showHeader = true,
  fullHeight = false,
  position = 'center',
  className = '',
  preventDismiss = false,
  innerClassName = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const isIOS = Capacitor.getPlatform() === 'ios';
  
  // Track drag gesture for bottom sheet
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragThreshold = 100; // Amount of drag needed to dismiss
  
  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      // Fix iOS background scrolling
      fixIOSBackgroundScroll(true);
      
      // Show modal with animation
      setIsVisible(true);
    } else {
      // Hide modal
      setIsVisible(false);
      
      // Restore scrolling after animation completes
      const timer = setTimeout(() => {
        fixIOSBackgroundScroll(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventDismiss) {
      onClose();
    }
  };
  
  // Handle pull down gesture for bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (position !== 'bottom' || preventDismiss) return;
    setDragStartY(e.touches[0].clientY);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null || position !== 'bottom' || preventDismiss) return;
    
    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - dragStartY);
    setDragOffsetY(diff);
  };
  
  const handleTouchEnd = () => {
    if (position !== 'bottom' || preventDismiss) return;
    
    if (dragOffsetY > dragThreshold) {
      onClose();
    }
    
    setDragStartY(null);
    setDragOffsetY(0);
  };
  
  // Reset drag state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDragStartY(null);
      setDragOffsetY(0);
    }
  }, [isOpen]);
  
  // Render modal
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          'fixed transform transition-transform duration-300 ease-out bg-background rounded-lg shadow-lg overflow-hidden pb-safe',
          position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2' : '',
          position === 'bottom' ? 'bottom-0 left-0 right-0 rounded-t-xl translate-y-0' : '',
          position === 'center' && !fullHeight ? '-translate-y-1/2' : '',
          position === 'center' && fullHeight ? '-translate-y-1/2 max-h-[90vh]' : '',
          !isVisible && position === 'center' ? '-translate-y-[60%] opacity-0' : '',
          !isVisible && position === 'bottom' ? 'translate-y-full' : '',
          'max-w-lg mx-auto w-full',
          innerClassName
        )}
        style={{
          transform: dragOffsetY > 0 
            ? `${position === 'bottom' ? `translateY(${dragOffsetY}px)` : ''}`
            : undefined
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull indicator for bottom sheet */}
        {position === 'bottom' && !preventDismiss && (
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-2 mb-2" />
        )}
        
        {/* Modal header */}
        {showHeader && (
          <div className="px-4 py-3 flex items-center justify-between border-b">
            <h3 className="text-lg font-medium">{title}</h3>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Modal content */}
        <div className={cn(
          'overflow-y-auto',
          fullHeight ? 'max-h-[calc(85vh-4rem)]' : '',
          isIOS ? '-webkit-overflow-scrolling-touch' : ''
        )}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default IOSModal;