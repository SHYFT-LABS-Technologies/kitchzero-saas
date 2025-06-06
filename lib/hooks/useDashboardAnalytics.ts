"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from "@/components/auth-provider"; // In case user context becomes relevant
import * as analyticsService from '@/lib/services/analyticsService';
import type { AnalyticsData, AnalyticsApiResponse } from '@/lib/services/analyticsService'; // Use specific response type

export type TimeRange = "today" | "7d" | "30d" | "90d";

export interface UseDashboardAnalyticsReturn {
  analytics: AnalyticsData | null;
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
  refreshing: boolean;
  lastUpdated: Date | null;
  fetchAnalyticsData: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;
}

export function useDashboardAnalytics(): UseDashboardAnalyticsReturn {
  const { user } = useAuth(); // Included if user context might be needed later

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAnalyticsData = useCallback(async () => {
    // Do not fetch if user is not available, though current API doesn't require user
    if (!user) {
        setLoading(false); // Stop loading if no user
        return;
    }

    setLoading(true);
    setError(null);
    try {
      // The service returns { analytics: AnalyticsData } directly
      const response: AnalyticsApiResponse = await analyticsService.fetchAnalytics(timeRange);
      setAnalytics(response.analytics);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error("Failed to fetch analytics:", err);
      setError(err.message || "An unknown error occurred while fetching analytics.");
      setAnalytics(null); // Clear data on error
    } finally {
      setLoading(false);
    }
  }, [timeRange, user]); // Add user to dependency array

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]); // fetchAnalyticsData is memoized with timeRange and user as dependencies

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  return {
    analytics,
    loading,
    error,
    timeRange,
    refreshing,
    lastUpdated,
    fetchAnalyticsData, // Expose if direct call needed, e.g. for try again button
    handleRefresh,
    setTimeRange,
  };
}
