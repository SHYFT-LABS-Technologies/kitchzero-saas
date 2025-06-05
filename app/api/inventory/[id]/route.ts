import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateInventorySchema } from "@/lib/validation"
import { 
  handleApiError, 
  validateAndParseBody, 
  validateUrlParam,
  checkRateLimit 
} from "@/lib/api-utils"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    const clientIp = request.ip || 'unknown'
    if (!checkRateLimit(`inventory-get:${clientIp}`, 60, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const inventoryId = validateUrlParam("inventoryId", params.id)

    const whereClause = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }

    const inventoryItem = await prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        ...whereClause,
      },
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    if (!inventoryItem) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    return NextResponse.json({ inventoryItem })
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
    const clientIp = request.ip || 'unknown'
    if (!checkRateLimit(`inventory-update:${clientIp}`, 30, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const inventoryId = validateUrlParam("inventoryId", params.id)

    // Validate request body
    const validatedData = await validateAndParseBody(request, updateInventorySchema)

    // Check if item exists and user has permission
    const existingItem = await prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        ...(user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }),
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    // Build update data object, only including provided fields
    const updateData: any = {}

    if (validatedData.itemName !== undefined) updateData.itemName = validatedData.itemName
    if (validatedData.quantity !== undefined) updateData.quantity = validatedData.quantity
    if (validatedData.unit !== undefined) updateData.unit = validatedData.unit
    if (validatedData.expiryDate !== undefined) updateData.expiryDate = new Date(validatedData.expiryDate)
    if (validatedData.purchaseCost !== undefined) updateData.purchaseCost = validatedData.purchaseCost
    
    // Only super admins can change branch assignment
    if (validatedData.branchId !== undefined && user.role === "SUPER_ADMIN") {
      updateData.branchId = validatedData.branchId
    }

    const updatedItem = await prisma.inventory.update({
      where: { id: inventoryId },
      data: updateData,
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    return NextResponse.json({ 
      inventoryItem: updatedItem,
      message: "Inventory item updated successfully"
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
    const clientIp = request.ip || 'unknown'
    if (!checkRateLimit(`inventory-delete:${clientIp}`, 20, 60000)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      )
    }

    // Validate ID parameter
    const inventoryId = validateUrlParam("inventoryId", params.id)

    // Check if item exists and user has permission
    const existingItem = await prisma.inventory.findFirst({
      where: {
        id: inventoryId,
        ...(user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }),
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    await prisma.inventory.delete({
      where: { id: inventoryId },
    })

    return NextResponse.json({ 
      message: "Inventory item deleted successfully" 
    })
  } catch (error) {
    return handleApiError(error)
  }
}