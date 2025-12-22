// File: src/lib/queryClient.ts

import { QueryClient, QueryFunction } from "@tanstack/react-query";

// ========================================
// 🔧 BACKEND URL CONFIGURATION
// ========================================

/**
 * Get backend URL from environment or defaults
 * Development: http://localhost:5000
 * Production: Uses VITE_API_URL or current origin
 */
const getBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  
  if (envUrl) {
    console.log("✅ Using VITE_API_URL from .env.local:", envUrl);
    return envUrl;
  }

  // Fallback for development
  if (import.meta.env.DEV) {
    console.warn("⚠️  VITE_API_URL not set, using default: http://localhost:5000");
    return "http://localhost:5000";
  }

  // Production fallback
  console.log("ℹ️  Using current origin:", window.location.origin);
  return window.location.origin;
};

const BACKEND_BASE_URL = getBackendUrl();

// ✅ Log configuration on startup
console.log("==================================================");
console.log("🔗 API Configuration");
console.log("Backend URL:", BACKEND_BASE_URL);
console.log("Environment:", import.meta.env.MODE);
console.log("==================================================");

/**
 * Build full URL from endpoint
 * If endpoint is already full URL, return as-is
 * Otherwise, prepend backend base URL
 */
const buildUrl = (endpoint: string): string => {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const fullUrl = `${BACKEND_BASE_URL}${endpoint}`;
  console.log(`📡 Building URL: ${endpoint} → ${fullUrl}`);
  return fullUrl;
};

// ========================================
// ERROR HANDLING
// ========================================

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Attempt to read JSON error first, fall back to text
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ========================================
// API REQUEST FUNCTION
// ========================================

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // ✅ Build the full URL with backend base
  const fullUrl = buildUrl(url);
  
  console.log(`📡 [${method}] ${fullUrl}`);
  
  let headers: HeadersInit = {
    credentials: "include",
  };
  
  let body: BodyInit | undefined;

  // Check if data is FormData (file upload)
  if (data instanceof FormData) {
    // IMPORTANT: DO NOT set the Content-Type header for FormData. 
    // The browser must set it automatically along with the boundary marker.
    console.log("📦 FormData upload detected");
    body = data;
    
  } else if (data !== undefined) {
    // For regular JSON payloads (login, registration, updates)
    console.log("📝 JSON payload:", data);
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body,
      credentials: "include", // IMPORTANT: Include credentials for authenticated requests
    });

    console.log(`📡 Response: ${res.status} ${res.statusText}`);

    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    console.error(`❌ Request failed: ${error.message}`);
    throw error;
  }
}

// ========================================
// QUERY FUNCTION
// ========================================

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build the URL from queryKey
    const endpoint = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    
    // ✅ Build the full URL with backend base
    const fullUrl = buildUrl(endpoint as string);
    
    console.log(`📖 [GET] ${fullUrl}`);
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include", // CRITICAL: Must include credentials for session/cookie auth
        method: "GET",
      });

      console.log(`📖 Response: ${res.status} ${res.statusText}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn("⚠️  Unauthorized (401) - returning null");
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`📖 Response data received`);
      return data;
    } catch (error: any) {
      console.error(`❌ Query failed: ${error.message}`);
      throw error;
    }
  };

// ========================================
// REACT QUERY CLIENT
// ========================================

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});