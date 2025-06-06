import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ValidationError } from './validation'
import { ValidationErrorDetail } from "@/components/ui/toast-notification"
import { checkPostgreSQLRateLimit } from './rate-limit-postgres'
import { canAccessResource, RESOURCES, ACTIONS } from './permissions'
import { prisma } from './prisma'

export function handleApiError(error: unknown) {
  console.error('API Error:', error)

  // Handle rate limit errors specially
  if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
    const rateLimitInfo = (error as any).rateLimitInfo
    return createRateLimitErrorResponse(error.message, rateLimitInfo)
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.') || 'root',
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
          field: err.path.join('.') || 'root',
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
  }

  if (error instanceof Error) {
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

// Add missing validation functions
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  // Simple in-memory rate limiting for development
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map()
  }
  
  const currentCount = global.rateLimitStore.get(`${key}:${windowStart}`) || 0
  
  if (currentCount >= limit) {
    return false
  }
  
  global.rateLimitStore.set(`${key}:${windowStart}`, currentCount + 1)
  
  // Clean up old entries
  setTimeout(() => {
    global.rateLimitStore.delete(`${key}:${windowStart}`)
  }, windowMs)
  
  return true
}

export function checkPermission(userRole: string, requiredRole: string): boolean {
  if (requiredRole === "SUPER_ADMIN") {
    return userRole === "SUPER_ADMIN"
  }
  return userRole === "SUPER_ADMIN" || userRole === requiredRole
}

export function validateSimpleParam(paramName: string, paramValue: string): string {
  if (!paramValue || typeof paramValue !== 'string' || paramValue.trim() === '') {
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
  
  return paramValue.trim()
}

// Enhanced rate limiting
export async function checkRateLimitEnhanced(
  request: Request,
  user: any,
  endpoint: string,
  customConfig?: { requests: number; window: number }
): Promise<void> {
  try {
    const result = await checkPostgreSQLRateLimit(
      request,
      endpoint,
      user?.id,
      user?.role
    )
    
    if (!result.allowed) {
      const resetTime = Math.ceil((result.resetTime - Date.now()) / 1000)
      const error = new Error(
        `Rate limit exceeded. ${result.remaining} requests remaining. Reset in ${resetTime} seconds.`
      )
      ;(error as any).rateLimitInfo = result
      throw error
    }
    
    console.log(`🚦 Rate limit OK - ${endpoint}: ${result.totalRequests}/${result.totalRequests + result.remaining} requests`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      throw error
    }
    
    console.error('Rate limiting error:', error)
  }
}

// Permission checking
export function checkPermissions(
  user: any,
  resource: string,
  action: string,
  resourceData?: any,
  targetBranchId?: string
): boolean {
  return canAccessResource(
    user.role,
    user.id,
    user.branchId,
    resource as any,
    action as any,
    resourceData
  )
}

// Enhanced response functions
export function createRateLimitErrorResponse(
  message: string,
  rateLimitInfo?: any
): NextResponse {
  const response = NextResponse.json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  }, { status: 429 })
  
  if (rateLimitInfo) {
    response.headers.set('X-RateLimit-Limit', (rateLimitInfo.totalRequests + rateLimitInfo.remaining).toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000).toString())
    response.headers.set('Retry-After', '60')
  }
  
  addSecurityHeaders(response)
  return response
}

export function createSecureSuccessResponse(data: any, message?: string) {
  const response = NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...(message && { message }),
    ...data
  })
  
  addSecurityHeaders(response)
  return response
}

export function createSecureErrorResponse(message: string, status: number = 400, details?: any) {
  const response = NextResponse.json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && details && { details })
  }, { status })
  
  addSecurityHeaders(response)
  return response
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
}

// Request logging
export function logRequest(request: Request, user?: any): string {
  const requestId = crypto.randomUUID()
  const logData = {
    requestId,
    timestamp: new Date().toISOString(),
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: getClientIP(request),
    userId: user?.id,
    userRole: user?.role,
    branchId: user?.branchId
  }
  
  console.log('📝 API Request:', logData)
  return requestId
}

// Audit logging
export async function auditLog(
  action: string,
  resource: string,
  resourceId: string,
  user: any,
  details?: any
) {
  const auditData = {
    action,
    resource,
    resourceId,
    userId: user.id,
    username: user.username,
    userRole: user.role,
    branchId: user.branchId,
    timestamp: new Date(),
    details: details || {}
  }
  
  console.log('🔍 Audit Log:', auditData)
  
  try {
    await prisma.auditLog.create({
      data: auditData
    })
  } catch (error) {
    console.error('Failed to save audit log:', error)
  }
}

// Helper functions
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  const clientIP = request.headers.get('x-client-ip')
  if (clientIP) {
    return clientIP
  }
  
  return 'unknown'
}

export function validateUrlParam(paramName: string, paramValue: string): string {
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
  
  const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i
  
  if (!uuidRegex.test(paramValue.replace(/-/g, ''))) {
    throw new ValidationError(`Invalid ${paramName} format`, [
      {
        code: 'invalid_string',
        validation: 'uuid',
        path: [paramName],
        message: `${paramName} must be a valid UUID`
      }
    ])
  }
  
  const cleanId = paramValue.replace(/-/g, '')
  if (cleanId.length === 32) {
    return `${cleanId.slice(0,8)}-${cleanId.slice(8,12)}-${cleanId.slice(12,16)}-${cleanId.slice(16,20)}-${cleanId.slice(20)}`
  }
  
  return paramValue
}

// Add missing function for validation errors
export function addValidationErrors(details: ValidationErrorDetail[], title: string) {
  // This would be implemented by the calling component
  console.error(title, details)
}