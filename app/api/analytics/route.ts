import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { analyticsQuerySchema } from "@/lib/validation"
import { handleApiError, validateQueryParams, checkRateLimitEnhanced } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limiting
    await checkRateLimitEnhanced(request, user, 'analytics');

    // Validate query parameters using utils
    const { searchParams } = new URL(request.url)
    const { timeRange } = validateQueryParams(analyticsQuerySchema, searchParams)

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

    const whereClause = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId }
    const timeWhereClause = {
      ...whereClause,
      createdAt: { gte: startDate, lte: now },
    }

    // Get current period waste data with validation
    const currentWasteRaw = await prisma.wasteLog.findMany({
      where: timeWhereClause,
      select: {
        quantity: true,
        value: true,
      },
    })

    const currentWaste = {
      totalQuantity: currentWasteRaw.reduce((sum, log) => {
        const quantity = Number(log.quantity)
        return sum + (isNaN(quantity) || quantity < 0 ? 0 : quantity)
      }, 0),
      totalValue: currentWasteRaw.reduce((sum, log) => {
        const value = Number(log.value)
        return sum + (isNaN(value) || value < 0 ? 0 : value)
      }, 0),
      count: currentWasteRaw.length,
    }

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
      totalQuantity: previousWasteRaw.reduce((sum, log) => {
        const quantity = Number(log.quantity)
        return sum + (isNaN(quantity) || quantity < 0 ? 0 : quantity)
      }, 0),
      totalValue: previousWasteRaw.reduce((sum, log) => {
        const value = Number(log.value)
        return sum + (isNaN(value) || value < 0 ? 0 : value)
      }, 0),
    }

    // Calculate percentage changes with safety checks
    const wasteChange = previousWaste.totalQuantity > 0
      ? ((currentWaste.totalQuantity - previousWaste.totalQuantity) / previousWaste.totalQuantity) * 100
      : currentWaste.totalQuantity > 0 ? 100 : 0

    const costChange = previousWaste.totalValue > 0
      ? ((currentWaste.totalValue - previousWaste.totalValue) / previousWaste.totalValue) * 100
      : currentWaste.totalValue > 0 ? 100 : 0

    // Get top 5 wasted items with proper aggregation
    const topWastedItemsRaw = await prisma.wasteLog.findMany({
      where: timeWhereClause,
      select: {
        itemName: true,
        quantity: true,
        value: true,
      },
    })

    // Group by item name with validation
    const itemGroups = new Map<string, { totalQuantity: number; totalValue: number }>()

    topWastedItemsRaw.forEach((log) => {
      const itemName = typeof log.itemName === 'string' && log.itemName.trim() 
        ? log.itemName.trim() 
        : 'Unknown Item'
      
      const quantity = Number(log.quantity)
      const value = Number(log.value)
      
      if (!isNaN(quantity) && !isNaN(value) && quantity >= 0 && value >= 0) {
        const existing = itemGroups.get(itemName) || { totalQuantity: 0, totalValue: 0 }
        itemGroups.set(itemName, {
          totalQuantity: existing.totalQuantity + quantity,
          totalValue: existing.totalValue + value,
        })
      }
    })

    const topWastedItems = Array.from(itemGroups.entries())
      .map(([itemName, data]) => ({
        itemName,
        totalQuantity: Number(data.totalQuantity.toFixed(1)),
        totalValue: Number(data.totalValue.toFixed(0)),
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)

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

    // Generate time slots and process data
    const wasteByTime = new Map<string, { quantity: number; value: number }>()
    const timeSlots: string[] = []

    if (timeRange === "today") {
      for (let hour = 0; hour < 24; hour++) {
        const slotDate = new Date(startDate)
        slotDate.setHours(hour, 0, 0, 0)
        timeSlots.push(slotDate.toISOString())
      }
    } else {
      for (let i = 0; i < daysBack; i++) {
        const slotDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        timeSlots.push(slotDate.toISOString().split("T")[0])
      }
    }

    // Initialize all slots with zero values
    timeSlots.forEach((slot) => {
      wasteByTime.set(slot, { quantity: 0, value: 0 })
    })

    // Fill in actual data with validation
    wasteOverTimeRaw.forEach((log) => {
      try {
        let timeKey: string
        if (timeRange === "today") {
          const logDate = new Date(log.createdAt)
          if (isNaN(logDate.getTime())) return
          logDate.setMinutes(0, 0, 0)
          timeKey = logDate.toISOString()
        } else {
          const logDate = new Date(log.createdAt)
          if (isNaN(logDate.getTime())) return
          timeKey = logDate.toISOString().split("T")[0]
        }

        const quantity = Number(log.quantity)
        const value = Number(log.value)
        
        if (!isNaN(quantity) && !isNaN(value) && quantity >= 0 && value >= 0) {
          const existing = wasteByTime.get(timeKey)
          if (existing) {
            wasteByTime.set(timeKey, {
              quantity: existing.quantity + quantity,
              value: existing.value + value,
            })
          }
        }
      } catch (error) {
        console.warn("Invalid log entry skipped:", error)
      }
    })

    const wasteOverTime = Array.from(wasteByTime.entries())
      .map(([time, data]) => ({
        date: time,
        quantity: Number(data.quantity.toFixed(1)),
        value: Number(data.value.toFixed(0)),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Get inventory stats with error handling
    let inventoryCount = 0
    let expiringItems = 0

    try {
      inventoryCount = await prisma.inventory.count({
        where: whereClause,
      })

      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      expiringItems = await prisma.inventory.count({
        where: {
          ...whereClause,
          expiryDate: {
            gte: now,
            lte: sevenDaysFromNow,
          },
        },
      })
    } catch (error) {
      console.warn("Error fetching inventory stats:", error)
    }

    // Get branch and user counts (Super Admin only)
    let branchCount = 0
    let userCount = 0
    
    if (user.role === "SUPER_ADMIN") {
      try {
        branchCount = await prisma.branch.count()
        userCount = await prisma.user.count()
      } catch (error) {
        console.warn("Error fetching admin stats:", error)
      }
    }

    // Calculate metrics with safety checks
    const safeWasteChange = isNaN(wasteChange) ? 0 : Math.max(-100, Math.min(100, wasteChange))
    const safeCostChange = isNaN(costChange) ? 0 : Math.max(-100, Math.min(100, costChange))
    
    const efficiencyScore = Math.max(0, Math.min(100, 100 - Math.abs(safeWasteChange)))
    const costSavings = safeWasteChange < 0 
      ? Math.abs(safeWasteChange / 100) * currentWaste.totalValue 
      : 0

    const analytics = {
      totalWasteKg: Number(currentWaste.totalQuantity.toFixed(1)),
      totalWasteLKR: Number(currentWaste.totalValue.toFixed(0)),
      totalWasteEntries: currentWaste.count,
      wasteChange: Number(safeWasteChange.toFixed(1)),
      costChange: Number(safeCostChange.toFixed(1)),
      efficiencyScore: Number(efficiencyScore.toFixed(1)),
      costSavings: Number(costSavings.toFixed(0)),
      totalInventoryItems: inventoryCount,
      expiringItems,
      totalBranches: branchCount,
      totalUsers: userCount,
      topWastedItems,
      wasteOverTime,
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    return handleApiError(error)
  }
}