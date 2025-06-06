import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as branchApiService from "@/lib/api_services/branchApiService";
import { branchSchema } from "@/lib/validation"; // Using full branchSchema for PUT, implies all fields required.
                                             // Consider a partial schema for updates if not all fields are mandatory.
import {
  handleApiError,
  validateAndParseBody,
  createSecureSuccessResponse,
  createSecureErrorResponse,
  checkRateLimitEnhanced,
  validateRouteParams // Changed from validateSimpleParam
} from "@/lib/api-utils";
import { verifyCsrfToken } from "@/lib/security";
import type { BranchData } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await checkRateLimitEnhanced(request, authUser, 'api_read');
    const { id: branchId } = validateRouteParams(params, { id: 'uuid' });

    const branch = await branchApiService.findBranchById(branchId);
    return createSecureSuccessResponse({ branch });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
     if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_write');
    const { id: branchId } = validateRouteParams(params, { id: 'uuid' });

    // Using branchSchema implies all fields (name, location) are required for update.
    // If partial updates are desired, a separate updateBranchSchema would be better.
    const validatedData = await validateAndParseBody(request, branchSchema);

    const updatedBranch = await branchApiService.modifyBranch(branchId, validatedData as BranchData, authUser);

    return createSecureSuccessResponse({ branch: updatedBranch, message: "Branch updated successfully" });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_delete');
    const { id: branchId } = validateRouteParams(params, { id: 'uuid' });

    await branchApiService.removeBranch(branchId, authUser);

    // The service layer removeBranch throws an error if dependencies exist.
    // If it successfully completes, we can return a success message.
    return createSecureSuccessResponse({ message: "Branch deleted successfully" });

  } catch (error) {
    return handleApiError(error)
  }
}