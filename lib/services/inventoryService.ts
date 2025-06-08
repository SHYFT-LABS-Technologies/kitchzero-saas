import { api, fetchWithCsrf } from '@/lib/api-client'; // Changed import
import type { InventoryItem, InventoryData, ApiResponse, PaginatedApiResponse } from '@/lib/types';

const INVENTORY_API_BASE_URL = '/api/inventory';

/**
 * Fetches all inventory items.
 * @returns A promise that resolves to a paginated API response with inventory items.
 */
export async function fetchInventory(): Promise<PaginatedApiResponse<InventoryItem[]>> {
  // Assuming the API endpoint /api/inventory returns data that matches PaginatedApiResponse<InventoryItem[]>
  // If it returns { inventory: InventoryItem[] }, then the hook or this service needs to adapt it.
  // For now, we keep the return type and assume api.get can fetch this structure.
  return api.get<PaginatedApiResponse<InventoryItem[]>>(`${INVENTORY_API_BASE_URL}`);
}

/**
 * Creates a new inventory item.
 * @param data - The data for the new inventory item.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the created inventory item.
 */
export async function createInventoryItem(
  data: InventoryData,
  csrfToken: string
): Promise<ApiResponse<InventoryItem>> {
  return fetchWithCsrf<ApiResponse<InventoryItem>>(`${INVENTORY_API_BASE_URL}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, csrfToken);
}

/**
 * Updates an existing inventory item.
 * @param id - The ID of the inventory item to update.
 * @param data - The updated data for the inventory item.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the updated inventory item.
 */
export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryData>,
  csrfToken: string
): Promise<ApiResponse<InventoryItem>> {
  return fetchWithCsrf<ApiResponse<InventoryItem>>(`${INVENTORY_API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, csrfToken);
}

/**
 * Deletes an inventory item.
 * @param id - The ID of the inventory item to delete.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response indicating success or failure.
 */
export async function deleteInventoryItem(
  id: string,
  csrfToken: string
): Promise<ApiResponse<null>> {
  return fetchWithCsrf<ApiResponse<null>>(`${INVENTORY_API_BASE_URL}/${id}`, {
    method: 'DELETE',
  }, csrfToken);
}
