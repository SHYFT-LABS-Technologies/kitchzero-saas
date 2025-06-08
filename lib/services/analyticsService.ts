import { api } from '@/lib/api-client'; // Changed import
import type { AnalyticsData } from '@/lib/types'; // ApiResponse wrapper might not be needed if api.get returns data directly

const ANALYTICS_API_BASE_URL = '/api/analytics';

/**
 * Fetches analytics data for a given time range.
 * @param timeRange - The time range for which to fetch analytics (e.g., 'today', '7d', '30d').
 * @returns A promise that resolves to an API response containing the analytics data.
 */
export async function fetchAnalytics(
  timeRange: 'today' | '7d' | '30d' | '90d'
): Promise<{ analytics: AnalyticsData }> { // Adjusted return type
  // api.get will return the data structure directly, which is { analytics: AnalyticsData }
  // as defined by the server's response in app/api/analytics/route.ts
  const response = await api.get<{ analytics: AnalyticsData }>(`${ANALYTICS_API_BASE_URL}?timeRange=${timeRange}`);
  return response;
}

// AnalyticsApiResponse type is removed as the function now directly returns the expected object.
// The commented-out alternative implementation is also no longer relevant with api.get.
