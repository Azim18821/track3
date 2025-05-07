/**
 * API Configuration Helper
 * 
 * Utility to help configure the API endpoint for mobile testing
 */

// Saves the API URL to localStorage
export function setCustomApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    // Validate URL format
    try {
      new URL(url); // This will throw if URL is invalid
      window.localStorage.setItem('custom_api_url', url);
      console.log(`API URL set to: ${url}`);
    } catch (e) {
      console.error('Invalid URL format:', e);
    }
  }
}

// Clears the custom API URL setting
export function resetApiUrl(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('custom_api_url');
    console.log('Custom API URL cleared, using default endpoint');
  }
}

// Gets the current API URL being used
export function getCurrentApiUrl(): string {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('custom_api_url') || 'Using default API URL';
  }
  return 'Not available';
}