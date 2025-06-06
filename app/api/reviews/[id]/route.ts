import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"
import { reviewActionSchema } from "@/lib/validation"
import { 
  handleApiError, 
  validateAndParseBody, 
  validateUrlParam,
  checkRateLimitEnhanced,
  checkPermission,
  createSecureErrorResponse // Added for CSRF
} from "@/lib/api-utils"
import { verifyCsrfToken } from "@/lib/security"; // Import CSRF verification

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'api_read');

    // Validate ID parameter
    const reviewId = validateUrlParam("reviewId", params.id)

    const review = await prisma.wasteLogReview.findUnique({
      where: { id: reviewId },
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
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only super admins can approve/reject reviews
    if (!checkPermission(user.role, "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'api_write');

    // Validate ID parameter
    const reviewId = validateUrlParam("reviewId", params.id)

    // Validate request body
    const { action, reviewNotes } = await validateAndParseBody(request, reviewActionSchema)

    // Get the review
    const review = await prisma.wasteLogReview.findUnique({
      where: { id: reviewId },
    })

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (review.status !== "PENDING") {
     return NextResponse.json(
       { error: "Review has already been processed" },
       { status: 400 }
     )
   }

   // Update the review status
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
     try {
       await applyReviewChanges(updatedReview)
     } catch (applyError) {
       console.error("Error applying review changes:", applyError)
       
       // Revert the review status if applying changes failed
       await prisma.wasteLogReview.update({
         where: { id: reviewId },
         data: {
           status: "PENDING",
           approvedBy: null,
           reviewNotes: null,
           reviewedAt: null,
         },
       })
       
       return NextResponse.json(
         { error: "Failed to apply changes. Review reverted to pending status." },
         { status: 500 }
       )
     }
   }

   return NextResponse.json({ 
     review: updatedReview,
     message: `Review ${action}d successfully`
   })
 } catch (error) {
   return handleApiError(error)
 }
}

// Helper function to apply review changes
async function applyReviewChanges(review: any) {
 try {
   switch (review.action) {
     case "CREATE":
       if (review.newData) {
         const wasteDate = review.newData.wasteDate ? new Date(review.newData.wasteDate) : new Date()
         
         // Validate the new data before creating
         if (!review.newData.itemName || !review.newData.quantity || !review.newData.value) {
           throw new Error("Invalid data for waste log creation")
         }
         
         await prisma.wasteLog.create({
           data: {
             itemName: review.newData.itemName,
             quantity: Number(review.newData.quantity),
             unit: review.newData.unit || 'kg',
             value: Number(review.newData.value),
             reason: review.newData.reason || 'SPOILAGE',
             branchId: review.newData.branchId,
             photo: review.newData.photo || null,
             createdAt: wasteDate,
             updatedAt: wasteDate,
           },
         })
       }
       break

     case "UPDATE":
       if (review.wasteLogId && review.newData) {
         const wasteDate = review.newData.wasteDate ? new Date(review.newData.wasteDate) : new Date()
         
         // Check if the waste log still exists
         const existingLog = await prisma.wasteLog.findUnique({
           where: { id: review.wasteLogId }
         })
         
         if (!existingLog) {
           throw new Error("Waste log no longer exists")
         }
         
         // Build update data, only including fields that are provided
         const updateData: any = {
           updatedAt: new Date()
         }
         
         if (review.newData.itemName !== undefined) updateData.itemName = review.newData.itemName
         if (review.newData.quantity !== undefined) updateData.quantity = Number(review.newData.quantity)
         if (review.newData.unit !== undefined) updateData.unit = review.newData.unit
         if (review.newData.value !== undefined) updateData.value = Number(review.newData.value)
         if (review.newData.reason !== undefined) updateData.reason = review.newData.reason
         if (review.newData.photo !== undefined) updateData.photo = review.newData.photo
         if (review.newData.wasteDate !== undefined) updateData.createdAt = wasteDate
         
         await prisma.wasteLog.update({
           where: { id: review.wasteLogId },
           data: updateData,
         })
       }
       break

     case "DELETE":
       if (review.wasteLogId) {
         // Check if the waste log still exists
         const existingLog = await prisma.wasteLog.findUnique({
           where: { id: review.wasteLogId }
         })
         
         if (!existingLog) {
           // Already deleted, consider this a success
           console.warn("Waste log already deleted:", review.wasteLogId)
           return
         }
         
         await prisma.wasteLog.delete({
           where: { id: review.wasteLogId },
         })
       }
       break

     default:
       throw new Error(`Unknown review action: ${review.action}`)
   }
 } catch (error) {
   console.error("Error applying review changes:", error)
   throw error
 }
}