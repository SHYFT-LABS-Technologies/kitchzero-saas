"use client"

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useUserStore } from "@/lib/stores/userStore";
import type { AuthUser } from "@/lib/auth";
import { fetchWithCsrf } from "@/lib/api-client";
import { useBranchStore } from "@/lib/stores/branchStore"; // Import branch store

interface AuthContextType {
  user: AuthUser | null;
  csrfToken: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  fetchCsrfToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  const storeUser = useUserStore(state => state.user);
  const storeCsrfToken = useUserStore(state => state.csrfToken);
  const { setUser, setCsrfToken, clearAuth } = useUserStore.getState();
  const { fetchAllBranches: fetchGlobalBranches, clearBranches: storeClearBranches } = useBranchStore.getState();


  const fetchAndStoreCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/csrf', { credentials: 'include' });
      if (!response.ok) {
        console.error('Failed to fetch CSRF token, status:', response.status);
        setCsrfToken(null); // Update Zustand store
        return null;
      }
      const data = await response.json();
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken); // Update Zustand store
        return data.csrfToken;
      }
      console.error('CSRF token not found in response from /api/auth/csrf');
      setCsrfToken(null); // Update Zustand store
      return null;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      setCsrfToken(null); // Update Zustand store
      return null;
    }
  }, [setCsrfToken]);

  const _refreshTokenInternal = useCallback(async (currentCsrfToken: string | null): Promise<boolean> => {
    try {
      const response = await fetchWithCsrf("/api/auth/refresh", {
        method: "POST",
      }, currentCsrfToken);

      if(response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    }
  }, []);

  const logout = async (): Promise<void> => {
    try {
      await fetchWithCsrf("/api/auth/logout", {
        method: "POST",
      }, storeCsrfToken);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      storeClearBranches(); // Clear branch store on logout
    }
  };

  const checkAuth = useCallback(async (currentCsrfToken: string | null) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me", { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        const fetchedUser = data.user as AuthUser;
        setUser(fetchedUser);
        if (fetchedUser && fetchedUser.role === 'SUPER_ADMIN') {
          fetchGlobalBranches(); // Fetch branches if user is SUPER_ADMIN
        }
      } else if (response.status === 401) {
        const refreshSuccess = await _refreshTokenInternal(currentCsrfToken);
        if (refreshSuccess) {
          const retryResponse = await fetch("/api/auth/me", { credentials: 'include' });
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            const fetchedUserOnRetry = data.user as AuthUser;
            setUser(fetchedUserOnRetry);
            if (fetchedUserOnRetry && fetchedUserOnRetry.role === 'SUPER_ADMIN') {
              fetchGlobalBranches(); // Fetch branches if user is SUPER_ADMIN
            }
          } else {
            clearAuth();
            storeClearBranches();
          }
        } else {
           clearAuth();
           storeClearBranches();
        }
      } else {
        clearAuth();
        storeClearBranches();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      clearAuth();
      storeClearBranches();
    } finally {
      setLoading(false);
    }
  }, [setUser, clearAuth, _refreshTokenInternal, fetchGlobalBranches, storeClearBranches]);

  useEffect(() => {
    fetchAndStoreCsrfToken().then(fetchedCsrfToken => {
        checkAuth(fetchedCsrfToken);
    });
  }, [checkAuth, fetchAndStoreCsrfToken]);

  useEffect(() => {
    if (storeUser) {
      const interval = setInterval(async () => {
        const success = await _refreshTokenInternal(storeCsrfToken);
        if (!success) {
          await logout();
        }
      }, 10 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [storeUser, storeCsrfToken, _refreshTokenInternal, logout]);

  const login = async (username: string, password: string): Promise<boolean> => {
    let currentCsrfToken = storeCsrfToken;
    if (!currentCsrfToken) {
        currentCsrfToken = await fetchAndStoreCsrfToken();
        if(!currentCsrfToken) {
            console.error("Login failed: CSRF token could not be fetched.");
            return false;
        }
    }

    try {
      const response = await fetchWithCsrf("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      }, currentCsrfToken);

      if (response.ok) {
        const data = await response.json();
        const loggedInUser = data.user as AuthUser;
        setUser(loggedInUser);
        if (loggedInUser.role === 'SUPER_ADMIN') {
          fetchGlobalBranches(true); // Force refresh on new login for SUPER_ADMIN
        }
        return true;
      } else {
        const errorData = await response.json();
        console.error("Login failed:", errorData.error);
        clearAuth();
        storeClearBranches(); // Clear branches on failed login
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      clearAuth();
      storeClearBranches(); // Clear branches on login error
      return false;
    }
  };

  const publicRefreshToken = useCallback(async (): Promise<boolean> => {
    const success = await _refreshTokenInternal(storeCsrfToken);
    if (success) {
        await checkAuth(storeCsrfToken);
    } else {
        await logout();
    }
    return success;
  }, [_refreshTokenInternal, storeCsrfToken, checkAuth, logout]);

  const value: AuthContextType = {
    user: storeUser,
    csrfToken: storeCsrfToken,
    loading,
    login,
    logout,
    refreshToken: publicRefreshToken,
    fetchCsrfToken: fetchAndStoreCsrfToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}