"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface User {
  id: string
  username: string
  role: "SUPER_ADMIN" | "BRANCH_ADMIN"
  branchId?: string
import { fetchWithCsrf } from "@/lib/api-client"; // Import fetchWithCsrf

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  csrfToken: string | null; // Added csrfToken
  fetchCsrfToken: () => Promise<string | null>; // Added fetchCsrfToken
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  /**
   * Holds the current CSRF token fetched from the `/api/auth/csrf` endpoint.
   * This token is included in the `AuthContext` and used by `fetchWithCsrf`
   * for state-changing API requests. It's initially null and set on component mount.
   */
  const [csrfTokenState, setCsrfTokenState] = useState<string | null>(null);

  // Check authentication status and fetch CSRF token on mount
  useEffect(() => {
    checkAuth()
    fetchAndStoreCsrfToken(); // Fetch CSRF token on mount
  }, [])

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      // Refresh token every 10 minutes (before 15-minute expiry)
      const interval = setInterval(async () => {
        const success = await refreshToken()
        if (!success) {
          await logout()
        }
      }, 10 * 60 * 1000) // 10 minutes

      return () => clearInterval(interval)
    }
  }, [user])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshSuccess = await refreshToken()
        if (refreshSuccess) {
          // Retry getting user info
          const retryResponse = await fetch("/api/auth/me", {
            credentials: 'include'
          })
          if (retryResponse.ok) {
            const data = await retryResponse.json()
            setUser(data.user)
          }
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setLoading(false)
    }
  }

  }

  /**
   * Fetches a new CSRF token from the `/api/auth/csrf` endpoint and stores it
   * in the `csrfTokenState`. This function is called once when the AuthProvider mounts.
   * It can also be exposed via context if a manual refresh of the CSRF token is needed,
   * though typically the initial token should suffice for the session's state-changing operations.
   * The endpoint sets an HttpOnly cookie and also returns the token in the response body,
   * which is then stored in `csrfTokenState`.
   * @returns {Promise<string | null>} The fetched CSRF token, or null if fetching failed.
   */
  const fetchAndStoreCsrfToken = async (): Promise<string | null> => {
    try {
      // This initial fetch to get the CSRF token does not itself require a CSRF token in its header.
      // It relies on 'credentials: include' to receive the HttpOnly cookie set by the server.
      const response = await fetch('/api/auth/csrf', { credentials: 'include' });
      if (!response.ok) {
        console.error('Failed to fetch CSRF token, status:', response.status, await response.text());
        setCsrfTokenState(null);
        return null;
      }
      const data = await response.json();
      if (data.csrfToken) {
        setCsrfTokenState(data.csrfToken);
        // console.log('CSRF token fetched and stored:', data.csrfToken); // For debugging
        return data.csrfToken;
      }
      console.error('CSRF token not found in response from /api/auth/csrf');
      setCsrfTokenState(null);
      return null;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      setCsrfTokenState(null);
      return null;
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetchWithCsrf("/api/auth/login", { // Use fetchWithCsrf
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }, csrfTokenState); // Pass csrfTokenState

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        return true
      } else {
        const errorData = await response.json()
        console.error("Login failed:", errorData.error)
        return false
      }
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await fetchWithCsrf("/api/auth/logout", { // Use fetchWithCsrf
        method: "POST",
      }, csrfTokenState); // Pass csrfTokenState
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
      // Optionally, clear CSRF token from state on logout if desired,
      // or fetch a new one if user is expected to re-login soon.
      // For now, we'll let it persist; a new one is fetched on page load/Auth Provider mount.
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetchWithCsrf("/api/auth/refresh", { // Use fetchWithCsrf
        method: "POST",
      }, csrfTokenState); // Pass csrfTokenState

      return response.ok
    } catch (error) {
      console.error("Token refresh error:", error)
      return false
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshToken,
    /**
     * The current CSRF token. Consumers should pass this to `fetchWithCsrf`
     * for any state-changing API requests.
     */
    csrfToken: csrfTokenState,
    /**
     * A function to manually fetch (or re-fetch) and store the CSRF token.
     * Primarily used internally on mount, but available if needed.
     */
    fetchCsrfToken: fetchAndStoreCsrfToken
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}