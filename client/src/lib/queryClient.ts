import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { offlineApiRequest, getNetworkStatus } from './offlineApi';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;

    try {
      // Try to parse response as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } else {
        // Fallback to text if not JSON
        errorMessage = await res.text();
      }
    } catch (e) {
      console.error("Error parsing error response:", e);
      // If parsing fails, use statusText as fallback
      errorMessage = errorMessage || "Unknown error occurred";
    }

    throw new Error(`${errorMessage} (Status: ${res.status})`);
  }
}

// Offline-enabled API request function
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    headers?: Record<string, string | undefined>
  }
): Promise<any> {
  try {
    // Special case for FormData (file uploads) - don't use offline API
    if (data instanceof FormData) {
      if (navigator.onLine) {
        // For FormData, we don't set the Content-Type header
        // because the browser will set it with the correct boundary
        const res = await fetch(url, {
          method,
          body: data,
          credentials: "include",
        });

        await throwIfResNotOk(res);
        return await res.json();
      } else {
        throw new Error("File uploads are not available offline");
      }
    }

    // Use offline-aware API request
    const result = await offlineApiRequest(
      method as any, 
      url, 
      data
    );

    // Create a mock Response object to maintain compatibility
    const mockResponse = new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    // Add an indicator if this was from cache
    if (result && (result as any)._offlineCreated || (result as any)._offlineDeleted) {
      Object.defineProperty(mockResponse, 'fromOfflineQueue', {
        value: true,
        writable: false
      });
    }

    return result;
  } catch (error) {
    // Only log errors in development
    if (import.meta.env.DEV) {
      console.error("Offline API error:", error);
    }

    // Extract error message for better error handling
    const offlineError = error as Error;

    // If offline handling failed, attempt regular online request as fallback
    if (navigator.onLine) {
      // Initialize headers
      const fetchHeaders: HeadersInit = {};
      
      // Only set content-type for JSON data
      if (data && !(data instanceof FormData)) {
        fetchHeaders['Content-Type'] = 'application/json';
      }
      
      // Apply any custom headers from options
      if (options?.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (value !== undefined) {
            fetchHeaders[key] = value;
          }
        });
      }
      
      const res = await fetch(url, {
        method,
        headers: fetchHeaders,
        body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });

      await throwIfResNotOk(res);
      return await res.json();
    }

    // Create a failed response for completely offline scenario
    const errorResponse = new Response(JSON.stringify({
      error: true,
      message: offlineError?.message || "This action is not available offline"
    }), {
      status: navigator.onLine ? 500 : 503, // 503 Service Unavailable for offline
      headers: { 'Content-Type': 'application/json' }
    });

    throw errorResponse;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // For essential API calls like /api/user, always try a direct fetch first
    // to ensure authentication cookies are properly included
    if (queryKey[0] === '/api/user' || 
        queryKey[0] === '/api/fitness-plans/generation-progress' ||
        queryKey[0] === '/api/fitness-plans/eligibility') {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }

        await throwIfResNotOk(res);
        return await res.json();
      } catch (error) {
        // Only log errors in development
        if (import.meta.env.DEV) {
          console.error("Network error:", error);
        }
        // Fall through to offline handling if direct request fails
      }
    }

    try {
      // Use offline-aware API request for GET requests
      return await offlineApiRequest('GET', queryKey[0] as string);
    } catch (error) {
      // If offline handling failed, fall back to regular fetch
      // Only log errors in development
      if (import.meta.env.DEV) {
        console.error("Network error:", error);
      }

      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    }
  };

// Add network status to queryClient to make it available in components
export const networkStatus = getNetworkStatus();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 30000, // Refetch every 30 seconds
      refetchOnWindowFocus: true, // Refetch when window regains focus
      staleTime: 25000, // Consider data stale after 25 seconds 
      retry: 2, // Retry failed requests twice
      refetchOnMount: true, // Refetch data when component mounts
      refetchOnReconnect: true, // Refetch when internet reconnects
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
});