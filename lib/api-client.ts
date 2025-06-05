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