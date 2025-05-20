import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Define device types
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type DeviceOrientation = 'portrait' | 'landscape';
export type IOSDeviceCategory =
  | 'iPhoneSE'
  | 'iPhone8'
  | 'iPhone8Plus'
  | 'iPhoneX'
  | 'iPhoneXR'
  | 'iPhone12'
  | 'iPhone13Mini'
  | 'iPhone13Pro'
  | 'iPhone13ProMax'
  | 'iPhone14'
  | 'iPhone14Plus'
  | 'iPhone14Pro'
  | 'iPhone14ProMax'
  | 'iPadMini'
  | 'iPad'
  | 'iPadAir'
  | 'iPadPro11'
  | 'iPadPro12'
  | 'other';

/**
 * This hook provides detailed device detection and responsive information:
 * - Device type (mobile, tablet, desktop)
 * - Device orientation (portrait, landscape)
 * - iOS-specific device category
 * - Screen dimensions
 * 
 * Note: Safe area insets have been removed for a full-screen experience
 */
export const useResponsive = () => {
  // Device platform
  const platform = Capacitor.getPlatform();
  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';
  const isNative = isIOS || isAndroid;
  const isWeb = platform === 'web';

  // Window dimensions state
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Device type state
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  
  // Device orientation state
  const [orientation, setOrientation] = useState<DeviceOrientation>('portrait');
  
  // iOS device category state
  const [iOSDeviceCategory, setIOSDeviceCategory] = useState<IOSDeviceCategory>('other');

  // No safe area insets in full-screen mode

  // Update dimensions and device info on resize or orientation change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowDimensions({ width, height });

      // Determine device type based on width
      if (width < 640) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }

      // Set orientation
      setOrientation(width > height ? 'landscape' : 'portrait');

      // Determine iOS device category
      if (isIOS) {
        determineIOSDeviceCategory(width, height);
      }

      // No safe area insets in full-screen mode
    };

    // Initial size check
    handleResize();

    // Setup event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [isIOS]);

  // Helper function to determine iOS device category
  const determineIOSDeviceCategory = (width: number, height: number) => {
    // Get the smaller and larger dimension
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);

    // iPhones
    if (minDimension <= 400) { // Likely an iPhone
      if (minDimension <= 320) {
        setIOSDeviceCategory('iPhoneSE');
      } else if (minDimension <= 375) {
        if (maxDimension <= 667) {
          setIOSDeviceCategory('iPhone8');
        } else if (maxDimension <= 812) {
          setIOSDeviceCategory('iPhoneX');
        } else if (maxDimension <= 844) {
          setIOSDeviceCategory('iPhone13Mini');
        } else {
          setIOSDeviceCategory('iPhone12');
        }
      } else if (minDimension <= 390) {
        if (maxDimension <= 844) {
          setIOSDeviceCategory('iPhone14');
        } else {
          setIOSDeviceCategory('iPhone14Pro');
        }
      } else if (minDimension <= 414) {
        if (maxDimension <= 736) {
          setIOSDeviceCategory('iPhone8Plus');
        } else if (maxDimension <= 896) {
          setIOSDeviceCategory('iPhoneXR');
        } else {
          setIOSDeviceCategory('iPhone13Pro');
        }
      } else if (minDimension <= 428) {
        if (maxDimension <= 926) {
          setIOSDeviceCategory('iPhone13ProMax');
        } else {
          setIOSDeviceCategory('iPhone14ProMax');
        }
      } else if (minDimension <= 430) {
        setIOSDeviceCategory('iPhone14Plus');
      }
    } 
    // iPads
    else if (minDimension <= 1000) {
      if (minDimension <= 768) {
        setIOSDeviceCategory('iPadMini');
      } else if (minDimension <= 820) {
        setIOSDeviceCategory('iPad');
      } else if (minDimension <= 834) {
        setIOSDeviceCategory('iPadAir');
      } else if (minDimension <= 900) {
        setIOSDeviceCategory('iPadPro11');
      } else {
        setIOSDeviceCategory('iPadPro12');
      }
    } else {
      setIOSDeviceCategory('other');
    }
  };

  // Safe area function removed for full-screen experience

  return {
    deviceType,
    orientation,
    dimensions: windowDimensions,
    isIOS,
    isAndroid,
    isNative,
    isWeb,
    iOSDeviceCategory,
    isNotched: false, // No notch detection in full-screen mode
    isIPad: iOSDeviceCategory.includes('iPad'),
    isIPhone: iOSDeviceCategory.includes('iPhone'),
    hasHomeButton: ['iPhoneSE', 'iPhone8', 'iPhone8Plus'].includes(iOSDeviceCategory as string),
  };
};

// Helper custom hook for simplified usage
export const useIsNotchedDevice = () => {
  const { isNotched } = useResponsive();
  return isNotched;
};

export const useIsIPad = () => {
  const { isIPad } = useResponsive();
  return isIPad;
};

export const useScreenDimensions = () => {
  const { dimensions } = useResponsive();
  return dimensions;
};

export const useDeviceOrientation = () => {
  const { orientation } = useResponsive();
  return orientation;
};

export default useResponsive;