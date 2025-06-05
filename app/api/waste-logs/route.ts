import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { wasteLogSchema } from "@/lib/validation"
import { handleApiError, validateAndParseBody } from "@/lib/api-utils"

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
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate request body
    const validatedData = await validateAndParseBody(request, wasteLogSchema)

    // Branch admins can only add to their own branch
    const targetBranchId = user.role === "SUPER_ADMIN" 
      ? validatedData.branchId || user.branchId 
      : user.branchId

    if (!targetBranchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    // Parse the waste date or use current date as fallback
    const parsedWasteDate = validatedData.wasteDate 
      ? new Date(validatedData.wasteDate) 
      : new Date()

    // Create waste log with validated data
    const wasteLog = await prisma.wasteLog.create({
      data: {
        itemName: validatedData.itemName,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        value: validatedData.value,
        reason: validatedData.reason,
        photo: validatedData.photo || null,
        branchId: targetBranchId,
        createdAt: parsedWasteDate,
        updatedAt: parsedWasteDate,
      },
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    return NextResponse.json({ wasteLog })
  } catch (error) {
    return handleApiError(error)
  }
}