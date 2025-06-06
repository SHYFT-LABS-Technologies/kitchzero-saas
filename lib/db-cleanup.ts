import { prisma } from './prisma'

export async function cleanupRateLimits(): Promise<{ deletedCount: number }> {
  try {
    const result = await prisma.rateLimit.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    console.log(`🧹 Cleaned up ${result.count} expired rate limit entries`)
    return { deletedCount: result.count }
  } catch (error) {
    console.error('Failed to cleanup rate limits:', error)
    return { deletedCount: 0 }
  }
}

export async function cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
  try {
    const result = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    console.log(`🧹 Cleaned up ${result.count} expired sessions`)
    return { deletedCount: result.count }
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error)
    return { deletedCount: 0 }
  }
}

export async function cleanupOldLoginAttempts(): Promise<{ deletedCount: number }> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const result = await prisma.loginAttempt.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    })
    
    console.log(`🧹 Cleaned up ${result.count} old login attempts`)
    return { deletedCount: result.count }
  } catch (error) {
    console.error('Failed to cleanup old login attempts:', error)
    return { deletedCount: 0 }
  }
}

export async function cleanupOldAuditLogs(): Promise<{ deletedCount: number }> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    
    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: ninetyDaysAgo
        }
      }
    })
    
    console.log(`🧹 Cleaned up ${result.count} old audit logs`)
    return { deletedCount: result.count }
  } catch (error) {
    console.error('Failed to cleanup old audit logs:', error)
    return { deletedCount: 0 }
  }
}

export async function runAllCleanupJobs(): Promise<void> {
  console.log('🧹 Starting database cleanup jobs...')
  
  const results = await Promise.allSettled([
    cleanupRateLimits(),
    cleanupExpiredSessions(),
    cleanupOldLoginAttempts(),
    cleanupOldAuditLogs()
  ])
  
  let totalDeleted = 0
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      totalDeleted += result.value.deletedCount
    } else {
      console.error(`Cleanup job ${index} failed:`, result.reason)
    }
  })
  
  console.log(`✅ Database cleanup completed. Total records deleted: ${totalDeleted}`)
}

// Auto-run cleanup in production
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    runAllCleanupJobs().catch(console.error)
  }, 6 * 60 * 60 * 1000) // Every 6 hours
  
  runAllCleanupJobs().catch(console.error)
}