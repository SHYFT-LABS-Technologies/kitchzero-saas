import { prisma } from './prisma'

export interface RateLimitConfig {
  requests: number
  window: number // milliseconds
  endpoint: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  totalRequests: number
  windowStart: number
}

export class PostgreSQLRateLimiter {
  async checkLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = new Date()
    const windowStart = new Date(Math.floor(now.getTime() / config.window) * config.window)
    const windowEnd = new Date(windowStart.getTime() + config.window)
    
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Clean up expired entries first
        await tx.rateLimit.deleteMany({
          where: {
            expiresAt: { lt: now }
          }
        })
        
        // Try to find existing rate limit record for this window
        const existing = await tx.rateLimit.findUnique({
          where: {
            identifier_endpoint_windowStart: {
              identifier,
              endpoint: config.endpoint,
              windowStart
            }
          }
        })
        
        if (existing) {
          if (existing.requestCount >= config.requests) {
            return {
              allowed: false,
              remaining: 0,
              resetTime: windowEnd.getTime(),
              totalRequests: existing.requestCount,
              windowStart: windowStart.getTime()
            }
          }
          
          const updated = await tx.rateLimit.update({
            where: { id: existing.id },
            data: { 
              requestCount: { increment: 1 },
              updatedAt: now
            }
          })
          
          return {
            allowed: true,
            remaining: config.requests - updated.requestCount,
            resetTime: windowEnd.getTime(),
            totalRequests: updated.requestCount,
            windowStart: windowStart.getTime()
          }
        } else {
          await tx.rateLimit.create({
            data: {
              identifier,
              endpoint: config.endpoint,
              requestCount: 1,
              windowStart,
              expiresAt: windowEnd,
              createdAt: now,
              updatedAt: now
            }
          })
          
          return {
            allowed: true,
            remaining: config.requests - 1,
            resetTime: windowEnd.getTime(),
            totalRequests: 1,
            windowStart: windowStart.getTime()
          }
        }
      })
      
      return result
    } catch (error) {
      console.error('PostgreSQL rate limit error:', error)
      
      return {
        allowed: true,
        remaining: config.requests - 1,
        resetTime: windowEnd.getTime(),
        totalRequests: 1,
        windowStart: windowStart.getTime()
      }
    }
  }
  
  async resetLimit(identifier: string, endpoint: string): Promise<void> {
    await prisma.rateLimit.deleteMany({
      where: {
        identifier,
        endpoint
      }
    })
  }
}

export const pgRateLimiter = new PostgreSQLRateLimiter()

// Rate limit configurations
export const rateLimitConfigs = {
  login: { requests: 5, window: 15 * 60 * 1000, endpoint: 'login' },
  refresh: { requests: 10, window: 5 * 60 * 1000, endpoint: 'refresh' },
  api_read: { requests: 100, window: 60 * 1000, endpoint: 'api_read' },
  api_write: { requests: 50, window: 60 * 1000, endpoint: 'api_write' },
  api_delete: { requests: 20, window: 60 * 1000, endpoint: 'api_delete' },
  admin_read: { requests: 300, window: 60 * 1000, endpoint: 'admin_read' },
  admin_write: { requests: 150, window: 60 * 1000, endpoint: 'admin_write' },
  admin_delete: { requests: 50, window: 60 * 1000, endpoint: 'admin_delete' },
  analytics: { requests: 30, window: 60 * 1000, endpoint: 'analytics' },
  export: { requests: 5, window: 5 * 60 * 1000, endpoint: 'export' },
}

export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`
  }
  
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')
  
  const ip = forwarded?.split(',')[0].trim() || realIP || clientIP || 'unknown'
  return `ip:${ip}`
}

export function getRateLimitConfig(endpoint: string, userRole?: string): RateLimitConfig {
  if (userRole === 'SUPER_ADMIN') {
    const adminKey = `admin_${endpoint}` as keyof typeof rateLimitConfigs
    if (rateLimitConfigs[adminKey]) {
      return rateLimitConfigs[adminKey]
    }
  }
  
  const configKey = endpoint as keyof typeof rateLimitConfigs
  return rateLimitConfigs[configKey] || rateLimitConfigs.api_read
}

export async function checkPostgreSQLRateLimit(
  request: Request,
  endpoint: string,
  userId?: string,
  userRole?: string
): Promise<RateLimitResult> {
  const identifier = getClientIdentifier(request, userId)
  const config = getRateLimitConfig(endpoint, userRole)
  
  const result = await pgRateLimiter.checkLimit(identifier, config)
  
  if (!result.allowed) {
    console.warn(`🚫 Rate limit exceeded: ${identifier} on ${endpoint}`, {
      requests: result.totalRequests,
      limit: config.requests,
      resetTime: new Date(result.resetTime).toISOString()
    })
  }
  
  return result
}