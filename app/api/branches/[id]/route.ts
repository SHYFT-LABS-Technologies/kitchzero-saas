import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { branchSchema } from "@/lib/validation"
import { 
  handleApiError, 
  validateAndParseBody, 
  validateSimpleParam, // Use simple validation instead
  checkRateLimitEnhanced,
  checkPermission,
  createSecureErrorResponse // Added for CSRF
} from "@/lib/api-utils"
import { verifyCsrfToken } from "@/lib/security"; // Import CSRF verification

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkPermission(user.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await checkRateLimitEnhanced(request, user, 'api_read');

    const branchId = validateSimpleParam("branchId", params.id)

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        users: {
          select: { id: true, username: true, role: true },
        },
        _count: {
          select: { inventory: true, wasteLogs: true },
        },
      },
    })

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    return NextResponse.json({ branch })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkPermission(user.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    await checkRateLimitEnhanced(request, user, 'api_write');

    const branchId = validateSimpleParam("branchId", params.id)

    // Get request body
    const body = await request.json()
    console.log("Update branch request body:", body)

    // Simple validation
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Branch name is required" },
        { status: 400 }
      )
    }

    if (!body.location || body.location.trim().length === 0) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 }
      )
    }

    // Check if branch exists
    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId }
    })

    if (!existingBranch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    // Check for duplicate branch name (excluding current branch)
    const duplicateBranch = await prisma.branch.findFirst({
      where: {
        name: body.name.trim(),
        NOT: { id: branchId }
      }
    })

    if (duplicateBranch) {
      return NextResponse.json(
        { error: "A branch with this name already exists" },
        { status: 409 }
      )
    }

    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: { 
        name: body.name.trim(), 
        location: body.location.trim() 
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
      branch: updatedBranch,
      message: "Branch updated successfully"
    })
  } catch (error) {
    console.error("Error updating branch:", error)
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!checkPermission(user.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    await checkRateLimitEnhanced(request, user, 'api_delete');

    const branchId = validateSimpleParam("branchId", params.id)

    // Check if branch exists and get dependency information
    const branchWithDependencies = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        users: true,
        _count: {
          select: { 
            inventory: true, 
            wasteLogs: true 
          },
        },
      },
    })

    if (!branchWithDependencies) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    // Check for users assigned to this branch
    if (branchWithDependencies.users.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete branch with assigned users",
          details: `This branch has ${branchWithDependencies.users.length} user(s) assigned. Please reassign or delete users first.`,
          dependencies: {
            users: branchWithDependencies.users.length,
            inventory: branchWithDependencies._count.inventory,
            wasteLogs: branchWithDependencies._count.wasteLogs
          }
        },
        { status: 400 }
      )
    }

    // For MVP, allow deletion even with inventory/waste logs, but warn the user
    if (branchWithDependencies._count.inventory > 0 || branchWithDependencies._count.wasteLogs > 0) {
      // First delete related records
      await prisma.$transaction([
        prisma.inventory.deleteMany({
          where: { branchId: branchId }
        }),
        prisma.wasteLog.deleteMany({
          where: { branchId: branchId }
        }),
        prisma.branch.delete({
          where: { id: branchId }
        })
      ])

      return NextResponse.json({ 
        message: "Branch and all related data deleted successfully",
        warning: `Deleted ${branchWithDependencies._count.inventory} inventory items and ${branchWithDependencies._count.wasteLogs} waste logs`
      })
    }

    // If no dependencies, proceed with simple deletion
    await prisma.branch.delete({
      where: { id: branchId },
    })

    return NextResponse.json({ 
      message: "Branch deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting branch:", error)
    return handleApiError(error)
  }
}