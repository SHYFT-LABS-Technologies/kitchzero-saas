import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ValidationError } from './validation'
import { ValidationErrorDetail } from "@/components/ui/toast-notification"

export function handleApiError(error: unknown) {
  console.error('API Error:', error)

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      },
      { status: 400 }
    )
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      },
      { status: 400 }
    )
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        { error: 'A record with this information already exists' },
        { status: 409 }
      )
    }
    
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      )
    }
    
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        { error: 'Foreign key constraint failed' },
        { status: 400 }
      )
    }
    
    if (prismaError.code === 'P2014') {
      return NextResponse.json(
        { error: 'Invalid relation' },
        { status: 400 }
      )
    }
  }

  // Handle specific error types
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    } else {
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: error.message 
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
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

export async function validateAndParseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Request body validation failed', error.errors)
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON in request body', [
        {
          code: 'invalid_type',
          expected: 'object',
          received: 'string',
          path: [],
          message: 'Request body must be valid JSON'
        }
      ])
    }
    throw error
  }
}

// Helper to validate URL parameters (like [id])
export function validateUrlParam(paramName: string, paramValue: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  if (!paramValue) {
    throw new ValidationError(`${paramName} is required`, [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: [paramName],
        message: `${paramName} is required`
      }
    ])
  }
  
  if (!uuidRegex.test(paramValue)) {
    throw new ValidationError(`Invalid ${paramName} format`, [
      {
        code: 'invalid_string',
        validation: 'uuid',
        path: [paramName],
        message: `${paramName} must be a valid UUID`
      }
    ])
  }
  
  return paramValue
}

// Helper to safely parse numbers from strings
export function parseNumber(value: string | null, fieldName: string): number {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`, [
      {
        code: 'invalid_type',
        expected: 'number',
        received: 'null',
        path: [fieldName],
        message: `${fieldName} is required`
      }
    ])
  }
  
  const parsed = Number(value)
  if (isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid number`, [
      {
        code: 'invalid_type',
        expected: 'number',
        received: 'nan',
        path: [fieldName],
        message: `${fieldName} must be a valid number`
      }
    ])
  }
  
  return parsed
}

// Helper to validate and sanitize strings
export function sanitizeString(value: string, maxLength: number = 255): string {
  if (typeof value !== 'string') {
    throw new ValidationError('Value must be a string', [
      {
        code: 'invalid_type',
        expected: 'string',
        received: typeof value,
        path: [],
        message: 'Value must be a string'
      }
    ])
  }
  
  // Trim whitespace
  const trimmed = value.trim()
  
  // Check length
  if (trimmed.length > maxLength) {
    throw new ValidationError(`Value too long (max ${maxLength} characters)`, [
      {
        code: 'too_big',
        maximum: maxLength,
        type: 'string',
        inclusive: true,
        path: [],
        message: `Value must be ${maxLength} or fewer characters long`
      }
    ])
  }
  
  return trimmed
}

// Helper for role-based access control
export function checkPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    'SUPER_ADMIN': 2,
    'BRANCH_ADMIN': 1
  }
  
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0
  
  return userLevel >= requiredLevel
}

// Helper to create standardized success responses
export function createSuccessResponse(data: any, message?: string) {
  return NextResponse.json({
    success: true,
    ...(message && { message }),
    ...data
  })
}

// Helper to create standardized error responses
export function createErrorResponse(message: string, status: number = 400, details?: any) {
  return NextResponse.json({
    success: false,
    error: message,
    ...(details && { details })
  }, { status })
}

// Rate limiting helper (simple in-memory implementation for MVP)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const requestData = requestCounts.get(identifier)
  
  if (!requestData || now > requestData.resetTime) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (requestData.count >= limit) {
    return false
  }
  
  requestData.count++
  return true
}
