import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, hashPassword, invalidateAllUserSessions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateUserSchema } from "@/lib/validation"
import { 
  handleApiError, 
  validateAndParseBody, 
  validateSimpleParam, // Use simple validation instead
  checkRateLimitEnhanced,
  checkPermission 
} from "@/lib/api-utils"

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

    // Use simple parameter validation
    const userId = validateSimpleParam("userId", params.id)

    const userData = await prisma.user.findUnique({
      where: { id: userId },
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
    })

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: userData })
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

    await checkRateLimitEnhanced(request, user, 'api_write');

    // Use simple parameter validation
    const userId = validateSimpleParam("userId", params.id)

    // Get request body without validation first to debug
    const body = await request.json()
    console.log("Update user request body:", body)

    // Simple validation for required fields
    if (!body.username || body.username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters long" },
        { status: 400 }
      )
    }

    if (!body.role || !['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(body.role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be SUPER_ADMIN or BRANCH_ADMIN" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if username already exists (excluding current user)
    if (body.username && body.username !== existingUser.username) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          username: body.username,
          NOT: { id: userId },
        },
      })

      if (duplicateUser) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 409 }
        )
      }
    }

    // If changing to BRANCH_ADMIN, validate branch exists
    if (body.role === "BRANCH_ADMIN" && body.branchId) {
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

    // Build update data
    const updateData: any = {
      username: body.username.trim(),
      role: body.role,
      branchId: body.role === "BRANCH_ADMIN" ? body.branchId : null,
    }

    // Only update password if provided and not empty
    if (body.password && body.password.trim() !== "") {
      updateData.password = await hashPassword(body.password)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
        updatedAt: true,
      },
    })

    // If password was changed, invalidate all sessions for this user.
    // This is a security measure to ensure that if an admin changes a user's password
    // (e.g., due to a suspected compromise or user request), all existing sessions for that user
    // are terminated. This forces the user to re-authenticate with their new password on all
    // devices/browsers, preventing unauthorized access via old sessions.
    if (updateData.password) {
      await invalidateAllUserSessions(userId);
      console.log(`All sessions for user ${userId} invalidated due to password change by admin ${user.id}.`);
    }

    return NextResponse.json({ 
      user: updatedUser,
      message: "User updated successfully"
    })
  } catch (error) {
    console.error("Error updating user:", error)
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

    await checkRateLimitEnhanced(request, user, 'api_delete');

    // Use simple parameter validation
    const userId = validateSimpleParam("userId", params.id)

    // Prevent deleting self
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ 
      message: "User deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return handleApiError(error)
  }
}