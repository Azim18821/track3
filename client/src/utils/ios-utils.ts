import { Capacitor } from '@capacitor/core';

/**
 * Utility functions for iOS-specific behavior
 */

/**
 * Fixes the background when a modal is opened on iOS to prevent background scrolling
 * This is a common problem on iOS where the background content remains scrollable
 * when a modal is open
 */
export function fixIOSBackgroundScroll(isOpen: boolean) {
  // Only apply on iOS
  if (Capacitor.getPlatform() !== 'ios') return;
  
  const html = document.documentElement;
  const body = document.body;
  
  if (isOpen) {
    // Get the current scroll position
    const scrollY = window.scrollY;
    
    // Apply fixed positioning to lock the background
    html.style.position = 'fixed';
    html.style.top = `-${scrollY}px`;
    html.style.width = '100%';
    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    
    // Store the scroll position to restore later
    html.setAttribute('data-scroll-position', scrollY.toString());
  } else {
    // Restore scrolling when modal closes
    const scrollY = parseInt(html.getAttribute('data-scroll-position') || '0', 10);
    
    // Remove fixed positioning
    html.style.position = '';
    html.style.top = '';
    html.style.width = '';
    html.style.overflow = '';
    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    body.style.overflow = '';
    
    // Scroll back to the original position
    window.scrollTo(0, scrollY);
  }
}

/**
 * Properly handles iOS keyboard display and dismissal
 * Useful for forms where you want to ensure proper behavior
 */
export function setupIOSKeyboardHandling() {
  // Only apply on iOS
  if (Capacitor.getPlatform() !== 'ios') return;
  
  const inputs = document.querySelectorAll('input, textarea, select');
  
  // Add blur event listeners to all form elements
  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      // This forces any active keyboard to dismiss
      (document.activeElement as HTMLElement)?.blur();
    });
  });
  
  // Add listener for form submissions to dismiss keyboard
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', () => {
      (document.activeElement as HTMLElement)?.blur();
    });
  });
}

/**
 * Prevents iOS Safari bounce effect on a specific element
 * @param elementSelector - CSS selector for the element
 */
export function preventIOSBounce(elementSelector: string) {
  // Only apply on iOS
  if (Capacitor.getPlatform() !== 'ios') return;
  
  const element = document.querySelector(elementSelector);
  
  if (element) {
    element.addEventListener('touchstart', (e) => {
      const el = e.currentTarget as HTMLElement;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const height = el.getBoundingClientRect().height;
      
      // Prevent default if we're at the top or bottom
      if (
        (scrollTop <= 0 && e.touches[0].clientY > 10) || 
        (scrollTop + height >= scrollHeight && e.touches[0].clientY < height - 10)
      ) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

/**
 * Determines if the device is using iOS Safari
 */
export function isIOSSafari(): boolean {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  
  return isIOS && isSafari;
}

/**
 * Get iOS version from user agent
 */
export function getIOSVersion(): number | null {
  if (Capacitor.getPlatform() !== 'ios') return null;
  
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

export default {
  fixIOSBackgroundScroll,
  setupIOSKeyboardHandling,
  preventIOSBounce,
  isIOSSafari,
  getIOSVersion
};