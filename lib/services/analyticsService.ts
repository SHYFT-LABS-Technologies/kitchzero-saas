import { fetchFromApi } from '@/lib/api-client';
import type { AnalyticsData, ApiResponse } from '@/lib/types'; // Assuming AnalyticsData is part of overall ApiResponse

const ANALYTICS_API_BASE_URL = '/api/analytics';

/**
 * Fetches analytics data for a given time range.
 * @param timeRange - The time range for which to fetch analytics (e.g., 'today', '7d', '30d').
 * @returns A promise that resolves to an API response containing the analytics data.
 */
export async function fetchAnalytics(
  timeRange: 'today' | '7d' | '30d' | '90d'
): Promise<ApiResponse<AnalyticsData>> { // The API returns { analytics: AnalyticsData }
  const response = await fetchFromApi<{ analytics: AnalyticsData }>(`${ANALYTICS_API_BASE_URL}?timeRange=${timeRange}`);
  // The actual API returns { analytics: AnalyticsData }, so we need to wrap it in a standard ApiResponse structure if needed,
  // or adjust the return type. For now, let's assume the component using this service expects AnalyticsData directly
  // or the ApiResponse structure matches.
  // Based on current api-client, fetchFromApi returns T directly.
  // The /api/analytics route returns NextResponse.json({ analytics: data })
  // So, the service should return this structure.
  return response; // This will be { analytics: AnalyticsData }
}

/**
 * Specific type for the direct response from /api/analytics.
 * This can be used by components that consume fetchAnalytics.
 */
export type AnalyticsApiResponse = {
  analytics: AnalyticsData;
};

// If a more standardized ApiResponse<AnalyticsData> is needed by consumers,
// then fetchAnalytics should be:
/*
export async function fetchAnalytics(
  timeRange: 'today' | '7d' | '30d' | '90d'
): Promise<ApiResponse<AnalyticsData>> {
  const result = await fetchFromApi<{ analytics: AnalyticsData }>(`${ANALYTICS_API_BASE_URL}?timeRange=${timeRange}`);
  return {
    success: true, // Assuming success if no error is thrown
    data: result.analytics,
    message: "Analytics data fetched successfully" // Optional message
  };
}
*/
