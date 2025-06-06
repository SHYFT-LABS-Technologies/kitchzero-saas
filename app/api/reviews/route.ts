import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as reviewApiService from "@/lib/api_services/reviewApiService";
import {
  checkRateLimitEnhanced,
  handleApiError,
  createSecureSuccessResponse
} from "@/lib/api-utils";
import type { ReviewStatus } from "@/lib/repositories/reviewRepository"; // Import ReviewStatus type

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    // Service will enforce SUPER_ADMIN, but an initial check is good practice
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await checkRateLimitEnhanced(request, authUser, 'api_read');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ReviewStatus | null; // Cast to ReviewStatus or null

    // Validate status if provided
    if (status && !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
        return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    const reviews = await reviewApiService.fetchAllReviews(authUser, status || undefined);

    return createSecureSuccessResponse({ reviews });

  } catch (error) {
    return handleApiError(error)
  }
}
