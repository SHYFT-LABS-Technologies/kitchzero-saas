import { create } from 'zustand';
import type { Branch, PaginatedApiResponse } from '@/lib/types'; // Branch type
import * as branchService from '@/lib/services/branchService'; // Client-side service

interface BranchStoreState {
  branches: Branch[];
  loading: boolean;
  error: string | null;
  hasFetched: boolean; // To prevent re-fetching if data is already loaded
  fetchAllBranches: (forceRefresh?: boolean) => Promise<void>;
  clearBranches: () => void; // Action to clear branches, e.g., on logout
}

export const useBranchStore = create<BranchStoreState>()((set, get) => ({
  branches: [],
  loading: false,
  error: null,
  hasFetched: false,
  fetchAllBranches: async (forceRefresh = false) => {
    if (get().hasFetched && !forceRefresh && get().branches.length > 0) {
      // Data already loaded and no force refresh, no need to fetch again
      // Or if hasFetched is true, but branches array is empty (e.g. non-superadmin tried)
      // we might want to allow re-fetch if user role could change.
      // For now, simple check: if hasFetched and branches exist, skip.
      return;
    }

    set({ loading: true, error: null });
    try {
      // branchService.fetchBranches() makes a GET request to /api/branches
      // This API endpoint is protected and only returns data for SUPER_ADMINs.
      // If a non-SUPER_ADMIN calls this, the API will return 403,
      // and fetchFromApi used by branchService.fetchBranches should throw an error.
      const response: PaginatedApiResponse<Branch[]> = await branchService.fetchBranches();

      if (response.data) {
        set({ branches: response.data, loading: false, hasFetched: true, error: null });
      } else {
        // This case might occur if API returns a 2xx status but no data field,
        // or if PaginatedApiResponse allows data to be undefined.
        // Based on current ApiResponse, data is optional.
        set({ branches: [], loading: false, hasFetched: true, error: response.error || 'Failed to fetch branches: No data returned.' });
      }
    } catch (err) {
      // This will catch errors from fetchFromApi (e.g., network errors, 4xx/5xx responses)
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error: errorMessage, loading: false, branches: [], hasFetched: true }); // Set hasFetched true even on error to prevent re-fetch loops if not desired
      console.error("Error fetching branches for store:", err);
    }
  },
  clearBranches: () => set({ branches: [], loading: false, error: null, hasFetched: false }),
}));
