import { type NextRequest, NextResponse } from "next/server"
import { verifyRefreshToken, generateAccessToken, verifySession, generateRefreshToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jwtConfig } from "@/lib/config" // Added jwtConfig import
import { 
  createSecureSuccessResponse,
  createSecureErrorResponse,
  logRequest,
  auditLog,
  checkRateLimitEnhanced,
  handleApiError
} from "@/lib/api-utils"
import { verifyCsrfToken } from "@/lib/security"; // Import CSRF verification

export async function POST(request: NextRequest) {
  const requestId = logRequest(request)
  // Implements refresh token rotation strategy:
  // 1. Verify the incoming refresh token. Extract its JTI (JWT ID), session ID, and user ID.
  // 2. Fetch the UserSession from the database using the session ID.
  // 3. Compare the JTI from the incoming token with the `currentRefreshTokenJti` stored in the UserSession.
  // 4. If the JTIs do not match, or if the session doesn't exist, it signifies a potential token reuse
  //    or an invalid session. In this case, the session (if it exists) is invalidated as a security measure,
  //    and an error is returned, forcing the user to log in again.
  // 5. If the JTIs match and the session is valid, proceed to issue a new access token.
  // 6. A new refresh token (with a new JTI) is also generated.
  // 7. The UserSession in the database is updated with this new refresh token's JTI.
  // 8. Both the new access token and the new refresh token are returned to the client via HttpOnly cookies.
  // This process ensures that each refresh token can only be used once, enhancing security.
  try {
    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    // Rate limiting for refresh attempts
    await checkRateLimitEnhanced(request, null, 'refresh')
    
    const refreshToken = request.cookies.get("refresh-token")?.value
    
    if (!refreshToken) {
      console.log(`❌ [${requestId}] No refresh token provided`)
      return createSecureErrorResponse("No refresh token provided", 401)
    }
    
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)
    if (!payload || !payload.jti || !payload.sessionId || !payload.userId) {
      console.log(`❌ [${requestId}] Invalid refresh token or missing claims`)
      return createSecureErrorResponse("Invalid refresh token", 401)
    }

    const { jti: currentJti, sessionId, userId } = payload

    // Fetch the UserSession
    const session = await prisma.userSession.findUnique({ where: { id: sessionId } });

    // Security Check (Session & JTI):
    // This is a critical step for refresh token rotation.
    // It verifies that the JTI of the incoming refresh token matches the JTI stored in the user's session.
    // - If `!session`: The session associated with this refresh token doesn't exist (e.g., logged out, expired, or already invalidated).
    // - If `session.currentRefreshTokenJti !== currentJti`: The JTI from the token doesn't match the
    //   one expected for this session. This could indicate that an old or compromised refresh token is being used.
    // In either case, if the session still exists in the DB (e.g. JTI mismatch), it's invalidated as a precaution
    // to prevent further use of this token family.
    if (!session || session.currentRefreshTokenJti !== currentJti) {
      if (session) { // JTI mismatch implies potential reuse of old token, or session is out of sync.
        console.warn(`🚨 [${requestId}] SECURITY ALERT: Refresh token JTI mismatch for session ${sessionId}. Invalidating session.`)
        await prisma.userSession.delete({ where: { id: sessionId } });
      } else {
        // Session not found, but a refresh token with its ID was presented. Log the JTI for investigation.
        console.warn(`🚨 [${requestId}] SECURITY ALERT: Session ${sessionId} not found for refresh token (JTI: ${currentJti}).`)
      }
      return createSecureErrorResponse("Invalid session or token reuse detected. Please log in again.", 401)
    }
    
    // Verify session is still active (includes expiry check and updates lastActivity)
    // verifySession already handles deleting session if expired.
    const isSessionActive = await verifySession(sessionId)
    if (!isSessionActive) {
      console.log(`❌ [${requestId}] Session expired or inactive for session ${sessionId}`)
      // verifySession should have deleted it, but if not, or if state changed, this is a fallback.
      return createSecureErrorResponse("Session expired. Please log in again.", 401)
    }
    
    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      sessionId: sessionId
    })

    // Generate a new refresh token with a new JTI. This is the "rotated" token.
    const { token: newRefreshTokenString, jti: newRefreshTokenJti } = generateRefreshToken(user.id, sessionId);

    // Update the session in the database with the JTI of the new refresh token.
    // This ensures that only the new refresh token (newRefreshTokenString with newRefreshTokenJti)
    // can be used for future refresh attempts.
    // Also update lastActivity to keep the session fresh, as this is a valid user activity.
    await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        currentRefreshTokenJti: newRefreshTokenJti,
        lastActivity: new Date()
      }
    });
    
    // Audit token refresh
    await auditLog(
      'TOKEN_REFRESH',
      'USER',
      user.id,
      user, // Ensure this object is just user data, not sensitive like password
      { sessionId: sessionId, newJti: newRefreshTokenJti }
    )
    
    console.log(`✅ [${requestId}] Token refreshed for user: ${user.username}, session: ${sessionId}`)
    
    const response = createSecureSuccessResponse({
      message: "Token refreshed successfully"
    })
    
    const isProduction = process.env.NODE_ENV === 'production'

    // Set new access token cookie
    response.cookies.set("access-token", newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: jwtConfig.accessTokenExpiryInSeconds || (15 * 60), // 15 minutes from config or default
      path: "/",
    })

    // Set new refresh token cookie.
    // This completes the rotation by providing the client with the next token in the chain (newRefreshTokenString).
    // The old refresh token (the one that was just used, identified by `currentJti`) is now effectively
    // invalidated on the server-side because `session.currentRefreshTokenJti` has been updated to `newRefreshTokenJti`.
    response.cookies.set("refresh-token", newRefreshTokenString, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: jwtConfig.refreshTokenExpiryInSeconds || (7 * 24 * 60 * 60),
      path: "/api/auth/refresh",
    })
    
    return response
  } catch (error) {
    // If it's a known error type from our utils (like rate limit), it might already be handled
    // otherwise, log generic error.
    if (!(error instanceof Error && 'statusCode' in error)) {
       console.error(`❌ [${requestId}] Unhandled Token refresh error:`, error)
    }
    return handleApiError(error)
  }
}