import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateWasteLogSchema, deleteWithReasonSchema } from "@/lib/validation"
import { 
  handleApiError, 
  validateAndParseBody, 
  validateUrlParam,
  checkRateLimitEnhanced,
  checkPermission 
} from "@/lib/api-utils"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'api_read');

    // Validate ID parameter
    const wasteLogId = validateUrlParam("wasteLogId", params.id)

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
      },
    })

    if (!wasteLog) {
      return NextResponse.json({ error: "Waste log not found" }, { status: 404 })
    }

    return NextResponse.json({ wasteLog })
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

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'api_write');

    // Validate ID parameter
    const wasteLogId = validateUrlParam("wasteLogId", params.id)

    // Validate request body
    const validatedData = await validateAndParseBody(request, updateWasteLogSchema)

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

    // Parse the waste date if provided
    const parsedWasteDate = validatedData.wasteDate 
      ? new Date(validatedData.wasteDate) 
      : existingWasteLog.createdAt

    // Validate date is not in future
    if (parsedWasteDate > new Date()) {
      return NextResponse.json(
        { error: "Waste date cannot be in the future" },
        { status: 400 }
      )
    }

    // Super admins can update directly
    if (user.role === "SUPER_ADMIN") {
      // Build update data object, only including provided fields
      const updateData: any = {
        updatedAt: new Date(),
      }

      if (validatedData.itemName !== undefined) updateData.itemName = validatedData.itemName
      if (validatedData.quantity !== undefined) updateData.quantity = validatedData.quantity
      if (validatedData.unit !== undefined) updateData.unit = validatedData.unit
      if (validatedData.value !== undefined) updateData.value = validatedData.value
      if (validatedData.reason !== undefined) updateData.reason = validatedData.reason
      if (validatedData.photo !== undefined) updateData.photo = validatedData.photo || null
      if (validatedData.branchId !== undefined) updateData.branchId = validatedData.branchId
      if (validatedData.wasteDate !== undefined) updateData.createdAt = parsedWasteDate

      const updatedWasteLog = await prisma.wasteLog.update({
        where: { id: wasteLogId },
        data: updateData,
        include: {
          branch: {
            select: { id: true, name: true, location: true },
          },
        },
      })

      return NextResponse.json({ 
        wasteLog: updatedWasteLog,
        message: "Waste log updated successfully"
      })
    }

    // Branch admins need approval
    const review = await prisma.wasteLogReview.create({
      data: {
        wasteLogId,
        action: "UPDATE",
        originalData: {
          ...existingWasteLog,
          wasteDate: existingWasteLog.createdAt.toISOString().split("T")[0],
        },
        newData: {
          ...validatedData,
          wasteDate: parsedWasteDate.toISOString().split("T")[0],
        },
        reason: "Update request",
        createdBy: user.id,
        status: "PENDING"
      },
    })

    return NextResponse.json({
      message: "Update request submitted for approval",
      reviewId: review.id,
      requiresApproval: true,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'api_delete');

    // Validate ID parameter
    const wasteLogId = validateUrlParam("wasteLogId", params.id)

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
      return NextResponse.json({ 
        message: "Waste log deleted successfully" 
      })
    }

    // Branch admins need approval and must provide reason
    const { reason } = await validateAndParseBody(request, deleteWithReasonSchema)

    const review = await prisma.wasteLogReview.create({
      data: {
        wasteLogId,
        action: "DELETE",
        originalData: {
          ...existingWasteLog,
          date: existingWasteLog.createdAt.toISOString().split('T')[0]
        },
        reason,
        createdBy: user.id,
        status: "PENDING"
      },
    })

    return NextResponse.json({
      message: "Delete request submitted for approval",
      reviewId: review.id,
      requiresApproval: true,
    })
  } catch (error) {
    return handleApiError(error)
  }
}