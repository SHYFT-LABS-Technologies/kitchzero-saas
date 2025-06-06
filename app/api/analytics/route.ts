import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { analyticsQuerySchema } from "@/lib/validation";
import {
  handleApiError,
  validateQueryParams,
  checkRateLimitEnhanced,
  createSecureSuccessResponse
} from "@/lib/api-utils";
import * as analyticsApiService from "@/lib/api_services/analyticsApiService";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await checkRateLimitEnhanced(request, authUser, 'analytics');

    const { searchParams } = new URL(request.url);
    // Validate timeRange, default to 'today' if not provided or invalid by schema
    const { timeRange = 'today' } = validateQueryParams(analyticsQuerySchema, searchParams);

    console.log("📊 Analytics request:", { user: authUser.username, timeRange });

    const analyticsData = await analyticsApiService.getDashboardAnalytics(authUser, timeRange);

    return createSecureSuccessResponse({ analytics: analyticsData });
  } catch (error) {
    return handleApiError(error)
  }
}