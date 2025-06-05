import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const review = await prisma.wasteLogReview.findUnique({
      where: { id: params.id },
      include: {
        wasteLog: {
          include: {
            branch: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            role: true,
            branch: {
              select: {
                name: true,
              },
            },
          },
        },
        approver: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Check if user has access to this review
    if (user.role !== "SUPER_ADMIN" && review.creator.id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error("Error fetching review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only super admins can approve/reject reviews
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await request.json()
    const { action, reviewNotes } = data

    if (!action || !reviewNotes) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // Get the review
    const review = await prisma.wasteLogReview.findUnique({
      where: { id: params.id },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    // Update the review status
    const updatedReview = await prisma.wasteLogReview.update({
      where: { id: params.id },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        approvedBy: user.id,
        reviewNotes,
        reviewedAt: new Date(),
      },
    })

    // If approved, apply the changes
    if (action === "approve") {
      await applyReviewChanges(updatedReview)
    }

    return NextResponse.json({ review: updatedReview })
  } catch (error) {
    console.error("Error updating review:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function applyReviewChanges(review: any) {
  try {
    switch (review.action) {
      case "CREATE":
        if (review.newData) {
          const wasteDate = review.newData.wasteDate ? new Date(review.newData.wasteDate) : new Date()
          
          await prisma.wasteLog.create({
            data: {
              itemName: review.newData.itemName,
              quantity: review.newData.quantity,
              unit: review.newData.unit,
              value: review.newData.value,
              reason: review.newData.reason,
              branchId: review.newData.branchId,
              photo: review.newData.photo,
              createdAt: wasteDate,
              updatedAt: wasteDate,
            },
          })
        }
        break

      case "UPDATE":
        if (review.wasteLogId && review.newData) {
          const wasteDate = review.newData.wasteDate ? new Date(review.newData.wasteDate) : new Date()
          
          await prisma.wasteLog.update({
            where: { id: review.wasteLogId },
            data: {
              itemName: review.newData.itemName,
              quantity: review.newData.quantity,
              unit: review.newData.unit,
              value: review.newData.value,
              reason: review.newData.reason,
              photo: review.newData.photo,
              createdAt: wasteDate, // Update the waste occurrence date
              updatedAt: new Date(), // Keep current timestamp for modification time
            },
          })
        }
        break

      case "DELETE":
        if (review.wasteLogId) {
          await prisma.wasteLog.delete({
            where: { id: review.wasteLogId },
          })
        }
        break
    }
  } catch (error) {
    console.error("Error applying review changes:", error)
    throw error
  }
}