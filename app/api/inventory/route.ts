import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as inventoryApiService from "@/lib/api_services/inventoryApiService";
import { inventorySchema } from "@/lib/validation"; // For creation
import {
  handleApiError,
  validateAndParseBody,
  createSecureSuccessResponse,
  createSecureErrorResponse, // Keep for CSRF error
  checkRateLimitEnhanced
} from "@/lib/api-utils";
import { verifyCsrfToken } from "@/lib/security";
import type { InventoryData } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      // getAuthUser should throw if no session, but as a safeguard:
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await checkRateLimitEnhanced(request, authUser, 'api_read');

    const inventoryItems = await inventoryApiService.fetchAllInventory(authUser);

    // The service layer now returns items with branch info included as per repository
    return createSecureSuccessResponse({ inventory: inventoryItems }, 200);

  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
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

    const validatedData = await validateAndParseBody(request, inventorySchema);

    // Convert expiryDate to Date object if it's a string
    // inventorySchema already ensures expiryDate is a string in YYYY-MM-DD format
    // The service layer (addNewInventoryItem) will convert it to a Date object.
    const itemData: InventoryData = {
        ...validatedData,
        // expiryDate is already a string from validatedData, service will handle new Date()
    };

    const newItem = await inventoryApiService.addNewInventoryItem(itemData, authUser);

    return createSecureSuccessResponse({ item: newItem, message: "Inventory item created successfully" }, 201);

  } catch (error) {
    return handleApiError(error)
  }
}