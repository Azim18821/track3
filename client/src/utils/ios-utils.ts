import { Capacitor } from '@capacitor/core';

/**
 * Utility functions that were originally for iOS-specific behavior
 * Now adapted to be platform-agnostic
 */

/**
 * Fixes the background when a modal is opened to prevent background scrolling
 */
export function fixIOSBackgroundScroll(isOpen: boolean) {
  // No-op - functionality removed
  return;
}

/**
 * General keyboard handling for forms
 */
export function setupIOSKeyboardHandling() {
  // No-op - functionality removed
  return;
}

/**
 * Prevents bounce effect on a specific element
 * @param elementSelector - CSS selector for the element
 */
export function preventIOSBounce(elementSelector: string) {
  // No-op - functionality removed
  return;
}

/**
 * Determines if the device is using iOS Safari
 */
export function isIOSSafari(): boolean {
  // Always return false since we're not targeting iOS
  return false;
}

/**
 * Get iOS version from user agent
 */
export function getIOSVersion(): number | null {
  // Always return null since we're not targeting iOS
  return null;
}

export default {
  fixIOSBackgroundScroll,
  setupIOSKeyboardHandling,
  preventIOSBounce,
  isIOSSafari,
  getIOSVersion
};