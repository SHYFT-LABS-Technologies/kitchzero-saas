import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser } from "@/lib/auth"
import { loginSchema } from "@/lib/validation"
import { 
  handleApiError, 
  validateAndParseBody, 
  checkRateLimitEnhanced,
  createSecureSuccessResponse,
  createSecureErrorResponse,
  logRequest,
  auditLog,
  getClientIP
} from "@/lib/api-utils"
import { verifyCsrfToken } from "@/lib/security"; // Import CSRF verification

export async function POST(request: NextRequest) {
  const requestId = logRequest(request)
  const clientIp = getClientIP(request)
  
  try {
    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    // PostgreSQL-based rate limiting for login attempts
    await checkRateLimitEnhanced(request, null, 'login')
    
    // Validate request body with enhanced sanitization
    const { username, password } = await validateAndParseBody(request, loginSchema)
    
    console.log(`🔐 [${requestId}] Login attempt for user:`, username)
    
    // Authenticate user with enhanced security
    const authResult = await authenticateUser(username, password, clientIp)
    
    if (!authResult) {
      // Audit failed login
      await auditLog(
        'LOGIN_FAILED',
        'USER',
        username,
        { id: 'anonymous', username: 'anonymous', role: 'anonymous' },
        { clientIp, reason: 'Invalid credentials' }
      )
      
      console.log(`❌ [${requestId}] Authentication failed for user:`, username)
      return createSecureErrorResponse("Invalid credentials", 401)
    }

    const { user, accessToken, refreshToken } = authResult
    
    // Audit successful login
    await auditLog(
      'LOGIN_SUCCESS',
      'USER',
      user.id,
      user,
      { clientIp, sessionId: user.sessionId }
    )

    console.log(`✅ [${requestId}] User authenticated successfully:`, user.username)

    // Create response with secure cookies
    const response = createSecureSuccessResponse({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        branchId: user.branchId
      },
      message: "Login successful"
    })

    // Set secure HTTP-only cookies
    const isProduction = process.env.NODE_ENV === 'production'
    
    response.cookies.set("access-token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    })
    
    response.cookies.set("refresh-token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error(`❌ [${requestId}] Login error:`, error)
    
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return handleApiError(error)
    }
    
    if (error instanceof Error && error.message.includes('Account locked')) {
      return createSecureErrorResponse(error.message, 423)
    }
    
    return handleApiError(error)
  }
}