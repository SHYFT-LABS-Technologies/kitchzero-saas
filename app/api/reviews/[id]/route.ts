import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const reviewId = params.id
    const { action, reviewNotes } = await request.json() // action: "approve" | "reject"

    const review = await prisma.wasteLogReview.findUnique({
      where: { id: reviewId },
      include: { wasteLog: true },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (review.status !== "PENDING") {
      return NextResponse.json({ error: "Review already processed" }, { status: 400 })
    }

    const updatedReview = await prisma.wasteLogReview.update({
      where: { id: reviewId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        approvedBy: user.id,
        reviewNotes,
        reviewedAt: new Date(),
      },
    })

    // If approved, apply the changes
    if (action === "approve") {
      if (review.action === "CREATE") {
        const newData = review.newData as any
        await prisma.wasteLog.create({
          data: {
            itemName: newData.itemName,
            quantity: Number.parseFloat(newData.quantity),
            unit: newData.unit,
            value: Number.parseFloat(newData.value),
            reason: newData.reason,
            photo: newData.photo,
            branchId: newData.branchId,
          },
        })
      } else if (review.action === "UPDATE" && review.wasteLogId) {
        const newData = review.newData as any
        await prisma.wasteLog.update({
          where: { id: review.wasteLogId },
          data: {
            itemName: newData.itemName,
            quantity: Number.parseFloat(newData.quantity),
            unit: newData.unit,
            value: Number.parseFloat(newData.value),
            reason: newData.reason,
            photo: newData.photo,
          },
        })
      } else if (review.action === "DELETE" && review.wasteLogId) {
        await prisma.wasteLog.delete({
          where: { id: review.wasteLogId },
        })
      }
    }

    return NextResponse.json({ review: updatedReview })
  } catch (error) {
    console.error("Review processing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
