import { z } from 'zod'
import {
  sanitizedStringSchema,
  sanitizedUrlSchema,
  itemNameSchema,
  usernameSchema,
  locationSchema,
  financialValueSchema,
  quantitySchema
} from './sanitization'

// Enhanced enum schemas
const unitSchema = z.enum(['kg', 'g', 'pieces', 'liters', 'portions'], {
  errorMap: () => ({ message: "Unit must be one of: kg, g, pieces, liters, portions" })
})

const wasteReasonSchema = z.enum(['SPOILAGE', 'OVERPRODUCTION', 'PLATE_WASTE', 'BUFFET_LEFTOVER'], {
  errorMap: () => ({ message: "Invalid waste reason" })
})

const userRoleSchema = z.enum(['SUPER_ADMIN', 'BRANCH_ADMIN'], {
  errorMap: () => ({ message: "Role must be SUPER_ADMIN or BRANCH_ADMIN" })
})

// Enhanced date validation
const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => {
    const parsed = new Date(date + 'T00:00:00.000Z')
    return !isNaN(parsed.getTime())
  }, "Invalid date")
  .refine((date) => {
    const parsed = new Date(date + 'T00:00:00.000Z')
    const now = new Date()
    const maxPastDate = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())
    const maxFutureDate = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate())
    return parsed >= maxPastDate && parsed <= maxFutureDate
  }, "Date must be within reasonable range")

// UUID validation
const uuidSchema = z.string()
  .transform((val) => val.trim())
  .refine((val) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(val)
  }, "Invalid UUID format")

// Analytics validation
export const analyticsQuerySchema = z.object({
  timeRange: z.enum(['today', '7d', '30d', '90d'], {
    errorMap: () => ({ message: "Time range must be one of: today, 7d, 30d, 90d" })
  }).optional().default('today')
})

// Enhanced auth validation
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long")
    .refine((val) => {
      const hasLetter = /[a-zA-Z]/.test(val)
      const hasNumber = /[0-9]/.test(val)
      return hasLetter && hasNumber
    }, "Password must contain at least one letter and one number")
}).refine((data) => {
  return data.password.toLowerCase() !== data.username.toLowerCase()
}, {
  message: "Password cannot be the same as username",
  path: ["password"]
})

// Enhanced user validation
export const createUserSchema = z.object({
  username: usernameSchema,
  password: z.string()
    .min(10, "Password must be at least 10 characters long.")
    .max(100, "Password is too long")
    .refine((val) => /[A-Z]/.test(val), {
      message: "Password must contain at least one uppercase letter.",
    })
    .refine((val) => /[a-z]/.test(val), {
      message: "Password must contain at least one lowercase letter.",
    })
    .refine((val) => /[0-9]/.test(val), {
      message: "Password must contain at least one number.",
    })
    .refine((val) => /[!@#$%^&*]/.test(val), {
      message: "Password must contain at least one special character (e.g., !@#$%^&*).",
    }),
  role: userRoleSchema,
  branchId: uuidSchema.optional().nullable()
}).refine((data) => {
  if (data.role === 'BRANCH_ADMIN' && (!data.branchId || data.branchId.trim() === '')) {
    return false
  }
  if (data.role === 'SUPER_ADMIN' && data.branchId) {
    return false
  }
  return true
}, {
  message: "Branch selection is required for Branch Admin role and should be empty for Super Admin",
  path: ["branchId"]
})

export const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  password: z.string()
    .min(10, "Password must be at least 10 characters long.")
    .max(100, "Password is too long")
    .refine((val) => /[A-Z]/.test(val), {
      message: "Password must contain at least one uppercase letter.",
    })
    .refine((val) => /[a-z]/.test(val), {
      message: "Password must contain at least one lowercase letter.",
    })
    .refine((val) => /[0-9]/.test(val), {
      message: "Password must contain at least one number.",
    })
    .refine((val) => /[!@#$%^&*]/.test(val), {
      message: "Password must contain at least one special character (e.g., !@#$%^&*).",
    })
    .optional()
    .or(z.literal("")),
  role: userRoleSchema.optional(),
  branchId: uuidSchema.optional().nullable()
}).refine((data) => {
  return data.username || data.password || data.role || data.branchId !== undefined
}, {
  message: "At least one field must be provided for update",
  path: ["root"]
})

