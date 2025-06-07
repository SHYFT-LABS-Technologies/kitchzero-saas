"use client";

import { useAuth } from "@/components/auth-provider";
import { useDashboardAnalytics, type TimeRange } from "@/lib/hooks/useDashboardAnalytics";
import {
  formatCurrency,
  getChangeIcon,
  getChangeColor,
  getEfficiencyColor,
  getTimeRangeLabel
} from "@/lib/utils/dashboardUtils";
import {
  Sparkles,
  RefreshCw,
  Trash2,
  DollarSign,
  Target,
  Leaf,
  Building2,
  Users,
  Package,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown as TrendDown, // Alias used in JSX
  Minus,
  Zap,
  ChevronRight,
  Award
  // ArrowUpRight, ArrowDownRight, Calendar are in dashboardUtils or not directly used
} from "lucide-react";

// AnalyticsData type is now implicitly handled by the hook's return type if not exported from there
// For clarity, if the hook exports it, it could be imported too.

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    analytics,
    loading,
    error,
    timeRange,
    refreshing,
    lastUpdated,
    fetchAnalyticsData, // Renamed from fetchAnalytics for clarity if needed directly
    handleRefresh,
    setTimeRange,
  } = useDashboardAnalytics();

  // All helper functions (formatCurrency, getChangeIcon, etc.) are now imported from dashboardUtils.

  if (loading && !analytics && !error) { // Adjusted loading condition
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Loading Skeleton */}
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded-lg w-64 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-80 bg-gray-200 rounded-2xl"></div>
              <div className="h-80 bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchAnalyticsData} // Use function from hook
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!analytics && !loading) { // Adjusted condition for no data
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Data Available</h2>
          <p className="text-gray-600 mb-6">No analytics data found for the selected period. Try a different time range or log some data.</p>
          <button 
            onClick={fetchAnalyticsData} // Use function from hook
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-green-400/10 to-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-blue-400/10 to-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, <span className="text-green-600">{user?.username}</span>! 👋
                </h1>
                <p className="text-gray-600 mt-1">
                  Here's your food waste management overview for {getTimeRangeLabel(timeRange).toLowerCase()}.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="font-medium">Refresh</span>
            </button>
            
            <div className="flex items-center space-x-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">Live data</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Waste */}
          <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    {getChangeIcon(analytics.wasteChange)}
                    <span className={`text-sm font-semibold ${getChangeColor(analytics.wasteChange, true)}`}>
                      {analytics.wasteChange > 0 ? "+" : ""}
                      {analytics.wasteChange}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">vs previous period</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Waste</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalWasteKg} kg</p>
              </div>
            </div>
          </div>

          {/* Cost Impact */}
          <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 rounded-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    {getChangeIcon(analytics.costChange)}
                    <span className={`text-sm font-semibold ${getChangeColor(analytics.costChange, true)}`}>
                      {analytics.costChange > 0 ? "+" : ""}
                      {analytics.costChange}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">vs previous period</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Cost Impact</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(analytics.totalWasteLKR)}</p>
              </div>
            </div>
          </div>

          {/* Efficiency Score */}
          <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <Award className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">Optimized</span>
                  </div>
                  <span className="text-xs text-gray-500">performance</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Efficiency Score</p>
                <div className="flex items-center space-x-3">
                  <p className="text-3xl font-bold text-gray-900">{analytics.efficiencyScore}%</p>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${getEfficiencyColor(analytics.efficiencyScore)} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${analytics.efficiencyScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Savings */}
          <div className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-600">Sustainable</span>
                  </div>
                  <span className="text-xs text-gray-500">practices</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Estimated Savings</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(analytics.costSavings)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {user?.role === "SUPER_ADMIN" && (
            <>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Branches</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalBranches}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Items</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalInventoryItems}</p>
              </div>
              <Package className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.expiringItems}</p>
                {analytics.expiringItems > 0 && <p className="text-xs text-orange-600 mt-1 font-medium">Requires attention</p>}
              </div>
              <AlertTriangle className={`w-8 h-8 ${analytics.expiringItems > 0 ? "text-orange-500" : "text-gray-400"}`} />
            </div>
          </div>
        </div>

        {/* Charts and Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Waste Trend Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Waste Trend Analysis</h2>
                  <p className="text-sm text-gray-600">{getTimeRangeLabel(timeRange)}</p>
                </div>
              </div>
            </div>

            {analytics.wasteOverTime.length ? (
              <div className="space-y-4">
                <div className="h-64 flex items-end space-x-1 overflow-x-auto pb-4">
                  {analytics.wasteOverTime.map((data, index) => {
                    const maxValue = Math.max(...analytics.wasteOverTime.map((d) => d.value), 1)
                    const height = Math.max((data.value / maxValue) * 200, 2)

                    return (
                      <div key={index} className="flex-shrink-0 flex flex-col items-center group min-w-[30px]">
                        <div className="relative">
                          <div
                            className="w-6 bg-gradient-to-t from-blue-500 to-purple-600 rounded-t hover:from-blue-600 hover:to-purple-700 transition-all duration-200 cursor-pointer shadow-sm"
                            style={{ height: `${height}px` }}
                          />
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {formatCurrency(data.value)}
                            <br />
                            {data.quantity} kg
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left w-16 truncate">
                          {timeRange === "today"
                            ? new Date(data.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                            : new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t border-gray-100">
                  <span>
                    Trend:{" "}
                    {analytics.wasteChange < 0 ? "Decreasing" : analytics.wasteChange > 0 ? "Increasing" : "Stable"} waste
                    by {Math.abs(analytics.wasteChange)}%
                  </span>
                  <span className={`flex items-center space-x-1 font-medium ${getChangeColor(analytics.wasteChange, true)}`}>
                    {analytics.wasteChange < 0 ? (
                      <TrendDown className="w-4 h-4" />
                    ) : analytics.wasteChange > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                    <span>
                      {analytics.wasteChange < 0 ? "Improving" : analytics.wasteChange > 0 ? "Needs attention" : "Stable"}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No trend data available for {getTimeRangeLabel(timeRange).toLowerCase()}</p>
                  <p className="text-sm mt-1">Start logging waste to see analytics</p>
                </div>
              </div>
            )}
          </div>

          {/* Top Wasted Items */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Top Waste Categories</h2>
                  <p className="text-sm text-gray-600">By value</p>
                </div>
              </div>
            </div>

            {analytics.topWastedItems.length ? (
              <div className="space-y-4">
                {analytics.topWastedItems.map((item, index) => {
                  const maxValue = Math.max(...analytics.topWastedItems.map((i) => i.totalValue))
                  const percentage = maxValue > 0 ? (item.totalValue / maxValue) * 100 : 0

                  return (
                    <div key={item.itemName} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{item.itemName}</p>
                            <p className="text-sm text-gray-500">{item.totalQuantity} kg wasted</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(item.totalValue)}</p>
                          <p className="text-sm text-gray-500">{percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all duration-500 shadow-sm"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <PieChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No waste categories for {getTimeRangeLabel(timeRange).toLowerCase()}</p>
                  <p className="text-sm mt-1">Log waste entries to see top categories</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-500" />
             <span>Quick Actions</span>
           </h3>
           <div className="space-y-3">
             <button
               onClick={() => (window.location.href = "/waste")}
               className="w-full text-left p-4 rounded-xl border border-gray-100 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 hover:border-red-200 transition-all group"
             >
               <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Trash2 className="w-5 h-5 text-white" />
                 </div>
                 <div className="flex-1">
                   <p className="font-semibold text-gray-900">Log Waste Entry</p>
                   <p className="text-sm text-gray-500">Record new food waste</p>
                 </div>
                 <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
               </div>
             </button>

             <button
               onClick={() => (window.location.href = "/inventory")}
               className="w-full text-left p-4 rounded-xl border border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 transition-all group"
             >
               <div className="flex items-center space-x-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                   <Package className="w-5 h-5 text-white" />
                 </div>
                 <div className="flex-1">
                   <p className="font-semibold text-gray-900">Add Inventory</p>
                   <p className="text-sm text-gray-500">Update stock items</p>
                 </div>
                 <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
               </div>
             </button>

             {user?.role === "SUPER_ADMIN" && (
               <button
                 onClick={() => (window.location.href = "/branches")}
                 className="w-full text-left p-4 rounded-xl border border-gray-100 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:border-green-200 transition-all group"
               >
                 <div className="flex items-center space-x-3">
                   <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Building2 className="w-5 h-5 text-white" />
                   </div>
                   <div className="flex-1">
                     <p className="font-semibold text-gray-900">Manage Branches</p>
                     <p className="text-sm text-gray-500">Add or edit locations</p>
                   </div>
                   <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                 </div>
               </button>
             )}
           </div>
         </div>

         {/* Alerts & Notifications */}
         <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
           <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
             <AlertTriangle className="w-5 h-5 text-amber-500" />
             <span>Alerts</span>
           </h3>
           <div className="space-y-4">
             {analytics.expiringItems > 0 ? (
               <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                 <div className="flex items-start space-x-3">
                   <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                     <Clock className="w-4 h-4 text-amber-600" />
                   </div>
                   <div className="flex-1">
                     <p className="font-semibold text-amber-900">Items Expiring Soon</p>
                     <p className="text-sm text-amber-700 mt-1">
                       {analytics.expiringItems} items expire within 7 days
                     </p>
                     <button className="text-amber-600 hover:text-amber-700 text-sm font-medium mt-2 hover:underline">
                       View Details →
                     </button>
                   </div>
                 </div>
               </div>
             ) : (
               <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                 <div className="flex items-start space-x-3">
                   <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                     <CheckCircle className="w-4 h-4 text-green-600" />
                   </div>
                   <div>
                     <p className="font-semibold text-green-900">All Good!</p>
                     <p className="text-sm text-green-700 mt-1">No urgent alerts at this time</p>
                   </div>
                 </div>
               </div>
             )}

             <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
               <div className="flex items-start space-x-3">
                 <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                   <Activity className="w-4 h-4 text-blue-600" />
                 </div>
                 <div>
                   <p className="font-semibold text-blue-900">System Status</p>
                   <p className="text-sm text-blue-700 mt-1">All systems operational</p>
                   {lastUpdated && (
                     <p className="text-xs text-blue-600 mt-1">
                       Last updated: {lastUpdated.toLocaleTimeString()}
                     </p>
                   )}
                 </div>
               </div>
             </div>
           </div>
         </div>

         {/* Performance Summary */}
         <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
           <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
             <Target className="w-5 h-5 text-green-500" />
             <span>Performance</span>
           </h3>
           <div className="space-y-6">
             <div>
               <div className="flex items-center justify-between mb-3">
                 <span className="text-sm font-semibold text-gray-700">Waste Reduction</span>
                 <span className={`text-sm font-bold ${analytics.wasteChange < 0 ? "text-green-600" : "text-gray-500"}`}>
                   {analytics.wasteChange < 0 ? Math.abs(analytics.wasteChange) : 0}%
                 </span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-3">
                 <div
                   className={`bg-gradient-to-r ${analytics.wasteChange < 0 ? "from-green-500 to-green-600" : "from-gray-300 to-gray-400"} h-3 rounded-full transition-all duration-500 shadow-sm`}
                   style={{
                     width: `${analytics.wasteChange < 0 ? Math.min(Math.abs(analytics.wasteChange), 100) : 0}%`,
                   }}
                 />
               </div>
             </div>

             <div>
               <div className="flex items-center justify-between mb-3">
                 <span className="text-sm font-semibold text-gray-700">Efficiency Score</span>
                 <span className="text-sm font-bold text-green-600">{analytics.efficiencyScore}%</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-3">
                 <div
                   className={`bg-gradient-to-r ${getEfficiencyColor(analytics.efficiencyScore)} h-3 rounded-full transition-all duration-500 shadow-sm`}
                   style={{ width: `${analytics.efficiencyScore}%` }}
                 />
               </div>
             </div>

             <div>
               <div className="flex items-center justify-between mb-3">
                 <span className="text-sm font-semibold text-gray-700">Cost Savings</span>
                 <span className="text-sm font-bold text-blue-600">{formatCurrency(analytics.costSavings)}</span>
               </div>
               <div className="w-full bg-gray-100 rounded-full h-3">
                 <div
                   className="bg-gradient-to-r from-blue-500 to-cyan-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                   style={{
                     width: `${analytics.costSavings > 0 ? Math.min((analytics.costSavings / 100000) * 100, 100) : 0}%`,
                   }}
                 />
               </div>
             </div>

             {/* Performance Insights */}
             <div className="pt-4 border-t border-gray-100">
               <div className="flex items-center space-x-2 mb-2">
                 <Sparkles className="w-4 h-4 text-purple-500" />
                 <span className="text-sm font-semibold text-gray-700">Insights</span>
               </div>
               <div className="text-xs text-gray-600 space-y-1">
                 <p>• {analytics.wasteChange < 0 ? "Great progress" : "Room for improvement"} on waste reduction</p>
                 <p>• Efficiency score is {analytics.efficiencyScore >= 80 ? "excellent" : analytics.efficiencyScore >= 60 ? "good" : "needs attention"}</p>
                 <p>• Potential annual savings: {formatCurrency(analytics.costSavings * 12)}</p>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   </div>
 )
}