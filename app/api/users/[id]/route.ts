import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser, invalidateAllUserSessions } from "@/lib/auth"; // Keep invalidateAllUserSessions
import * as userApiService from "@/lib/api_services/userApiService";
import { updateUserSchema } from "@/lib/validation";
import {
  handleApiError,
  validateAndParseBody,
  createSecureSuccessResponse,
  createSecureErrorResponse,
  checkRateLimitEnhanced,
  validateRouteParams
} from "@/lib/api-utils";
import { verifyCsrfToken } from "@/lib/security";
import type { UserUpdateData } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    // Service layer will enforce SUPER_ADMIN, but initial check is good
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await checkRateLimitEnhanced(request, authUser, 'api_read');
    const { id: userId } = validateRouteParams(params, { id: 'uuid' });

    const user = await userApiService.findUserById(userId, authUser);
    // user from service is already without password
    return createSecureSuccessResponse({ user });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    // Service layer will enforce SUPER_ADMIN
     if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_write');
    const { id: userId } = validateRouteParams(params, { id: 'uuid' });

    const validatedData = await validateAndParseBody(request, updateUserSchema);

    const updatedUser = await userApiService.modifyUser(userId, validatedData as UserUpdateData, authUser);

    // If password was changed by an admin, invalidate all sessions for this user.
    if (validatedData.password) {
      await invalidateAllUserSessions(userId);
      console.log(`All sessions for user ${userId} invalidated due to password change by admin ${authUser.id}.`);
    }

    // updatedUser from service is already without password
    return createSecureSuccessResponse({ user: updatedUser, message: "User updated successfully" });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
    // Service layer will enforce SUPER_ADMIN
     if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_delete');
    const { id: userId } = validateRouteParams(params, { id: 'uuid' });

    await userApiService.removeUser(userId, authUser);

    return createSecureSuccessResponse({ message: "User deleted successfully" });

  } catch (error) {
    return handleApiError(error)
  }
}