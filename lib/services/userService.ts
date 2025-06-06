import { fetchFromApi, fetchWithCsrf } from '@/lib/api-client';
import type { User, UserCreationData, UserUpdateData, ApiResponse, PaginatedApiResponse } from '@/lib/types';

const USER_API_BASE_URL = '/api/users';

/**
 * Fetches all users.
 * @returns A promise that resolves to a paginated API response with users.
 */
export async function fetchUsers(): Promise<PaginatedApiResponse<User[]>> {
  // Assuming the API returns users in a structure like { users: User[] }
  // Adjust if the actual API response structure is different
  const response = await fetchFromApi<{ users: User[] }>(`${USER_API_BASE_URL}`);
  return { data: response.users, total: response.users.length, page: 1, limit: response.users.length }; // Mocking pagination
}

/**
 * Creates a new user.
 * @param data - The data for the new user.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the created user.
 */
export async function createUser(
  data: UserCreationData,
  csrfToken: string
): Promise<ApiResponse<User>> {
  return fetchWithCsrf<ApiResponse<User>>(`${USER_API_BASE_URL}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, csrfToken);
}

/**
 * Updates an existing user.
 * @param id - The ID of the user to update.
 * @param data - The updated data for the user.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the updated user.
 */
export async function updateUser(
  id: string,
  data: Partial<UserUpdateData>,
  csrfToken: string
): Promise<ApiResponse<User>> {
  return fetchWithCsrf<ApiResponse<User>>(`${USER_API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }, csrfToken);
}

/**
 * Deletes a user.
 * @param id - The ID of the user to delete.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response indicating success or failure.
 */
export async function deleteUser(
  id: string,
  csrfToken: string
): Promise<ApiResponse<null>> {
  return fetchWithCsrf<ApiResponse<null>>(`${USER_API_BASE_URL}/${id}`, {
    method: 'DELETE',
  }, csrfToken);
}
