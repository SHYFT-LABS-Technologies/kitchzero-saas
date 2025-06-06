import { type NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import * as inventoryApiService from "@/lib/api_services/inventoryApiService";
import { updateInventorySchema } from "@/lib/validation"; // For updates
import {
  handleApiError,
  validateAndParseBody,
  createSecureSuccessResponse,
  createSecureErrorResponse,
  checkRateLimitEnhanced,
  validateRouteParams // For validating route param like ID
} from "@/lib/api-utils";
import { verifyCsrfToken } from "@/lib/security";
import type { InventoryData } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser(request);
     if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await checkRateLimitEnhanced(request, authUser, 'api_read');

    const { id: inventoryId } = validateRouteParams(params, { id: 'uuid' }); // Basic UUID validation

    const inventoryItem = await inventoryApiService.findInventoryItemById(inventoryId, authUser);

    return createSecureSuccessResponse({ inventoryItem }, 200);

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

    const { id: inventoryId } = validateRouteParams(params, { id: 'uuid' });

    // Use updateInventorySchema which allows partial updates
    const validatedData = await validateAndParseBody(request, updateInventorySchema);

    // The service layer (modifyInventoryItem) will handle date conversion for expiryDate if present.
    const itemData: Partial<InventoryData> = {
        ...validatedData,
    };

    const updatedItem = await inventoryApiService.modifyInventoryItem(inventoryId, itemData, authUser);
    
    return createSecureSuccessResponse({ inventoryItem: updatedItem, message: "Inventory item updated successfully" }, 200);

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

    const { id: inventoryId } = validateRouteParams(params, { id: 'uuid' });

    await inventoryApiService.removeInventoryItem(inventoryId, authUser);

    return createSecureSuccessResponse({ message: "Inventory item deleted successfully" }, 200); // 200 or 204 for DELETE

  } catch (error) {
    return handleApiError(error)
  }
}