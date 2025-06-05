import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
    console.error("Branches fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { name, location } = await request.json()

    if (!name || !location) {
      return NextResponse.json({ error: "Name and location are required" }, { status: 400 })
    }

    const branch = await prisma.branch.create({
      data: { name, location },
    })

    return NextResponse.json({ branch })
  } catch (error) {
    console.error("Branch creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
