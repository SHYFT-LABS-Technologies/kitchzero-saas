import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, generateToken } from "@/lib/auth"
import { loginSchema } from "@/lib/validation"
import { handleApiError, validateAndParseBody } from "@/lib/api-utils"

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const { username, password } = await validateAndParseBody(request, loginSchema)

    console.log("🔍 Attempting to authenticate user:", username)
    const user = await authenticateUser(username, password)

    if (!user) {
      console.log("❌ Authentication failed for user:", username)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    console.log("✅ User authenticated successfully:", user.username)

    const token = generateToken(user)
    const response = NextResponse.json({
      user,
      message: "Login successful",
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (error) {
    return handleApiError(error)
  }
}