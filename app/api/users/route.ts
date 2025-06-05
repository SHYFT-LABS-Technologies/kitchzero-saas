import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, hashPassword } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

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
    console.error("Users fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { username, password, role, branchId } = await request.json()

    if (!username || !password || !role) {
      return NextResponse.json({ error: "Username, password, and role are required" }, { status: 400 })
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    // If role is BRANCH_ADMIN, branchId is required
    if (role === "BRANCH_ADMIN" && !branchId) {
      return NextResponse.json({ error: "Branch ID is required for Branch Admin" }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
        branchId: role === "BRANCH_ADMIN" ? branchId : null,
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

    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error("User creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
