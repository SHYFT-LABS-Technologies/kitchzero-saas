import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const whereClause = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }

    const wasteLogs = await prisma.wasteLog.findMany({
      where: whereClause,
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ wasteLogs })
  } catch (error) {
    console.error("Waste logs fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemName, quantity, unit, value, reason, photo, branchId } = await request.json()

    // Branch admins can only add to their own branch
    const targetBranchId = user.role === "SUPER_ADMIN" ? branchId : user.branchId

    if (!targetBranchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    // Super admins can create directly
    if (user.role === "SUPER_ADMIN") {
      const wasteLog = await prisma.wasteLog.create({
        data: {
          itemName,
          quantity: Number.parseFloat(quantity),
          unit,
          value: Number.parseFloat(value),
          reason,
          photo,
          branchId: targetBranchId,
        },
        include: {
          branch: {
            select: { id: true, name: true, location: true },
          },
        },
      })

      return NextResponse.json({ wasteLog })
    }

    // Branch admins need approval for creation
    const review = await prisma.wasteLogReview.create({
      data: {
        action: "CREATE",
        newData: {
          itemName,
          quantity: Number.parseFloat(quantity),
          unit,
          value: Number.parseFloat(value),
          reason,
          photo,
          branchId: targetBranchId,
        },
        reason: "New waste log entry",
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      message: "Waste log submitted for approval",
      reviewId: review.id,
      requiresApproval: true,
    })
  } catch (error) {
    console.error("Waste log creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
