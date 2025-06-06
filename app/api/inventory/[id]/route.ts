import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  handleApiError,
  checkRateLimitEnhanced,
  createSecureErrorResponse // Added for CSRF
} from "@/lib/api-utils"
import { verifyCsrfToken } from "@/lib/security"; // Import CSRF verification

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await checkRateLimitEnhanced(request, user, 'api_read');

    const inventoryId = params.id
    if (!inventoryId) {
      return NextResponse.json({ error: "Inventory ID is required" }, { status: 400 })
    }

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

    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    await checkRateLimitEnhanced(request, user, 'api_write');

    const inventoryId = params.id
    if (!inventoryId) {
      return NextResponse.json({ error: "Inventory ID is required" }, { status: 400 })
    }

    // Get and validate request body
    const body = await request.json()
    console.log("Inventory update request:", body)

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

    if (body.itemName !== undefined) {
      if (!body.itemName || body.itemName.trim().length === 0) {
        return NextResponse.json({ error: "Item name cannot be empty" }, { status: 400 })
      }
      updateData.itemName = body.itemName.trim()
    }

    if (body.quantity !== undefined) {
      if (isNaN(Number(body.quantity)) || Number(body.quantity) <= 0) {
        return NextResponse.json({ error: "Valid quantity is required" }, { status: 400 })
      }
      updateData.quantity = Number(body.quantity)
    }

    if (body.unit !== undefined) {
      if (!['kg', 'g', 'pieces', 'liters'].includes(body.unit)) {
        return NextResponse.json({ error: "Valid unit is required" }, { status: 400 })
      }
      updateData.unit = body.unit
    }

    if (body.expiryDate !== undefined) {
      const expiryDate = new Date(body.expiryDate)
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 })
      }
      updateData.expiryDate = expiryDate
    }

    if (body.purchaseCost !== undefined) {
      if (isNaN(Number(body.purchaseCost)) || Number(body.purchaseCost) <= 0) {
        return NextResponse.json({ error: "Valid purchase cost is required" }, { status: 400 })
      }
      updateData.purchaseCost = Number(body.purchaseCost)
    }
    
    // Only super admins can change branch assignment
    if (body.branchId !== undefined && user.role === "SUPER_ADMIN") {
      const branchExists = await prisma.branch.findUnique({
        where: { id: body.branchId }
      })

      if (!branchExists) {
        return NextResponse.json({ error: "Selected branch does not exist" }, { status: 400 })
      }
      updateData.branchId = body.branchId
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

    console.log("Inventory item updated:", updatedItem)

    return NextResponse.json({ 
      inventoryItem: updatedItem,
      message: "Inventory item updated successfully"
    })
  } catch (error) {
    console.error("Error updating inventory item:", error)
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!verifyCsrfToken(request)) {
      // Log the CSRF failure for server-side observability
      console.warn(`CSRF validation failed for request: ${request.method} ${request.url}`);
      return createSecureErrorResponse('Invalid CSRF token', 403);
    }

    await checkRateLimitEnhanced(request, user, 'api_delete');

    const inventoryId = params.id
    if (!inventoryId) {
      return NextResponse.json({ error: "Inventory ID is required" }, { status: 400 })
    }

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

    console.log("Inventory item deleted:", inventoryId)

    return NextResponse.json({ 
      message: "Inventory item deleted successfully" 
    })
  } catch (error) {
    console.error("Error deleting inventory item:", error)
    return handleApiError(error)
  }
}