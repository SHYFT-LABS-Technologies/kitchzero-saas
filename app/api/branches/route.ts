import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { branchSchema } from "@/lib/validation"
import {
  handleApiError,
  validateAndParseBody,
  checkRateLimitEnhanced,
  createSecureErrorResponse // Added for CSRF
} from "@/lib/api-utils"
import { verifyCsrfToken } from "@/lib/security"; // Import CSRF verification

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply PostgreSQL-backed rate limiting using the 'api_read' configuration.
    // Limits are defined in rateLimitConfigs in lib/rate-limit-postgres.ts and selected based on endpointName and user role.
    await checkRateLimitEnhanced(request, user, 'api_read');

    let branches
    if (user.role === "SUPER_ADMIN") {
      branches = await prisma.branch.findMany({
        include: {
          users: {
            select: { id: true, username: true, role: true },
          },
          _count: {
            select: { inventory: true, wasteLogs: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    } else {
      branches = await prisma.branch.findMany({
        where: { id: user.branchId },
        include: {
          users: {
            select: { id: true, username: true, role: true },
          },
          _count: {
            select: { inventory: true, wasteLogs: true },
          },
        },
      })
    }

    return NextResponse.json({ branches })
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

    // Perform CSRF validation: token in X-CSRF-Token header must match token in HttpOnly cookie.
    if (!verifyCsrfToken(request)) {
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'api_write');

    // Validate request body
    const validatedData = await validateAndParseBody(request, branchSchema)

    // Check for duplicate branch name
    const existingBranch = await prisma.branch.findFirst({
      where: { name: validatedData.name }
    })

    if (existingBranch) {
      return NextResponse.json(
        { error: "A branch with this name already exists" },
        { status: 409 }
      )
    }

    const branch = await prisma.branch.create({
      data: {
        name: validatedData.name,
        location: validatedData.location,
      },
      include: {
        users: {
          select: { id: true, username: true, role: true },
        },
        _count: {
          select: { inventory: true, wasteLogs: true },
        },
      },
    })

    return NextResponse.json({ 
      branch,
      message: "Branch created successfully"
    })
  } catch (error) {
    return handleApiError(error)
  }
}