import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, invalidateSession } from "@/lib/auth"
import { 
  createSecureSuccessResponse,
  logRequest,
  auditLog
} from "@/lib/api-utils"

export async function POST(request: NextRequest) {
  const requestId = logRequest(request)
  
  try {
    const user = await getAuthUser(request)
    
    if (user) {
      // Invalidate the session
      await invalidateSession(user.sessionId)
      
      // Audit logout
      await auditLog(
        'LOGOUT',
        'USER',
        user.id,
        user,
        { sessionId: user.sessionId }
      )
      
      console.log(`✅ [${requestId}] User logged out:`, user.username)
    }
    
    const response = createSecureSuccessResponse({
      message: "Logged out successfully"
    })
    
    // Clear authentication cookies
    response.cookies.delete("access-token")
    response.cookies.delete("refresh-token")
    
    return response
  } catch (error) {
    console.error(`❌ [${requestId}] Logout error:`, error)
    
    // Even if there's an error, clear the cookies
    const response = createSecureSuccessResponse({
      message: "Logged out successfully"
    })
    
    response.cookies.delete("access-token")
    response.cookies.delete("refresh-token")
    
    return response
  }
}