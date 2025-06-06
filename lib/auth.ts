import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { prisma } from "./prisma"
import { config, jwtConfig, securityConfig } from "./config"

export interface AuthUser {
  id: string
  username: string
  role: "SUPER_ADMIN" | "BRANCH_ADMIN"
  branchId?: string
  sessionId: string
}

export interface TokenPayload extends AuthUser {
  type: 'access' | 'refresh'
  iat: number
  exp: number
  iss: string
  aud: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, securityConfig.bcryptRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateAccessToken(user: AuthUser): string {
  const payload: Omit<TokenPayload, 'iat' | 'exp' | 'aud' | 'iss'> = {
    ...user,
    type: 'access'
  }

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: jwtConfig.accessTokenExpiry,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    algorithm: 'HS256'
  })
}

export function generateRefreshToken(userId: string, sessionId: string): string {
  const payload = {
    userId,
    sessionId,
    type: 'refresh'
  }

  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: jwtConfig.refreshTokenExpiry,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    algorithm: 'HS256'
  })
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithms: ['HS256']
    }) as TokenPayload

    return payload.type === 'access' ? payload : null
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): any {
  try {
    const payload = jwt.verify(token, config.JWT_REFRESH_SECRET, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithms: ['HS256']
    }) as any

    return payload.type === 'refresh' ? payload : null
  } catch {
    return null
  }
}

// Session management
export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
      lastActivity: new Date()
    }
  })

  return sessionId
}

export async function verifySession(sessionId: string): Promise<boolean> {
  try {
    const session = await prisma.userSession.findUnique({
      where: { id: sessionId }
    })

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.userSession.delete({ where: { id: sessionId } }).catch(() => {})
      }
      return false
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActivity: new Date() }
    }).catch(() => {})

    return true
  } catch {
    return false
  }
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.userSession.delete({
    where: { id: sessionId }
  }).catch(() => {})
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await prisma.userSession.deleteMany({
    where: { userId }
  })
}

// Enhanced authentication with login attempts tracking
export async function authenticateUser(
  username: string, 
  password: string,
  clientIp: string
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string } | null> {
  try {
    const recentFailures = await getRecentFailedAttempts(username, clientIp)
    if (recentFailures >= securityConfig.maxLoginAttempts) {
      throw new Error('Account temporarily locked due to multiple failed attempts')
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true },
    })

    if (!user) {
      await recordFailedLogin(username, clientIp, 'USER_NOT_FOUND')
      return null
    }

    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      await recordFailedLogin(username, clientIp, 'INVALID_PASSWORD')
      return null
    }

    await clearFailedLogins(username, clientIp)
    const sessionId = await createSession(user.id)

    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role as "SUPER_ADMIN" | "BRANCH_ADMIN",
      branchId: user.branchId || undefined,
      sessionId
    }

    const accessToken = generateAccessToken(authUser)
    const refreshToken = generateRefreshToken(user.id, sessionId)

    return { user: authUser, accessToken, refreshToken }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    return null
  }
}

// Login attempts tracking
async function getRecentFailedAttempts(username: string, clientIp: string): Promise<number> {
  const since = new Date(Date.now() - securityConfig.lockoutDuration)
  
  const count = await prisma.loginAttempt.count({
    where: {
      OR: [
        { username, createdAt: { gte: since } },
        { clientIp, createdAt: { gte: since } }
      ],
      success: false
    }
  })

  return count
}

async function recordFailedLogin(username: string, clientIp: string, reason: string): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      username,
      clientIp,
      success: false,
      failureReason: reason,
      createdAt: new Date()
    }
  })
}

async function clearFailedLogins(username: string, clientIp: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: {
      OR: [
        { username },
        { clientIp }
      ],
      success: false
    }
  })

  await prisma.loginAttempt.create({
    data: {
      username,
      clientIp,
      success: true,
      createdAt: new Date()
    }
  })
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const accessToken = request.cookies.get("access-token")?.value
  
  if (!accessToken) {
    return null
  }

  const payload = verifyAccessToken(accessToken)
  if (payload) {
    const isSessionActive = await verifySession(payload.sessionId)
    if (isSessionActive) {
      return payload
    }
  }

  return null
}

// Cleanup functions
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const result = await prisma.userSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    
    console.log(`🧹 Cleaned up ${result.count} expired sessions`)
  } catch (error) {
    console.error('Failed to cleanup expired sessions:', error)
  }
}

export async function cleanupOldLoginAttempts(): Promise<void> {
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
  } catch (error) {
    console.error('Failed to cleanup old login attempts:', error)
  }
}
