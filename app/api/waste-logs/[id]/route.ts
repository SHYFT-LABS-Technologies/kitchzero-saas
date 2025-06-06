import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as wasteLogApiService from "@/lib/api_services/wasteLogApiService";
import { updateWasteLogSchema, deleteWithReasonSchema } from "@/lib/validation";
import {
  handleApiError,
  validateAndParseBody,
  createSecureSuccessResponse,
  createSecureErrorResponse,
  checkRateLimitEnhanced,
  validateRouteParams, // Changed from validateUrlParam
  // checkPermission // Assuming permissions are handled in service or not needed here
} from "@/lib/api-utils";
import { verifyCsrfToken } from "@/lib/security";
import type { WasteLogData } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await checkRateLimitEnhanced(request, authUser, 'api_read');
    const { id: wasteLogId } = validateRouteParams(params, { id: 'uuid' });

    const wasteLog = await wasteLogApiService.findWasteLogById(wasteLogId, authUser);
    return createSecureSuccessResponse({ wasteLog });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_write');
    const { id: wasteLogId } = validateRouteParams(params, { id: 'uuid' });

    const validatedData = await validateAndParseBody(request, updateWasteLogSchema);

    const result = await wasteLogApiService.modifyWasteLog(wasteLogId, validatedData as Partial<WasteLogData>, authUser);

    if ('reviewId' in result) {
        return createSecureSuccessResponse(result, 202); // Accepted for pending review
    } else {
        return createSecureSuccessResponse({ wasteLog: result, message: "Waste log updated successfully" });
    }

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_delete');
    const { id: wasteLogId } = validateRouteParams(params, { id: 'uuid' });

    let reason: string | undefined;
    // For DELETE, reason might be in body if user is BRANCH_ADMIN (as per existing logic)
    // SUPER_ADMIN might not need to provide a reason.
    // The service layer `removeWasteLog` expects `deletionReason: string | undefined`
    if (authUser.role === "BRANCH_ADMIN") {
        // Only parse body for reason if branch admin, as super admin might not send a body
        // And parsing an empty body can cause errors.
        // A more robust way would be to check Content-Type header or try-catch the request.json()
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > 0) {
            const body = await validateAndParseBody(request, deleteWithReasonSchema);
            reason = body.reason;
        } else {
            // If BRANCH_ADMIN and no reason provided in body, this might be an issue if reason is mandatory
            // The service layer `removeWasteLog` handles if reason is undefined but required by role.
        }
    }

    const result = await wasteLogApiService.removeWasteLog(wasteLogId, reason, authUser);

    if ('reviewId' in result) {
        return createSecureSuccessResponse(result, 202); // Accepted for pending review
    } else {
        return createSecureSuccessResponse({ message: result.message });
    }

  } catch (error) {
    return handleApiError(error);
  }
}