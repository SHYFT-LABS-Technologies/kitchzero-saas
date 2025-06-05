import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { name, location } = await request.json()
    const branchId = params.id

    if (!name || !location) {
      return NextResponse.json({ error: "Name and location are required" }, { status: 400 })
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

    return NextResponse.json({ branch: updatedBranch })
  } catch (error) {
    console.error("Branch update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const branchId = params.id

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
        { error: "Cannot delete branch with assigned users. Please reassign or delete users first." },
        { status: 400 },
      )
    }

    if (branchWithUsers._count.inventory > 0 || branchWithUsers._count.wasteLogs > 0) {
      return NextResponse.json(
        { error: "Cannot delete branch with existing inventory or waste logs." },
        { status: 400 },
      )
    }

    await prisma.branch.delete({
      where: { id: branchId },
    })

    return NextResponse.json({ message: "Branch deleted successfully" })
  } catch (error) {
    console.error("Branch deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
