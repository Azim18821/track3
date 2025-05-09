import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Hook that determines if the current device is a mobile device.
 * Uses a combination of:
 * - Capacitor platform detection
 * - Screen width detection
 * - User agent detection
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if running in a native mobile container
    const isNative = Capacitor.isNativePlatform();
    const isIOS = Capacitor.getPlatform() === 'ios';
    const isAndroid = Capacitor.getPlatform() === 'android';
    
    // Check screen size
    const checkScreenSize = () => {
      return window.innerWidth <= 768;
    };

    // Check user agent for mobile patterns
    const checkUserAgent = () => {
      const ua = navigator.userAgent.toLowerCase();
      return (
        /android|webos|iphone|ipad|ipod|blackberry|windows phone/.test(ua)
      );
    };

    // Determine if device is mobile based on all checks
    const checkIsMobile = () => {
      const byPlatform = isNative || isIOS || isAndroid;
      const bySize = checkScreenSize();
      const byUserAgent = checkUserAgent();
      
      setIsMobile(byPlatform || bySize || byUserAgent);
    };

    // Initial check
    checkIsMobile();

    // Add resize listener to check screen size changes
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}

/**
 * Hook that determines if the current device is a tablet.
 * Detects iPads and other large mobile devices.
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    // Check screen size - tablets are typically between 600 and 1024px wide
    const checkScreenSize = () => {
      const width = window.innerWidth;
      return width >= 600 && width <= 1024;
    };

    // Check user agent for iPad or other tablet patterns
    const checkUserAgent = () => {
      const ua = navigator.userAgent.toLowerCase();
      // iPad detection, even for newer iPads that report as Macintosh
      const isIpad = /ipad/.test(ua) || 
        (/macintosh/.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
      // Android tablet detection
      const isAndroidTablet = /android/.test(ua) && !/mobile/.test(ua);
      
      return isIpad || isAndroidTablet;
    };

    // Determine if device is a tablet
    const checkIsTablet = () => {
      const bySize = checkScreenSize();
      const byUserAgent = checkUserAgent();
      
      setIsTablet(bySize || byUserAgent);
    };

    // Initial check
    checkIsTablet();

    // Add resize listener to check screen size changes
    window.addEventListener('resize', checkIsTablet);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsTablet);
    };
  }, []);

  return isTablet;
}

/**
 * Hook to detect if we're on an iOS device
 */
export function useIsIOS() {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Hook to detect if we're on an Android device
 */
export function useIsAndroid() {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Hook to detect if we're in a native mobile app
 */
export function useIsNative() {
  return Capacitor.isNativePlatform();
}

export default useIsMobile;