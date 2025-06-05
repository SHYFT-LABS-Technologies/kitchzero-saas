import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, hashPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateUserSchema } from "@/lib/validation"
import { 
  handleApiError, 
  validateAndParseBody, 
  validateUrlParam,
  checkRateLimit,
  checkPermission 
} from "@/lib/api-utils"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permission
    if (!checkPermission(user.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Rate limiting
    const clientIp = request.ip || 'unknown'
    if (!checkRateLimit(`user-get:${clientIp}`, 60, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const userId = validateUrlParam("userId", params.id)

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

    // Check permission
    if (!checkPermission(user.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Rate limiting
    const clientIp = request.ip || 'unknown'
    if (!checkRateLimit(`user-update:${clientIp}`, 20, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const userId = validateUrlParam("userId", params.id)

    // Validate request body
    const validatedData = await validateAndParseBody(request, updateUserSchema)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if username already exists (excluding current user)
    const duplicateUser = await prisma.user.findFirst({
      where: {
        username: validatedData.username,
        NOT: { id: userId },
      },
    })

    if (duplicateUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      )
    }

    // If changing to BRANCH_ADMIN, validate branch exists
    if (validatedData.role === "BRANCH_ADMIN" && validatedData.branchId) {
      const branchExists = await prisma.branch.findUnique({
        where: { id: validatedData.branchId }
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
      username: validatedData.username,
      role: validatedData.role,
      branchId: validatedData.role === "BRANCH_ADMIN" ? validatedData.branchId : null,
    }

    // Only update password if provided and not empty
    if (validatedData.password && validatedData.password.trim() !== "") {
      updateData.password = await hashPassword(validatedData.password)
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

    return NextResponse.json({ 
      user: updatedUser,
      message: "User updated successfully"
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permission
    if (!checkPermission(user.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Rate limiting
    const clientIp = request.ip || 'unknown'
    if (!checkRateLimit(`user-delete:${clientIp}`, 10, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const userId = validateUrlParam("userId", params.id)

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
    return handleApiError(error)
  }
}