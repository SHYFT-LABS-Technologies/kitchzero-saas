import { z } from 'zod'

// Common validation patterns
const uuidSchema = z.string().uuid("Invalid ID format")
const positiveNumberSchema = z.number().positive("Must be a positive number")
const nonEmptyStringSchema = z.string().min(1, "This field is required")

// Date validation (YYYY-MM-DD format)
const dateStringSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Date must be in YYYY-MM-DD format"
).refine((date) => {
  const parsed = new Date(date)
  const now = new Date()
  return parsed <= now
}, "Date cannot be in the future")

// Enum schemas
const unitSchema = z.enum(['kg', 'g', 'pieces', 'liters', 'portions'], {
  errorMap: () => ({ message: "Unit must be one of: kg, g, pieces, liters, portions" })
})

const wasteReasonSchema = z.enum(['SPOILAGE', 'OVERPRODUCTION', 'PLATE_WASTE', 'BUFFET_LEFTOVER'], {
  errorMap: () => ({ message: "Invalid waste reason" })
})

const userRoleSchema = z.enum(['SUPER_ADMIN', 'BRANCH_ADMIN'], {
  errorMap: () => ({ message: "Role must be SUPER_ADMIN or BRANCH_ADMIN" })
})

// Analytics validation schemas
export const analyticsQuerySchema = z.object({
  timeRange: z.enum(['today', '7d', '30d', '90d'], {
    errorMap: () => ({ message: "Time range must be one of: today, 7d, 30d, 90d" })
  }).optional().default('today')
})

// Auth validation schemas
export const loginSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long")
})

// User validation schemas
export const createUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
  role: userRoleSchema,
  branchId: uuidSchema.optional()
}).refine((data) => {
  if (data.role === 'BRANCH_ADMIN' && !data.branchId) {
    return false
  }
  return true
}, {
  message: "Branch ID is required for Branch Admin role",
  path: ["branchId"]
})

export const updateUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must be less than 50 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long")
    .optional()
    .or(z.literal("")), // Allow empty string for "no password change"
  role: userRoleSchema,
  branchId: uuidSchema.optional().nullable()
}).refine((data) => {
  // Only require branchId if role is BRANCH_ADMIN
  if (data.role === 'BRANCH_ADMIN' && !data.branchId) {
    return false
  }
  return true
}, {
  message: "Branch ID is required for Branch Admin role",
  path: ["branchId"]
})

// Branch validation schemas
export const branchSchema = z.object({
  name: z.string()
    .min(1, "Branch name is required")
    .max(100, "Branch name must be less than 100 characters")
    .trim(),
  location: z.string()
    .min(1, "Location is required")
    .max(200, "Location must be less than 200 characters")
    .trim()
})


// Add a new schema specifically for UPDATE operations
export const updateBranchSchema = z.object({
  name: z.string()
    .min(1, "Branch name is required")
    .max(100, "Branch name must be less than 100 characters")
    .trim()
    .optional(),
  location: z.string()
    .min(1, "Location is required")
    .max(200, "Location must be less than 200 characters")
    .trim()
    .optional()
}).refine((data) => {
  // Ensure at least one field is provided for update
  return data.name !== undefined || data.location !== undefined
}, {
  message: "At least one field (name or location) must be provided for update",
  path: ["root"]
})

// Inventory validation schemas
export const inventorySchema = z.object({
  itemName: z.string()
    .min(1, "Item name is required")
    .max(100, "Item name must be less than 100 characters")
    .trim(),
  quantity: positiveNumberSchema.refine(val => val <= 999999, "Quantity is too large"),
  unit: unitSchema,
  expiryDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Expiry date must be in YYYY-MM-DD format"
  ).refine((date) => {
    const parsed = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return parsed >= today
  }, "Expiry date cannot be in the past"),
  purchaseCost: positiveNumberSchema.refine(val => val <= 9999999, "Purchase cost is too large"),
  branchId: uuidSchema.optional()
})

export const updateInventorySchema = inventorySchema.partial().extend({
  itemName: z.string()
    .min(1, "Item name is required")
    .max(100, "Item name must be less than 100 characters")
    .trim()
    .optional(),
}).refine((data) => {
  return Object.keys(data).length > 0
}, "At least one field must be provided for update")

// Waste log validation schemas
export const wasteLogSchema = z.object({
  itemName: z.string()
    .min(1, "Item name is required")
    .max(100, "Item name must be less than 100 characters")
    .trim(),
  quantity: positiveNumberSchema.refine(val => val <= 999999, "Quantity is too large"),
  unit: unitSchema,
  value: positiveNumberSchema.refine(val => val <= 9999999, "Value is too large"),
  reason: wasteReasonSchema,
  photo: z.string()
    .url("Photo must be a valid URL")
    .optional()
    .or(z.literal("")),
  branchId: uuidSchema.optional(),
  wasteDate: dateStringSchema.optional()
})

export const updateWasteLogSchema = wasteLogSchema.partial().refine((data) => {
  return Object.keys(data).length > 0
}, "At least one field must be provided for update")

// Review validation schemas
export const reviewActionSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: "Action must be 'approve' or 'reject'" })
  }),
  reviewNotes: z.string()
    .min(1, "Review notes are required")
    .max(500, "Review notes must be less than 500 characters")
    .trim()
})

// Delete validation (for requests that require a reason)
export const deleteWithReasonSchema = z.object({
  reason: z.string()
    .min(1, "Reason is required for deletion")
    .max(500, "Reason must be less than 500 characters")
    .trim()
})

// Query parameter validation
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, "Page must be a number").transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/, "Limit must be a number").transform(Number).optional().default(20)
}).refine((data) => {
  return data.page >= 1 && data.limit >= 1 && data.limit <= 100
}, "Invalid pagination parameters")

export const searchSchema = z.object({
  q: z.string().max(100, "Search query too long").optional(),
  sortBy: z.string().max(50, "Sort field too long").optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

// Custom error class for validation errors
export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodIssue[]) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Helper function to validate request body
export function validateRequestBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Validation failed", error.errors)
    }
    throw error
  }
}

// Helper function to validate query parameters
export function validateQueryParams<T>(schema: z.ZodSchema<T>, params: URLSearchParams): T {
  const data = Object.fromEntries(params.entries())
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Invalid query parameters", error.errors)
    }
    throw error
  }
}