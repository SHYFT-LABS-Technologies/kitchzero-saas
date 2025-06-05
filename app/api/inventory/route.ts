import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    console.error("Inventory fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { itemName, quantity, unit, expiryDate, purchaseCost, branchId } = await request.json()

    // Branch admins can only add to their own branch
    const targetBranchId = user.role === "SUPER_ADMIN" ? branchId : user.branchId

    if (!targetBranchId) {
      return NextResponse.json({ error: "Branch ID is required" }, { status: 400 })
    }

    const item = await prisma.inventory.create({
      data: {
        itemName,
        quantity: Number.parseFloat(quantity),
        unit,
        expiryDate: new Date(expiryDate),
        purchaseCost: Number.parseFloat(purchaseCost),
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
    console.error("Inventory creation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
