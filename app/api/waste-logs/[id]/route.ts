import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wasteLogId = params.id
    const whereClause = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }

    const wasteLog = await prisma.wasteLog.findFirst({
      where: {
        id: wasteLogId,
        ...whereClause,
      },
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
        inventory: {
          select: { id: true, itemName: true },
        },
      },
    })

    if (!wasteLog) {
      return NextResponse.json({ error: "Waste log not found" }, { status: 404 })
    }

    return NextResponse.json({ wasteLog })
  } catch (error) {
    console.error("Waste log fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wasteLogId = params.id
    const updateData = await request.json()

    // Get the existing waste log
    const existingWasteLog = await prisma.wasteLog.findFirst({
      where: {
        id: wasteLogId,
        ...(user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }),
      },
    })

    if (!existingWasteLog) {
      return NextResponse.json({ error: "Waste log not found" }, { status: 404 })
    }

    // Parse the waste date
    const parsedWasteDate = updateData.wasteDate ? new Date(updateData.wasteDate) : existingWasteLog.createdAt

    // Validate that the date is not in the future
    if (parsedWasteDate > new Date()) {
      return NextResponse.json({ error: "Waste date cannot be in the future" }, { status: 400 })
    }

    // Super admins can update directly
    if (user.role === "SUPER_ADMIN") {
      const updatedWasteLog = await prisma.wasteLog.update({
        where: { id: wasteLogId },
        data: {
          itemName: updateData.itemName,
          quantity: Number.parseFloat(updateData.quantity),
          unit: updateData.unit,
          value: Number.parseFloat(updateData.value),
          reason: updateData.reason,
          photo: updateData.photo,
          branchId: updateData.branchId || existingWasteLog.branchId,
          createdAt: parsedWasteDate, // Update the waste date
          updatedAt: new Date(), // Keep current timestamp for when it was last modified
        },
        include: {
          branch: {
            select: { id: true, name: true, location: true },
          },
        },
      })

      return NextResponse.json({ wasteLog: updatedWasteLog })
    }

    // Branch admins need approval - include the new date in the review data
    const review = await prisma.wasteLogReview.create({
      data: {
        wasteLogId,
        action: "UPDATE",
        originalData: {
          ...existingWasteLog,
          wasteDate: existingWasteLog.createdAt.toISOString().split("T")[0],
        },
        newData: {
          ...updateData,
          wasteDate: parsedWasteDate.toISOString().split("T")[0],
        },
        reason: updateData.reason || "Update request",
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      message: "Update request submitted for approval",
      reviewId: review.id,
      requiresApproval: true,
    })
  } catch (error) {
    console.error("Waste log update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wasteLogId = params.id

    // Get the existing waste log
    const existingWasteLog = await prisma.wasteLog.findFirst({
      where: {
        id: wasteLogId,
        ...(user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }),
      },
    })

    if (!existingWasteLog) {
      return NextResponse.json({ error: "Waste log not found" }, { status: 404 })
    }

    // Super admins can delete directly
    if (user.role === "SUPER_ADMIN") {
      await prisma.wasteLog.delete({
        where: { id: wasteLogId },
      })

      return NextResponse.json({ message: "Waste log deleted successfully" })
    }

    // Branch admins need approval
    const { reason } = await request.json()

    const review = await prisma.wasteLogReview.create({
      data: {
        wasteLogId,
        action: "DELETE",
        originalData: {
          ...existingWasteLog,
          date: existingWasteLog.createdAt.toISOString().split('T')[0]
        },
        reason: reason || "Delete request",
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      message: "Delete request submitted for approval",
      reviewId: review.id,
      requiresApproval: true,
    })
  } catch (error) {
    console.error("Waste log deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}