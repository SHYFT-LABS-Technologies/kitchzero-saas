import { fetchFromApi, fetchWithCsrf } from '@/lib/api-client';
import type { WasteLog, WasteLogData, DeletionReason, ApiResponse, PaginatedApiResponse } from '@/lib/types';

const WASTE_LOG_API_BASE_URL = '/api/waste-logs';

/**
 * Fetches all waste logs.
 * @returns A promise that resolves to a paginated API response with waste logs.
 */
export async function fetchWasteLogs(): Promise<PaginatedApiResponse<WasteLog[]>> {
  return fetchFromApi<PaginatedApiResponse<WasteLog[]>>(`${WASTE_LOG_API_BASE_URL}`);
}

/**
 * Creates a new waste log.
 * @param data - The data for the new waste log.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the created waste log.
 */
export async function createWasteLog(
  data: WasteLogData,
  csrfToken: string
): Promise<ApiResponse<WasteLog>> {
  return fetchWithCsrf<ApiResponse<WasteLog>>(`${WASTE_LOG_API_BASE_URL}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, csrfToken);
}

/**
 * Updates an existing waste log.
 * @param id - The ID of the waste log to update.
 * @param data - The updated data for the waste log.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the updated waste log.
 */
export async function updateWasteLog(
  id: string,
  data: Partial<WasteLogData>,
  csrfToken: string
): Promise<ApiResponse<WasteLog>> {
  return fetchWithCsrf<ApiResponse<WasteLog>>(`${WASTE_LOG_API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, csrfToken);
}

/**
 * Deletes a waste log.
 * @param id - The ID of the waste log to delete.
 * @param reason - The reason for deleting the waste log.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response indicating success or failure.
 */
export async function deleteWasteLog(
  id: string,
  reason: DeletionReason,
  csrfToken: string
): Promise<ApiResponse<null>> {
  // The API expects the reason in the body for DELETE requests with reason
  return fetchWithCsrf<ApiResponse<null>>(`${WASTE_LOG_API_BASE_URL}/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  }, csrfToken);
}
