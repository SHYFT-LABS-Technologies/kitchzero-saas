import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, hashPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { username, password, role, branchId } = await request.json()
    const userId = params.id

    if (!username || !role) {
      return NextResponse.json({ error: "Username and role are required" }, { status: 400 })
    }

    // Check if username already exists (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // If role is BRANCH_ADMIN, branchId is required
    if (role === "BRANCH_ADMIN" && !branchId) {
      return NextResponse.json({ error: "Branch ID is required for Branch Admin" }, { status: 400 })
    }

    const updateData: any = {
      username,
      role,
      branchId: role === "BRANCH_ADMIN" ? branchId : null,
    }

    // Only update password if provided
    if (password) {
      updateData.password = await hashPassword(password)
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

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("User update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const userId = params.id

    // Prevent deleting self
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("User deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
