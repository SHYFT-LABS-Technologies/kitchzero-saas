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
    const timeRange = searchParams.get("timeRange") || "today"

    console.log("📊 Analytics request:", { user: user.username, timeRange })

    // Calculate date range
    const now = new Date()
    let startDate: Date
    let daysBack: number

    switch (timeRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        daysBack = 1
        break
      case "7d":
        daysBack = 7
        startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
        break
      case "30d":
        daysBack = 30
        startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
        break
      case "90d":
        daysBack = 90
        startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        daysBack = 1
    }

    console.log("📅 Date range:", { startDate, now, daysBack, timeRange })

    const whereClause = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }
    const timeWhereClause = {
      ...whereClause,
      createdAt: { gte: startDate, lte: now },
    }

    console.log("🔍 Where clause:", whereClause)

    // Get current period waste data with proper number conversion
    const currentWasteRaw = await prisma.wasteLog.findMany({
      where: timeWhereClause,
      select: {
        quantity: true,
        value: true,
      },
    })

    const currentWaste = {
      totalQuantity: currentWasteRaw.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0),
      totalValue: currentWasteRaw.reduce((sum, log) => sum + (Number(log.value) || 0), 0),
      count: currentWasteRaw.length,
    }

    console.log("📈 Current waste data:", currentWaste)

    // Get previous period for comparison
    const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const previousWasteRaw = await prisma.wasteLog.findMany({
      where: {
        ...whereClause,
        createdAt: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
      select: {
        quantity: true,
        value: true,
      },
    })

    const previousWaste = {
      totalQuantity: previousWasteRaw.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0),
      totalValue: previousWasteRaw.reduce((sum, log) => sum + (Number(log.value) || 0), 0),
    }

    console.log("📉 Previous waste data:", previousWaste)

    // Calculate percentage changes
    const wasteChange =
      previousWaste.totalQuantity > 0
        ? ((currentWaste.totalQuantity - previousWaste.totalQuantity) / previousWaste.totalQuantity) * 100
        : currentWaste.totalQuantity > 0
          ? 100
          : 0

    const costChange =
      previousWaste.totalValue > 0
        ? ((currentWaste.totalValue - previousWaste.totalValue) / previousWaste.totalValue) * 100
        : currentWaste.totalValue > 0
          ? 100
          : 0

    // Get top 5 wasted items with proper aggregation
    const topWastedItemsRaw = await prisma.wasteLog.findMany({
      where: timeWhereClause,
      select: {
        itemName: true,
        quantity: true,
        value: true,
      },
    })

    // Group by item name manually
    const itemGroups = new Map<string, { totalQuantity: number; totalValue: number }>()

    topWastedItemsRaw.forEach((log) => {
      const existing = itemGroups.get(log.itemName) || { totalQuantity: 0, totalValue: 0 }
      itemGroups.set(log.itemName, {
        totalQuantity: existing.totalQuantity + (Number(log.quantity) || 0),
        totalValue: existing.totalValue + (Number(log.value) || 0),
      })
    })

    const topWastedItems = Array.from(itemGroups.entries())
      .map(([itemName, data]) => ({
        itemName,
        totalQuantity: Number(data.totalQuantity.toFixed(1)),
        totalValue: Number(data.totalValue.toFixed(0)),
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)

    console.log("🏆 Top wasted items:", topWastedItems.length)

    // Get waste over time with proper date grouping
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

    // Group by date or hour depending on time range
    const wasteByTime = new Map<string, { quantity: number; value: number }>()

    // Generate time slots first
    const timeSlots: string[] = []
    if (timeRange === "today") {
      // Generate hourly slots for today
      for (let hour = 0; hour < 24; hour++) {
        const slotDate = new Date(startDate)
        slotDate.setHours(hour, 0, 0, 0)
        timeSlots.push(slotDate.toISOString())
      }
    } else {
      // Generate daily slots
      for (let i = 0; i < daysBack; i++) {
        const slotDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        timeSlots.push(slotDate.toISOString().split("T")[0])
      }
    }

    // Initialize all slots with zero values
    timeSlots.forEach((slot) => {
      wasteByTime.set(slot, { quantity: 0, value: 0 })
    })

    // Fill in actual data
    wasteOverTimeRaw.forEach((log) => {
      let timeKey: string
      if (timeRange === "today") {
        // Group by hour for today
        const logDate = new Date(log.createdAt)
        logDate.setMinutes(0, 0, 0)
        timeKey = logDate.toISOString()
      } else {
        // Group by date for other ranges
        timeKey = log.createdAt.toISOString().split("T")[0]
      }

      const existing = wasteByTime.get(timeKey)
      if (existing) {
        wasteByTime.set(timeKey, {
          quantity: existing.quantity + (Number(log.quantity) || 0),
          value: existing.value + (Number(log.value) || 0),
        })
      }
    })

    const wasteOverTime = Array.from(wasteByTime.entries())
      .map(([time, data]) => ({
        date: time,
        quantity: Number(data.quantity.toFixed(1)),
        value: Number(data.value.toFixed(0)),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    console.log("📊 Waste over time:", wasteOverTime.length, "data points")

    // Get inventory stats
    const inventoryCount = await prisma.inventory.count({
      where: whereClause,
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

    console.log("📦 Inventory stats:", { total: inventoryCount, expiring: expiringItems })

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
    const costSavings = wasteChange < 0 ? Math.abs(wasteChange / 100) * currentWaste.totalValue : 0

    const analytics = {
      // Current period totals
      totalWasteKg: Number(currentWaste.totalQuantity.toFixed(1)),
      totalWasteLKR: Number(currentWaste.totalValue.toFixed(0)),
      totalWasteEntries: currentWaste.count,

      // Percentage changes
      wasteChange: Number(wasteChange.toFixed(1)),
      costChange: Number(costChange.toFixed(1)),

      // Calculated metrics
      efficiencyScore: Number(efficiencyScore.toFixed(1)),
      costSavings: Number(costSavings.toFixed(0)),

      // Inventory data
      totalInventoryItems: inventoryCount,
      expiringItems,

      // Admin-only data
      totalBranches: branchCount,
      totalUsers: userCount,

      // Chart data
      topWastedItems,
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
