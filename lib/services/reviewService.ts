import { fetchFromApi, fetchWithCsrf } from '@/lib/api-client';
import type { Review, ReviewActionData, ApiResponse, PaginatedApiResponse } from '@/lib/types';

const REVIEW_API_BASE_URL = '/api/reviews';

/**
 * Fetches all pending reviews.
 * The actual API might support filtering for "pending" status.
 * For now, we fetch all and expect the API to provide a way to identify pending ones,
 * or this could be filtered client-side if necessary.
 * @returns A promise that resolves to a paginated API response with reviews.
 */
export async function fetchPendingReviews(): Promise<PaginatedApiResponse<Review[]>> {
  // Assuming the API returns reviews that can be identified as pending.
  // If the API supports a query parameter like /api/reviews?status=pending, that would be better.
  return fetchFromApi<PaginatedApiResponse<Review[]>>(`${REVIEW_API_BASE_URL}?status=PENDING`); // Added status filter
}

/**
 * Updates an existing review (e.g., approve or reject).
 * @param reviewId - The ID of the review to update.
 * @param action - The action to perform (e.g., 'approve', 'reject').
 * @param reviewNotes - Optional notes for the review action.
 * @param csrfToken - The CSRF token for the request.
 * @returns A promise that resolves to an API response with the updated review.
 */
export async function updateReview(
  reviewId: string,
  action: 'approve' | 'reject',
  reviewNotes: string, // reviewNotes is required by the API schema for this action
  csrfToken: string
): Promise<ApiResponse<Review>> {
  const data: ReviewActionData = { action, reviewNotes };
  return fetchWithCsrf<ApiResponse<Review>>(`${REVIEW_API_BASE_URL}/${reviewId}/action`, {
    method: 'PUT', // Or POST, depending on API design for actions
    body: JSON.stringify(data),
  }, csrfToken);
}
