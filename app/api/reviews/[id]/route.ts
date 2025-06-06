import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as reviewApiService from "@/lib/api_services/reviewApiService";
import { reviewActionSchema } from "@/lib/validation";
import {
  handleApiError,
  validateAndParseBody,
  validateRouteParams, // Changed from validateUrlParam
  checkRateLimitEnhanced,
  createSecureSuccessResponse,
  createSecureErrorResponse
  // checkPermission can be handled by service layer or remain if specific endpoint permission needed
} from "@/lib/api-utils";
import { verifyCsrfToken } from "@/lib/security";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    // Service layer will enforce SUPER_ADMIN for fetching specific review details.
    // If BRANCH_ADMIN should see their own submitted reviews, service logic would need adjustment.
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await checkRateLimitEnhanced(request, authUser, 'api_read');
    const { id: reviewId } = validateRouteParams(params, { id: 'uuid' });

    const review = await reviewApiService.findReviewById(reviewId, authUser);
    return createSecureSuccessResponse({ review });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    // Service layer (processReview) will enforce SUPER_ADMIN for the reviewer.
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_write');
    const { id: reviewId } = validateRouteParams(params, { id: 'uuid' });

    const { action, reviewNotes } = await validateAndParseBody(request, reviewActionSchema);

    const updatedReview = await reviewApiService.processReview(reviewId, action, reviewNotes, authUser);

    return createSecureSuccessResponse({
      review: updatedReview,
      message: `Review ${action}d successfully`
    });

  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE handler for /api/reviews/[id] is typically not needed if reviews are processed (approved/rejected)
// rather than directly deleted. If deletion of a review record itself is required, it can be added.