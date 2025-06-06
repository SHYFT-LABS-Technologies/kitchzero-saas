import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { inventorySchema } from "@/lib/validation"
import { handleApiError } from "@/lib/api-utils"

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

    // Get and validate request body
    const body = await request.json()
    console.log("Inventory creation request:", body)

    // Manual validation to avoid Zod issues
    if (!body.itemName || body.itemName.trim().length === 0) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 })
    }

    if (!body.quantity || isNaN(Number(body.quantity)) || Number(body.quantity) <= 0) {
      return NextResponse.json({ error: "Valid quantity is required" }, { status: 400 })
    }

    if (!body.unit || !['kg', 'g', 'pieces', 'liters'].includes(body.unit)) {
      return NextResponse.json({ error: "Valid unit is required" }, { status: 400 })
    }

    if (!body.expiryDate) {
      return NextResponse.json({ error: "Expiry date is required" }, { status: 400 })
    }

    if (!body.purchaseCost || isNaN(Number(body.purchaseCost)) || Number(body.purchaseCost) <= 0) {
      return NextResponse.json({ error: "Valid purchase cost is required" }, { status: 400 })
    }

    // Validate expiry date
    const expiryDate = new Date(body.expiryDate)
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 })
    }

    // Branch admins can only add to their own branch
    const targetBranchId = user.role === "SUPER_ADMIN" 
      ? body.branchId || user.branchId 
      : user.branchId

    if (!targetBranchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    // Verify branch exists
    const branchExists = await prisma.branch.findUnique({
      where: { id: targetBranchId }
    })

    if (!branchExists) {
      return NextResponse.json({ error: "Selected branch does not exist" }, { status: 400 })
    }

    const item = await prisma.inventory.create({
      data: {
        itemName: body.itemName.trim(),
        quantity: Number(body.quantity),
        unit: body.unit,
        expiryDate: expiryDate,
        purchaseCost: Number(body.purchaseCost),
        branchId: targetBranchId,
      },
      include: {
        branch: {
          select: { id: true, name: true, location: true },
        },
      },
    })

    console.log("Inventory item created:", item)

    return NextResponse.json({ 
      item,
      message: "Inventory item created successfully"
    })
  } catch (error) {
    console.error("Error creating inventory item:", error)
    return handleApiError(error)
  }
}