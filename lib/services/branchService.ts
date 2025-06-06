import { fetchFromApi, fetchWithCsrf } from '@/lib/api-client';
import type { Branch, BranchData, ApiResponse, PaginatedApiResponse } from '@/lib/types';

const BRANCH_API_BASE_URL = '/api/branches';

/**
 * Fetches all branches.
 * @returns A promise that resolves to a paginated API response with branches.
 */
export async function fetchBranches(): Promise<PaginatedApiResponse<Branch[]>> {
  return fetchFromApi<PaginatedApiResponse<Branch[]>>(`${BRANCH_API_BASE_URL}`);
}

/**
 * Creates a new branch.
 * @param data - The data for the new branch.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the created branch.
 */
export async function createBranch(
  data: BranchData,
  csrfToken: string
): Promise<ApiResponse<Branch>> {
  return fetchWithCsrf<ApiResponse<Branch>>(`${BRANCH_API_BASE_URL}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, csrfToken);
}

/**
 * Updates an existing branch.
 * @param id - The ID of the branch to update.
 * @param data - The updated data for the branch.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the updated branch.
 */
export async function updateBranch(
  id: string,
  data: Partial<BranchData>,
  csrfToken: string
): Promise<ApiResponse<Branch>> {
  return fetchWithCsrf<ApiResponse<Branch>>(`${BRANCH_API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, csrfToken);
}

/**
 * Deletes a branch.
 * @param id - The ID of the branch to delete.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response indicating success or failure.
 */
export async function deleteBranch(
  id: string,
  csrfToken: string
): Promise<ApiResponse<null>> {
  return fetchWithCsrf<ApiResponse<null>>(`${BRANCH_API_BASE_URL}/${id}`, {
    method: 'DELETE',
  }, csrfToken);
}
