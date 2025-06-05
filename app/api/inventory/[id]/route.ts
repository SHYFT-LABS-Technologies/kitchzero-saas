import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const inventoryId = params.id
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
    console.error("Inventory item fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const inventoryId = params.id
    const updateData = await request.json()

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

    const updatedItem = await prisma.inventory.update({
      where: { id: inventoryId },
      data: {
        itemName: updateData.itemName,
        quantity: Number.parseFloat(updateData.quantity),
        unit: updateData.unit,
        expiryDate: new Date(updateData.expiryDate),
        purchaseCost: Number.parseFloat(updateData.purchaseCost),
        branchId: user.role === "SUPER_ADMIN" ? updateData.branchId || existingItem.branchId : existingItem.branchId,
      },
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    return NextResponse.json({ inventoryItem: updatedItem })
  } catch (error) {
    console.error("Inventory item update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const inventoryId = params.id

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

    return NextResponse.json({ message: "Inventory item deleted successfully" })
  } catch (error) {
    console.error("Inventory item deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
