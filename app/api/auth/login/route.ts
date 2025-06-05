import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 Login attempt received")

    const body = await request.json()
    const { username, password } = body

    console.log("📝 Login data:", { username, password: password ? "***" : "missing" })

    if (!username || !password) {
      console.log("❌ Missing credentials")
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

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

    console.log("🍪 Auth token set in cookie")
    return response
  } catch (error) {
    console.error("❌ Login error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
