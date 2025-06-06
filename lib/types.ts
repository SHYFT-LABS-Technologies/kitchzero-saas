export interface User {
  id: string
  username: string
  role: "SUPER_ADMIN" | "BRANCH_ADMIN"
  branchId?: string
  branch?: Branch
  createdAt: Date
  updatedAt: Date
}

export interface Branch {
  id: string
  name: string
  location: string
  createdAt: Date
  updatedAt: Date
}

export interface InventoryItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  expiryDate: Date
  purchaseCost: number
  branchId: string
  branch?: Branch
}

export interface WasteLog {
  id: string
  itemName: string
  quantity: number
  unit: string
  value: number
  reason: "OVERPRODUCTION" | "SPOILAGE" | "PLATE_WASTE" | "BUFFET_LEFTOVER"
  photo?: string
  branchId: string
  branch?: Branch
  createdAt: Date
  updatedAt: Date
}

export interface WasteLogReview {
  id: string
  wasteLogId?: string
  wasteLog?: WasteLog
  action: "CREATE" | "UPDATE" | "DELETE"
  status: "PENDING" | "APPROVED" | "REJECTED"
  originalData?: any
  newData?: any
  reason?: string
  createdBy: string
  creator: User
  approvedBy?: string
  approver?: User
  reviewNotes?: string
  createdAt: Date
  updatedAt: Date
  reviewedAt?: Date
}

export interface Analytics {
  totalWasteKg: number
  totalWasteLKR: number
  topWastedItems: Array<{
    itemName: string
    totalQuantity: number
    totalValue: number
  }>
  wasteOverTime: Array<{
    date: string
    quantity: number
    value: number
  }>
}

// --- API Response Wrappers ---

/**
 * Standard API response structure.
 */
export interface ApiResponse<T> {
  success?: boolean; // Optional as not all current API responses include it, but good for standardization
  data?: T;
  message?: string;
  error?: string;
  details?: Array<{ field?: string; message: string }>; // For validation errors
  // For responses that directly return the data or a specific structure
  // we might not always have all these fields.
  // Example: login returns { user, message }, user creation returns { user, message }
  // GET /api/users returns { users: User[] } which doesn't fit ApiResponse<User[]> directly
  // This might need to be flexible or services adapt the response.
}

/**
 * Standard structure for paginated API responses.
 * Assumes data is in a 'data' property.
 */
export interface PaginatedApiResponse<T extends Array<any>> extends ApiResponse<T> {
  total: number;
  page: number;
  limit: number;
  // Some APIs might return data directly or in a named array e.g. { users: [], total... }
  // The services currently assume the main data array is directly in `data` field of ApiResponse.
}


// --- Data Transfer Objects (DTOs) / Service Layer Types ---

// Inventory
export type InventoryData = Omit<InventoryItem, 'id' | 'branch' | 'createdAt' | 'updatedAt' | 'branchId'> & {
  branchId?: string; // branchId is needed for creation, but might be optional if superadmin creates for their branch implicitly
};

// WasteLog
export type WasteLogData = Omit<WasteLog, 'id' | 'branch' | 'createdAt' | 'updatedAt' | 'branchId'> & {
  branchId?: string; // Similar to InventoryData
};

export interface DeletionReason {
  reason: string;
}

// Branch
export type BranchData = Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>;

// User
export interface UserCreationData {
  username: string;
  password?: string; // Password is not returned, but required for creation
  role: "SUPER_ADMIN" | "BRANCH_ADMIN";
  branchId?: string | null;
}

export type UserUpdateData = Partial<Omit<UserCreationData, 'password'> & { password?: string }>;


// Review (assuming WasteLogReview is the primary review type for now)
export type Review = WasteLogReview; // Alias for clarity in services

export interface ReviewActionData {
  action: 'approve' | 'reject';
  reviewNotes: string;
}

// Analytics (Analytics type already exists and seems suitable for AnalyticsData)
export type AnalyticsData = Analytics;