// Enhanced branch validation
export const branchSchema = z.object({
  name: sanitizedStringSchema({
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.,()&]+$/,
    errorMessage: 'Branch name contains invalid characters'
  }),
  location: locationSchema
}).refine((data) => {
  return data.name.toLowerCase() !== data.location.toLowerCase()
}, {
  message: "Branch name and location cannot be identical",
  path: ["name"]
})

// Enhanced inventory validation
export const inventorySchema = z.object({
  itemName: itemNameSchema,
  quantity: quantitySchema,
  unit: unitSchema,
  expiryDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format")
    .refine((date) => {
      const parsed = new Date(date + 'T00:00:00.000Z')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return parsed >= today
    }, "Expiry date cannot be in the past")
    .refine((date) => {
      const parsed = new Date(date + 'T00:00:00.000Z')
      const maxFutureDate = new Date()
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 10)
      return parsed <= maxFutureDate
    }, "Expiry date is too far in the future"),
  purchaseCost: financialValueSchema,
  branchId: uuidSchema.optional()
}).refine((data) => {
  const costPerUnit = data.purchaseCost / data.quantity
  return costPerUnit <= 100000
}, {
  message: "Cost per unit is unreasonably high",
  path: ["purchaseCost"]
})

// Fix the partial schema issue
export const updateInventorySchema = z.object({
  itemName: itemNameSchema.optional(),
  quantity: quantitySchema.optional(),
  unit: unitSchema.optional(),
  expiryDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format")
    .refine((date) => {
      const parsed = new Date(date + 'T00:00:00.000Z')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return parsed >= today
    }, "Expiry date cannot be in the past")
    .optional(),
  purchaseCost: financialValueSchema.optional(),
  branchId: uuidSchema.optional()
}).refine((data) => {
  return Object.keys(data).some(key => data[key as keyof typeof data] !== undefined)
}, "At least one field must be provided for update")

// Enhanced waste log validation
export const wasteLogSchema = z.object({
  itemName: itemNameSchema,
  quantity: quantitySchema,
  unit: unitSchema,
  value: financialValueSchema,
  reason: wasteReasonSchema,
  photo: sanitizedUrlSchema.optional().or(z.literal("")),
  branchId: uuidSchema.optional(),
  wasteDate: dateStringSchema.optional()
}).refine((data) => {
  const valuePerUnit = data.value / data.quantity
  return valuePerUnit <= 50000
}, {
  message: "Value per unit is unreasonably high for waste",
  path: ["value"]
}).refine((data) => {
  if (data.reason === 'PLATE_WASTE' && data.quantity > 100) {
    return false
  }
  if (data.reason === 'SPOILAGE' && data.quantity > 1000) {
    return false
  }
  return true
}, {
  message: "Quantity is too high for the selected waste reason",
  path: ["quantity"]
})

// Fix the partial schema issue
export const updateWasteLogSchema = z.object({
  itemName: itemNameSchema.optional(),
  quantity: quantitySchema.optional(),
  unit: unitSchema.optional(),
  value: financialValueSchema.optional(),
  reason: wasteReasonSchema.optional(),
  photo: sanitizedUrlSchema.optional().or(z.literal("")),
  branchId: uuidSchema.optional(),
  wasteDate: dateStringSchema.optional()
}).refine((data) => {
  return Object.keys(data).some(key => data[key as keyof typeof data] !== undefined)
}, "At least one field must be provided for update")

// Review validation
export const reviewActionSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: "Action must be 'approve' or 'reject'" })
  }),
  reviewNotes: sanitizedStringSchema({
    minLength: 10,
    maxLength: 1000,
    errorMessage: "Review notes must be between 10 and 1000 characters"
  })
})

// Delete validation
export const deleteWithReasonSchema = z.object({
  reason: sanitizedStringSchema({
    minLength: 10,
    maxLength: 500,
    errorMessage: "Deletion reason must be between 10 and 500 characters"
  })
}).refine((data) => {
  const genericReasons = ['delete', 'remove', 'mistake', 'error', 'wrong']
  const reasonLower = data.reason.toLowerCase()
  return !genericReasons.some(generic => reasonLower === generic)
}, {
  message: "Please provide a specific reason for deletion",
  path: ["reason"]
})

// Custom error class
export class ValidationError extends Error {
  constructor(message: string, public errors: z.ZodIssue[]) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Helper functions
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