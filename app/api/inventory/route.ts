import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inventorySchema } from "@/lib/validation"
import { handleApiError, validateAndParseBody } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const whereClause = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }

    const inventory = await prisma.inventory.findMany({
      where: whereClause,
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ inventory })
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
    const validatedData = await validateAndParseBody(request, inventorySchema)

    // Branch admins can only add to their own branch
    const targetBranchId = user.role === "SUPER_ADMIN" 
      ? validatedData.branchId || user.branchId 
      : user.branchId

    if (!targetBranchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    const item = await prisma.inventory.create({
      data: {
        itemName: validatedData.itemName,
        quantity: validatedData.quantity,
        unit: validatedData.unit,
        expiryDate: new Date(validatedData.expiryDate),
        purchaseCost: validatedData.purchaseCost,
        branchId: targetBranchId,
      },
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    return NextResponse.json({ item })
  } catch (error) {
    return handleApiError(error)
  }
}