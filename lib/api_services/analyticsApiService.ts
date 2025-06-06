import { prisma } from '@/lib/prisma';
import type { AuthUser, AnalyticsData } from '@/lib/types'; // Assuming AnalyticsData is defined in lib/types
import type { Prisma } from '@prisma/client';

// Helper function to determine the start date based on the time range
function getStartDate(timeRange: string): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  switch (timeRange) {
    case '7d':
      now.setDate(now.getDate() - 7);
      break;
    case '30d':
      now.setDate(now.getDate() - 30);
      break;
    case '90d':
      now.setDate(now.getDate() - 90);
      break;
    case 'today':
    default:
      // For 'today', we want data from the beginning of today up to now (or end of today)
      // The where clause in Prisma will handle the upper bound (e.g., less than tomorrow)
      break;
  }
  return now;
}


export async function getDashboardAnalytics(user: AuthUser, timeRange: string): Promise<AnalyticsData> {
  const startDate = getStartDate(timeRange);
  const endDate = new Date(); // Up to the current moment for 'today', or end of day for ranges.
  if (timeRange !== 'today') {
    endDate.setHours(23, 59, 59, 999); // End of the day for ranged queries
  }


  let branchIdFilter: string | undefined = undefined;
  if (user.role === 'BRANCH_ADMIN') {
    if (!user.branchId) {
      // This case should ideally not happen if branch admins always have a branchId
      throw new Error("Branch admin is not associated with a branch.");
    }
    branchIdFilter = user.branchId;
  }

  const dateFilter: Prisma.DateTimeFilter = {
    gte: startDate,
    lt: timeRange === 'today' ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000) : endDate, // For 'today', up to end of day
  };

  // --- Previous Period Calculation (for percentage changes) ---
  let prevStartDate: Date;
  let prevEndDate: Date;

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

  switch (timeRange) {
    case '7d':
      prevEndDate = new Date(startDate.getTime() - 1); // End of day before current period starts
      prevEndDate.setHours(23,59,59,999);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 6); // 7 days before prevEndDate's day start
      prevStartDate.setHours(0,0,0,0);
      break;
    case '30d':
      prevEndDate = new Date(startDate.getTime() - 1);
      prevEndDate.setHours(23,59,59,999);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 29); // 30 days before prevEndDate's day start
      prevStartDate.setHours(0,0,0,0);
      break;
    case '90d':
      prevEndDate = new Date(startDate.getTime() - 1);
      prevEndDate.setHours(23,59,59,999);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 89); // 90 days before prevEndDate's day start
      prevStartDate.setHours(0,0,0,0);
      break;
    case 'today':
    default: // Yesterday for 'today'
      prevEndDate = new Date(todayStart.getTime() - 1); // End of yesterday
      prevEndDate.setHours(23,59,59,999);
      prevStartDate = new Date(prevEndDate); // Start of yesterday
      prevStartDate.setHours(0,0,0,0);
      break;
  }

   const prevDateFilter: Prisma.DateTimeFilter = {
    gte: prevStartDate,
    lt: new Date(prevEndDate.getTime() + 1), // Ensure it includes the whole prevEndDate
  };

  // --- Waste Data Aggregations ---
  const commonWasteWhere: Prisma.WasteLogWhereInput = {
    ...(branchIdFilter && { branchId: branchIdFilter }),
  };

  const currentWasteAggregation = await prisma.wasteLog.aggregate({
    _sum: { quantity: true, value: true },
    _count: { id: true },
    where: { ...commonWasteWhere, createdAt: dateFilter },
  });

  const previousWasteAggregation = await prisma.wasteLog.aggregate({
    _sum: { quantity: true, value: true },
    where: { ...commonWasteWhere, createdAt: prevDateFilter },
  });

  const topWastedItemsQuery = prisma.wasteLog.groupBy({
    by: ['itemName'],
    _sum: { quantity: true, value: true },
    where: { ...commonWasteWhere, createdAt: dateFilter },
    orderBy: { _sum: { value: 'desc' } },
    take: 5,
  });

  const wasteOverTimeQuery = prisma.wasteLog.groupBy({
    by: ['createdAt'], // This will group by exact timestamp, might need date part only
    _sum: { quantity: true, value: true },
    where: { ...commonWasteWhere, createdAt: dateFilter },
    orderBy: { createdAt: 'asc' },
  });

  // --- Inventory Data ---
  const inventoryWhere: Prisma.InventoryItemWhereInput = {
    ...(branchIdFilter && { branchId: branchIdFilter }),
  };
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const totalInventoryItemsQuery = prisma.inventoryItem.count({ where: inventoryWhere });
  const expiringItemsQuery = prisma.inventoryItem.count({
    where: {
      ...inventoryWhere,
      expiryDate: {
        gte: new Date(), // Today
        lte: sevenDaysFromNow, // Next 7 days
      },
    },
  });

  // --- Admin Data (conditionally fetched) ---
  let totalBranchesQuery = Promise.resolve(0);
  let totalUsersQuery = Promise.resolve(0);

  if (user.role === 'SUPER_ADMIN') {
    totalBranchesQuery = prisma.branch.count();
    totalUsersQuery = prisma.user.count();
  } else if (user.role === 'BRANCH_ADMIN' && user.branchId) {
    // For branch admin, they only see their own branch
    totalBranchesQuery = Promise.resolve(1);
    // Count users only in their branch
    totalUsersQuery = prisma.user.count({ where: { branchId: user.branchId }});
  }

  // Execute all queries concurrently
  const [
    topWastedItems,
    rawWasteOverTime,
    totalInventoryItems,
    expiringItems,
    totalBranches,
    totalUsers,
  ] = await Promise.all([
    topWastedItemsQuery,
    wasteOverTimeQuery,
    totalInventoryItemsQuery,
    expiringItemsQuery,
    totalBranchesQuery,
    totalUsersQuery,
  ]);

  // Process wasteOverTime to group by date (YYYY-MM-DD)
  const wasteOverTimeProcessed = rawWasteOverTime.reduce<Array<{ date: string; quantity: number; value: number }>>((acc, curr) => {
    const dateStr = new Date(curr.createdAt).toISOString().split('T')[0];
    const existingEntry = acc.find(e => e.date === dateStr);
    if (existingEntry) {
      existingEntry.quantity += curr._sum.quantity || 0;
      existingEntry.value += curr._sum.value || 0;
    } else {
      acc.push({
        date: dateStr,
        quantity: curr._sum.quantity || 0,
        value: curr._sum.value || 0,
      });
    }
    return acc;
  }, []);


  // --- Calculate Percentage Changes ---
  const calculateChange = (current: number | null, previous: number | null): number => {
    const currentVal = current ?? 0;
    const previousVal = previous ?? 0;
    if (previousVal === 0) return currentVal > 0 ? 100 : 0; // Avoid division by zero
    return parseFloat((((currentVal - previousVal) / previousVal) * 100).toFixed(1));
  };

  const wasteChange = calculateChange(currentWasteAggregation._sum.quantity, previousWasteAggregation._sum.quantity);
  const costChange = calculateChange(currentWasteAggregation._sum.value, previousWasteAggregation._sum.value);

  // --- Calculate Efficiency Score & Cost Savings (example logic) ---
  // These are just placeholder calculations, replace with actual business logic
  const efficiencyScore = Math.max(0, 100 - (wasteChange > 0 ? wasteChange / 2 : Math.abs(wasteChange))); // Example
  const costSavings = (previousWasteAggregation._sum.value || 0) - (currentWasteAggregation._sum.value || 0); // Example

  return {
    totalWasteKg: currentWasteAggregation._sum.quantity || 0,
    totalWasteLKR: currentWasteAggregation._sum.value || 0,
    totalWasteEntries: currentWasteAggregation._count.id || 0,
    wasteChange,
    costChange,
    efficiencyScore: parseFloat(efficiencyScore.toFixed(1)),
    costSavings: costSavings > 0 ? costSavings : 0, // Show 0 if no savings or increased cost
    totalInventoryItems,
    expiringItems,
    totalBranches,
    totalUsers,
    topWastedItems: topWastedItems.map(item => ({
      itemName: item.itemName,
      totalQuantity: item._sum.quantity || 0,
      totalValue: item._sum.value || 0,
    })),
    wasteOverTime: wasteOverTimeProcessed,
  };
}
