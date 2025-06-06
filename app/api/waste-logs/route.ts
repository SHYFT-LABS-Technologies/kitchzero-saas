import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as wasteLogApiService from "@/lib/api_services/wasteLogApiService";
import { wasteLogSchema } from "@/lib/validation"; // For creation/update
import {
  handleApiError,
  validateAndParseBody,
  createSecureSuccessResponse,
  createSecureErrorResponse,
  checkRateLimitEnhanced,
  logRequest,
  auditLog, // Keep auditLog if service layer doesn't handle it
  checkPermissions // Keep permissions if service layer doesn't handle it
} from "@/lib/api-utils";
import { RESOURCES, ACTIONS } from "@/lib/permissions";
import { verifyCsrfToken } from "@/lib/security";
import type { WasteLogData } from "@/lib/types";

export async function GET(request: NextRequest) {
  const requestId = logRequest(request);
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await checkRateLimitEnhanced(request, authUser, 'api_read'); // Renamed 'read' to 'api_read' for consistency if that's the convention
    // Assuming checkPermissions is still relevant at route level, or moved to service
    if (!checkPermissions(authUser, RESOURCES.WASTE_LOGS, ACTIONS.READ)) {
       return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const wasteLogs = await wasteLogApiService.fetchAllWasteLogs(authUser);
    console.log(`✅ [${requestId}] Retrieved ${wasteLogs.length} waste logs for user:`, authUser.username);
    return createSecureSuccessResponse({ wasteLogs });

  } catch (error) {
    console.error(`❌ [${requestId}] Error fetching waste logs:`, error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const requestId = logRequest(request);
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
     // Assuming checkPermissions is still relevant at route level, or moved to service
    if (!checkPermissions(authUser, RESOURCES.WASTE_LOGS, ACTIONS.CREATE)) {
       return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const validatedData = await validateAndParseBody(request, wasteLogSchema);

    const result = await wasteLogApiService.recordNewWasteLog(validatedData as WasteLogData, authUser);

    // Audit logging can be tricky here if the actual creation is deferred for review.
    // The service layer might need to return enough info for appropriate auditing.
    // For now, let's assume a generic log or specific log based on direct creation vs review.
    if ('reviewId' in result) {
        await auditLog('CREATE_WASTE_LOG_REVIEW', 'WASTE_LOG_REVIEW', result.reviewId, authUser, validatedData);
        console.log(`✅ [${requestId}] Waste log review created by user:`, authUser.username);
        return createSecureSuccessResponse(result, 202); // 202 Accepted for pending review
    } else {
        await auditLog('CREATE_WASTE_LOG', 'WASTE_LOG', result.id, authUser, validatedData);
        console.log(`✅ [${requestId}] Waste log created by user:`, authUser.username);
        return createSecureSuccessResponse({ wasteLog: result, message: "Waste log created successfully" }, 201);
    }

  } catch (error) {
    console.error(`❌ [${requestId}] Error creating waste log:`, error);
    return handleApiError(error)
  }
}