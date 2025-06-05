import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { branchSchema } from "@/lib/validation"
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
    if (!checkRateLimit(`branch-get:${clientIp}`, 60, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const branchId = validateUrlParam("branchId", params.id)

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

    // Check permission
    if (!checkPermission(user.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Rate limiting
    const clientIp = request.ip || 'unknown'
    if (!checkRateLimit(`branch-update:${clientIp}`, 20, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const branchId = validateUrlParam("branchId", params.id)

    // Validate request body
    const { name, location } = await validateAndParseBody(request, branchSchema)

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
        name,
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
      data: { name, location },
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
    if (!checkRateLimit(`branch-delete:${clientIp}`, 10, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const branchId = validateUrlParam("branchId", params.id)

    // Check if branch has users assigned
    const branchWithUsers = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        users: true,
        _count: {
          select: { inventory: true, wasteLogs: true },
        },
      },
    })

    if (!branchWithUsers) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 })
    }

    if (branchWithUsers.users.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete branch with assigned users",
          details: `This branch has ${branchWithUsers.users.length} user(s) assigned. Please reassign or delete users first.`
        },
        { status: 400 }
      )
    }

    if (branchWithUsers._count.inventory > 0 || branchWithUsers._count.wasteLogs > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete branch with existing data",
          details: `This branch has ${branchWithUsers._count.inventory} inventory items and ${branchWithUsers._count.wasteLogs} waste logs. Please remove this data first.`
        },
        { status: 400 }
      )
    }

    await prisma.branch.delete({
      where: { id: branchId },
    })

    return NextResponse.json({ 
      message: "Branch deleted successfully" 
    })
  } catch (error) {
    return handleApiError(error)
  }
}