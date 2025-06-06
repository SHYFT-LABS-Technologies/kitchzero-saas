import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, hashPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  handleApiError,
  checkRateLimitEnhanced,
  createSecureErrorResponse // Added for CSRF
} from "@/lib/api-utils"
import { verifyCsrfToken } from "@/lib/security"; // Import CSRF verification

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await checkRateLimitEnhanced(request, user, 'api_read');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ users })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    await checkRateLimitEnhanced(request, user, 'api_write');

    // Get request body
    const body = await request.json()
    console.log("Create user request body:", body)

    // Manual validation to avoid UUID issues
    if (!body.username || body.username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long" },
        { status: 400 }
      )
    }

    if (!body.password || body.password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    if (!body.role || !['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(body.role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be SUPER_ADMIN or BRANCH_ADMIN" },
        { status: 400 }
      )
    }

    // For BRANCH_ADMIN, validate branch selection
    if (body.role === 'BRANCH_ADMIN') {
      if (!body.branchId || body.branchId.trim() === '') {
        return NextResponse.json(
          { error: "Branch selection is required for Branch Admin role" },
          { status: 400 }
        )
      }

      // Check if branch exists
      const branchExists = await prisma.branch.findUnique({
        where: { id: body.branchId }
      })

      if (!branchExists) {
        return NextResponse.json(
          { error: "Selected branch does not exist" },
          { status: 400 }
        )
      }
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: body.username.trim() },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    const hashedPassword = await hashPassword(body.password)

    const newUser = await prisma.user.create({
      data: {
        username: body.username.trim(),
        password: hashedPassword,
        role: body.role,
        branchId: body.role === "BRANCH_ADMIN" ? body.branchId : null,
      },
      select: {
        id: true,
        username: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        createdAt: true,
      },
    })

    return NextResponse.json({ 
      user: newUser,
      message: "User created successfully" 
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return handleApiError(error)
  }
}