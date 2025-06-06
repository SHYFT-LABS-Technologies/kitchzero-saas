import { type NextRequest, NextResponse } from "next/server"
import { verifyRefreshToken, generateAccessToken, verifySession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { 
  createSecureSuccessResponse,
  createSecureErrorResponse,
  logRequest,
  auditLog,
  checkRateLimitEnhanced,
  handleApiError // Add this import
} from "@/lib/api-utils"

export async function POST(request: NextRequest) {
  const requestId = logRequest(request)
  
  try {
    // Rate limiting for refresh attempts
    await checkRateLimitEnhanced(request, null, 'refresh')
    
    const refreshToken = request.cookies.get("refresh-token")?.value
    
    if (!refreshToken) {
      console.log(`❌ [${requestId}] No refresh token provided`)
      return createSecureErrorResponse("No refresh token provided", 401)
    }
    
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      console.log(`❌ [${requestId}] Invalid refresh token`)
      return createSecureErrorResponse("Invalid refresh token", 401)
    }
    
    // Verify session is still active
    const isSessionActive = await verifySession(payload.sessionId)
    if (!isSessionActive) {
      console.log(`❌ [${requestId}] Session expired`)
      return createSecureErrorResponse("Session expired", 401)
    }
    
    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        role: true,
        branchId: true
      }
    })
    
    if (!user) {
      console.log(`❌ [${requestId}] User not found for refresh`)
      return createSecureErrorResponse("User not found", 401)
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken({
      id: user.id,
      username: user.username,
      role: user.role as "SUPER_ADMIN" | "BRANCH_ADMIN",
      branchId: user.branchId || undefined,
      sessionId: payload.sessionId
    })
    
    // Audit token refresh
    await auditLog(
      'TOKEN_REFRESH',
      'USER',
      user.id,
      user,
      { sessionId: payload.sessionId }
    )
    
    console.log(`✅ [${requestId}] Token refreshed for user:`, user.username)
    
    const response = createSecureSuccessResponse({
      message: "Token refreshed successfully"
    })
    
    // Set new access token cookie
    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set("access-token", newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    })
    
    return response
  } catch (error) {
    console.error(`❌ [${requestId}] Token refresh error:`, error)
    return handleApiError(error)
  }
}