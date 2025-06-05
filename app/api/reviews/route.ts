import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const whereClause = status && status !== "" ? { status: status as any } : {}

    const reviews = await prisma.wasteLogReview.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            role: true,
            branch: {
              select: { name: true },
            },
          },
        },
        approver: {
          select: {
            username: true,
          },
        },
        wasteLog: {
          include: {
            branch: {
              select: { id: true, name: true, location: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("Reviews fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
