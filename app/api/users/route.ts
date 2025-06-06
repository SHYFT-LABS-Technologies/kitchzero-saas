import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as userApiService from "@/lib/api_services/userApiService";
import { createUserSchema } from "@/lib/validation";
import {
  handleApiError,
  validateAndParseBody,
  createSecureSuccessResponse,
  createSecureErrorResponse,
  checkRateLimitEnhanced
} from "@/lib/api-utils";
import { verifyCsrfToken } from "@/lib/security";
import type { UserCreationData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    // Service layer will enforce SUPER_ADMIN, but an initial check is good practice
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await checkRateLimitEnhanced(request, authUser, 'api_read');

    const users = await userApiService.fetchAllUsers(authUser);
    // users from service are already without password
    return createSecureSuccessResponse({ users });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
     // Service layer will enforce SUPER_ADMIN for user creation
    if (!authUser || authUser.role !== "SUPER_ADMIN") {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }
    await checkRateLimitEnhanced(request, authUser, 'api_write');

    const validatedData = await validateAndParseBody(request, createUserSchema);

    // Ensure password is provided, as createUserSchema makes it required
    // but UserCreationData in lib/types might have it optional.
    // The service layer addNewUser also checks this.
    if (!validatedData.password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const newUser = await userApiService.addNewUser(validatedData as UserCreationData, authUser);
    // newUser from service is already without password

    return createSecureSuccessResponse({ user: newUser, message: "User created successfully" }, 201);

  } catch (error) {
    return handleApiError(error)
  }
}