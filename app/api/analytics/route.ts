import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "30d"

    console.log("📊 Analytics request:", { user: user.username, timeRange })

    // Calculate date range
    const now = new Date()
    const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    console.log("📅 Date range:", { startDate, now, daysBack })

    const whereClause = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }
    const timeWhereClause = {
      ...whereClause,
      createdAt: { gte: startDate },
    }

    console.log("🔍 Where clause:", whereClause)

    // Get current period waste data
    const currentWaste = await prisma.wasteLog.aggregate({
      where: timeWhereClause,
      _sum: {
        quantity: true,
        value: true,
      },
      _count: true,
    })

    console.log("📈 Current waste data:", currentWaste)

    // Get previous period for comparison
    const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const previousWaste = await prisma.wasteLog.aggregate({
      where: {
        ...whereClause,
        createdAt: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
      _sum: {
        quantity: true,
        value: true,
      },
    })

    console.log("📉 Previous waste data:", previousWaste)

    // Calculate percentage changes
    const wasteChange =
      previousWaste._sum.quantity && previousWaste._sum.quantity > 0
        ? (((currentWaste._sum.quantity || 0) - (previousWaste._sum.quantity || 0)) /
            (previousWaste._sum.quantity || 1)) *
          100
        : 0

    const costChange =
      previousWaste._sum.value && previousWaste._sum.value > 0
        ? (((currentWaste._sum.value || 0) - (previousWaste._sum.value || 0)) / (previousWaste._sum.value || 1)) * 100
        : 0

    // Get top 5 wasted items
    const topWastedItems = await prisma.wasteLog.groupBy({
      by: ["itemName"],
      where: timeWhereClause,
      _sum: {
        quantity: true,
        value: true,
      },
      orderBy: {
        _sum: {
          value: "desc",
        },
      },
      take: 5,
    })

    console.log("🏆 Top wasted items:", topWastedItems.length)

    // Get waste over time using a simpler approach
    const wasteOverTimeRaw = await prisma.wasteLog.findMany({
      where: timeWhereClause,
      select: {
        createdAt: true,
        quantity: true,
        value: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Group by date
    const wasteByDate = new Map<string, { quantity: number; value: number }>()

    wasteOverTimeRaw.forEach((log) => {
      const dateKey = log.createdAt.toISOString().split("T")[0]
      const existing = wasteByDate.get(dateKey) || { quantity: 0, value: 0 }
      wasteByDate.set(dateKey, {
        quantity: existing.quantity + (log.quantity || 0),
        value: existing.value + (log.value || 0),
      })
    })

    const wasteOverTime = Array.from(wasteByDate.entries()).map(([date, data]) => ({
      date,
      quantity: Number(data.quantity.toFixed(1)),
      value: Number(data.value.toFixed(0)),
    }))

    console.log("📊 Waste over time:", wasteOverTime.length, "data points")

    // Get inventory stats
    const inventoryStats = await prisma.inventory.aggregate({
      where: whereClause,
      _count: true,
    })

    // Get expiring items (within 7 days)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const expiringItems = await prisma.inventory.count({
      where: {
        ...whereClause,
        expiryDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
    })

    console.log("📦 Inventory stats:", { total: inventoryStats._count, expiring: expiringItems })

    // Get branch and user counts (Super Admin only)
    let branchCount = 0
    let userCount = 0
    if (user.role === "SUPER_ADMIN") {
      branchCount = await prisma.branch.count()
      userCount = await prisma.user.count()
      console.log("👥 Admin stats:", { branches: branchCount, users: userCount })
    }

    // Calculate efficiency score based on waste reduction trend
    const efficiencyScore = Math.max(0, Math.min(100, 100 - Math.abs(wasteChange)))

    // Calculate estimated cost savings (based on waste reduction)
    const costSavings = wasteChange < 0 ? Math.abs(wasteChange / 100) * (currentWaste._sum.value || 0) : 0

    const analytics = {
      // Current period totals
      totalWasteKg: Number((currentWaste._sum.quantity || 0).toFixed(1)),
      totalWasteLKR: Number((currentWaste._sum.value || 0).toFixed(0)),
      totalWasteEntries: currentWaste._count || 0,

      // Percentage changes
      wasteChange: Number(wasteChange.toFixed(1)),
      costChange: Number(costChange.toFixed(1)),

      // Calculated metrics
      efficiencyScore: Number(efficiencyScore.toFixed(1)),
      costSavings: Number(costSavings.toFixed(0)),

      // Inventory data
      totalInventoryItems: inventoryStats._count || 0,
      expiringItems,

      // Admin-only data
      totalBranches: branchCount,
      totalUsers: userCount,

      // Chart data
      topWastedItems: topWastedItems.map((item) => ({
        itemName: item.itemName,
        totalQuantity: Number((item._sum.quantity || 0).toFixed(1)),
        totalValue: Number((item._sum.value || 0).toFixed(0)),
      })),

      wasteOverTime,
    }

    console.log("✅ Analytics response:", {
      totalWasteKg: analytics.totalWasteKg,
      totalWasteLKR: analytics.totalWasteLKR,
      topItemsCount: analytics.topWastedItems.length,
      timeDataPoints: analytics.wasteOverTime.length,
    })

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("❌ Analytics fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
