import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as branchApiService from "@/lib/api_services/branchApiService";
import { branchSchema } from "@/lib/validation";
import {
  handleApiError,
  validateAndParseBody,
  createSecureSuccessResponse,
  createSecureErrorResponse,
  checkRateLimitEnhanced
} from "@/lib/api-utils";
import { verifyCsrfToken } from "@/lib/security";
import type { BranchData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    // Access control is handled by the service layer, but an initial check can be here
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await checkRateLimitEnhanced(request, authUser, 'api_read');

    const branches = await branchApiService.fetchAllBranches();
    return createSecureSuccessResponse({ branches });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    // Service layer will enforce SUPER_ADMIN, but this is a quick check
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_write');

    const validatedData = await validateAndParseBody(request, branchSchema);

    const newBranch = await branchApiService.addNewBranch(validatedData as BranchData, authUser);

    // The service returns the branch with included relations as defined in the repository
    return createSecureSuccessResponse({ branch: newBranch, message: "Branch created successfully" }, 201);

  } catch (error) {
    // Specific error for duplicate branch name can be caught if service throws a specific error type
    // For now, handleApiError will catch Prisma unique constraint errors if not caught by service
    return handleApiError(error);
  }
}