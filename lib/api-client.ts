// lib/api-client.ts
import { ValidationErrorDetail } from "@/components/ui/toast-notification"

export interface ApiError {
  error: string
  details?: ValidationErrorDetail[]
  status: number
}

export class ApiClientError extends Error {
  constructor(
    public error: string,
    public status: number,
    public details?: ValidationErrorDetail[]
  ) {
    super(error)
    this.name = 'ApiClientError'
  }
}

export async function apiRequest<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiClientError(
        data.error || 'An error occurred',
        response.status,
        data.details
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error
    }
    
    // Network or other errors
    throw new ApiClientError(
      'Network error. Please check your connection.',
      0
    )
  }
}

// Helper functions for common HTTP methods
export const api = {
  get: <T = any>(url: string) => apiRequest<T>(url, { method: 'GET' }),
  
  post: <T = any>(url: string, data?: any) => 
    apiRequest<T>(url, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  put: <T = any>(url: string, data?: any) => 
    apiRequest<T>(url, { 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  delete: <T = any>(url: string, data?: any) => 
    apiRequest<T>(url, { 
      method: 'DELETE', 
      body: data ? JSON.stringify(data) : undefined 
    }),
}

// In lib/api-client.ts
import { CSRF_HEADER_NAME } from '@/lib/security';

/**
 * A wrapper around the native `fetch` function to automatically include CSRF tokens
 * in headers for state-changing requests and ensure credentials (cookies) are sent.
 *
 * @param {string} url - The URL to fetch.
 * @param {RequestInit} options - Standard `fetch` options (method, headers, body, etc.).
 * @param {string | null} csrfToken - The CSRF token value. This should typically be sourced
 *                                    from a client-side state management solution like AuthContext,
 *                                    which holds the token fetched from the `/api/auth/csrf` endpoint.
 * @returns {Promise<Response>} A Promise that resolves to the `Response` object from the fetch call.
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {},
  csrfToken: string | null // Token obtained from AuthProvider/CSRF context
): Promise<Response> {
  const newOptions = { ...options };

  // Ensure headers object exists
  if (!newOptions.headers) {
    newOptions.headers = {};
  }

  // Set credentials to include cookies (important for CSRF cookie to be sent)
  newOptions.credentials = 'include';

  const method = newOptions.method?.toUpperCase();
  const stateChangingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (method && stateChangingMethods.includes(method)) {
    if (!csrfToken) {
      console.error('CSRF token is missing for a state-changing request:', url, newOptions);
      // Optionally, throw an error or try to fetch a new CSRF token here,
      // but for now, we'll rely on the caller to provide it.
      // If not provided, the server will reject it if it expects a CSRF token.
    } else {
      // Ensure headers can be assigned to
      // Type assertion to Record<string, string> is used here because HeadersInit
      // can also be Headers object or string[][], but we are ensuring it's an object.
      (newOptions.headers as Record<string, string>)[CSRF_HEADER_NAME] = csrfToken;
    }
  }
  return fetch(url, newOptions);
}