"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import {
  TrendingDown,
  TrendingUp,
  Package,
  Trash2,
  DollarSign,
  AlertTriangle,
  Target,
  Users,
  Building2,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Leaf,
  Minus,
  RefreshCw,
} from "lucide-react"

interface AnalyticsData {
  // Current period totals
  totalWasteKg: number
  totalWasteLKR: number
  totalWasteEntries: number

  // Percentage changes
  wasteChange: number
  costChange: number

  // Calculated metrics
  efficiencyScore: number
  costSavings: number

  // Inventory data
  totalInventoryItems: number
  expiringItems: number

  // Admin-only data
  totalBranches: number
  totalUsers: number

  // Chart data
  topWastedItems: Array<{
    itemName: string
    totalQuantity: number
    totalValue: number
  }>
  wasteOverTime: Array<{
    date: string
    quantity: number
    value: number
  }>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState("today")
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [timeRange, user])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Fetching analytics for user:", user?.username, "timeRange:", timeRange)

      const response = await fetch(`/api/analytics?timeRange=${timeRange}`)

      console.log("📡 Analytics response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("📊 Analytics data received:", data)
        setAnalytics(data.analytics)
        setLastUpdated(new Date())
      } else {
        const errorData = await response.json()
        console.error("❌ Analytics API error:", errorData)
        setError(errorData.error || "Failed to fetch analytics")
      }
    } catch (error) {
      console.error("❌ Failed to fetch analytics:", error)
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
    setRefreshing(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4 text-red-600" />
    if (change < 0) return <ArrowDownRight className="w-4 h-4 text-green-600" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  const getChangeColor = (change: number, inverse = false) => {
    if (change > 0) return inverse ? "text-green-600" : "text-red-600"
    if (change < 0) return inverse ? "text-red-600" : "text-green-600"
    return "text-gray-500"
  }

  const getEfficiencyColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-green-600"
    if (score >= 60) return "from-yellow-500 to-yellow-600"
    return "from-red-500 to-red-600"
  }

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case "today":
        return "Today"
      case "7d":
        return "Last 7 days"
      case "30d":
        return "Last 30 days"
      case "90d":
        return "Last 90 days"
      default:
        return "Today"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kitchzero-primary"></div>
        <p className="ml-4 text-kitchzero-text">Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-kitchzero-text mb-2">Error Loading Dashboard</h2>
          <p className="text-kitchzero-text/70 mb-4">{error}</p>
          <button onClick={fetchAnalytics} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-kitchzero-text/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-kitchzero-text mb-2">No Data Available</h2>
          <p className="text-kitchzero-text/70 mb-4">No analytics data found. Try running the seed script.</p>
          <button onClick={fetchAnalytics} className="btn-primary">
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kitchzero-text">Welcome back, {user?.username}! 👋</h1>
          <p className="text-kitchzero-text/70 mt-2">
            Here's your food waste management overview for {getTimeRangeLabel(timeRange).toLowerCase()}.
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="select text-sm bg-white border-2 border-kitchzero-border focus:border-kitchzero-primary"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 border border-kitchzero-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <div className="flex items-center space-x-2 text-sm text-kitchzero-text/70">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live data</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Waste */}
        <div className="card group hover:shadow-xl transition-all duration-300 border-l-4 border-l-kitchzero-accent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Total Waste</p>
              <p className="text-3xl font-bold text-kitchzero-text">{analytics.totalWasteKg} kg</p>
              <div className="flex items-center space-x-1 mt-2">
                {getChangeIcon(analytics.wasteChange)}
                <span className={`text-sm font-medium ${getChangeColor(analytics.wasteChange, true)}`}>
                  {analytics.wasteChange > 0 ? "+" : ""}
                  {analytics.wasteChange}%
                </span>
                <span className="text-xs text-kitchzero-text/50">vs previous period</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-kitchzero-accent/10 to-kitchzero-accent/20 rounded-xl group-hover:scale-110 transition-transform">
              <Trash2 className="w-8 h-8 text-kitchzero-accent" />
            </div>
          </div>
        </div>

        {/* Cost Impact */}
        <div className="card group hover:shadow-xl transition-all duration-300 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Cost Impact</p>
              <p className="text-3xl font-bold text-kitchzero-text">{formatCurrency(analytics.totalWasteLKR)}</p>
              <div className="flex items-center space-x-1 mt-2">
                {getChangeIcon(analytics.costChange)}
                <span className={`text-sm font-medium ${getChangeColor(analytics.costChange, true)}`}>
                  {analytics.costChange > 0 ? "+" : ""}
                  {analytics.costChange}%
                </span>
                <span className="text-xs text-kitchzero-text/50">vs previous period</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-red-100 to-red-200 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Efficiency Score */}
        <div className="card group hover:shadow-xl transition-all duration-300 border-l-4 border-l-kitchzero-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Efficiency Score</p>
              <p className="text-3xl font-bold text-kitchzero-text">{analytics.efficiencyScore}%</p>
              <div className="flex items-center space-x-1 mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Optimized</span>
                <span className="text-xs text-kitchzero-text/50">performance</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-kitchzero-success/10 to-kitchzero-success/20 rounded-xl group-hover:scale-110 transition-transform">
              <Target className="w-8 h-8 text-kitchzero-success" />
            </div>
          </div>
        </div>

        {/* Cost Savings */}
        <div className="card group hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Estimated Savings</p>
              <p className="text-3xl font-bold text-kitchzero-text">{formatCurrency(analytics.costSavings)}</p>
              <div className="flex items-center space-x-1 mt-2">
                <Leaf className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Sustainable</span>
                <span className="text-xs text-kitchzero-text/50">practices</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl group-hover:scale-110 transition-transform">
              <Leaf className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === "SUPER_ADMIN" && (
          <>
            <div className="card hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-kitchzero-text/70">Active Branches</p>
                  <p className="text-2xl font-bold text-kitchzero-text">{analytics.totalBranches}</p>
                </div>
                <Building2 className="w-6 h-6 text-kitchzero-primary" />
              </div>
            </div>

            <div className="card hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-kitchzero-text/70">Total Users</p>
                  <p className="text-2xl font-bold text-kitchzero-text">{analytics.totalUsers}</p>
                </div>
                <Users className="w-6 h-6 text-kitchzero-secondary" />
              </div>
            </div>
          </>
        )}

        <div className="card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Inventory Items</p>
              <p className="text-2xl font-bold text-kitchzero-text">{analytics.totalInventoryItems}</p>
            </div>
            <Package className="w-6 h-6 text-kitchzero-primary" />
          </div>
        </div>

        <div className="card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Expiring Soon</p>
              <p className="text-2xl font-bold text-kitchzero-text">{analytics.expiringItems}</p>
              {analytics.expiringItems > 0 && <p className="text-xs text-orange-600 mt-1">Requires attention</p>}
            </div>
            <AlertTriangle className={`w-6 h-6 ${analytics.expiringItems > 0 ? "text-orange-500" : "text-gray-400"}`} />
          </div>
        </div>
      </div>

      {/* Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Waste Trend Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-kitchzero-text">Waste Trend Analysis</h2>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-kitchzero-primary" />
              <span className="text-sm text-kitchzero-text/70">{getTimeRangeLabel(timeRange)}</span>
            </div>
          </div>

          {analytics.wasteOverTime.length ? (
            <div className="space-y-4">
              <div className="h-64 flex items-end space-x-1 overflow-x-auto">
                {analytics.wasteOverTime.map((data, index) => {
                  const maxValue = Math.max(...analytics.wasteOverTime.map((d) => d.value), 1)
                  const height = Math.max((data.value / maxValue) * 200, 2)

                  return (
                    <div key={index} className="flex-shrink-0 flex flex-col items-center group min-w-[30px]">
                      <div className="relative">
                        <div
                          className="w-6 bg-gradient-to-t from-kitchzero-primary to-kitchzero-primary/60 rounded-t hover:from-kitchzero-accent hover:to-kitchzero-accent/60 transition-all duration-200 cursor-pointer"
                          style={{ height: `${height}px` }}
                        />
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {formatCurrency(data.value)}
                          <br />
                          {data.quantity} kg
                        </div>
                      </div>
                      <p className="text-xs text-kitchzero-text/70 mt-2 transform -rotate-45 origin-left w-16 truncate">
                        {timeRange === "today"
                          ? new Date(data.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                          : new Date(data.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-sm text-kitchzero-text/70 pt-4 border-t border-kitchzero-border">
                <span>
                  Trend:{" "}
                  {analytics.wasteChange < 0 ? "Decreasing" : analytics.wasteChange > 0 ? "Increasing" : "Stable"} waste
                  by {Math.abs(analytics.wasteChange)}%
                </span>
                <span className={`flex items-center space-x-1 ${getChangeColor(analytics.wasteChange, true)}`}>
                  {analytics.wasteChange < 0 ? (
                    <TrendingDown className="w-4 h-4" />
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
            <div className="h-64 flex items-center justify-center text-kitchzero-text/70">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-kitchzero-text/30" />
                <p>No trend data available for {getTimeRangeLabel(timeRange).toLowerCase()}</p>
                <p className="text-sm mt-1">Start logging waste to see analytics</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Wasted Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-kitchzero-text">Top Waste Categories</h2>
            <div className="flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-kitchzero-accent" />
              <span className="text-sm text-kitchzero-text/70">By value</span>
            </div>
          </div>

          {analytics.topWastedItems.length ? (
            <div className="space-y-4">
              {analytics.topWastedItems.map((item, index) => {
                const maxValue = Math.max(...analytics.topWastedItems.map((i) => i.totalValue))
                const percentage = maxValue > 0 ? (item.totalValue / maxValue) * 100 : 0

                return (
                  <div key={item.itemName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-kitchzero-accent to-kitchzero-accent/70 text-white rounded-lg flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-kitchzero-text">{item.itemName}</p>
                          <p className="text-sm text-kitchzero-text/70">{item.totalQuantity} kg wasted</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-kitchzero-text">{formatCurrency(item.totalValue)}</p>
                        <p className="text-sm text-kitchzero-text/70">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-kitchzero-accent to-kitchzero-accent/70 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-kitchzero-text/70">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-4 text-kitchzero-text/30" />
                <p>No waste categories for {getTimeRangeLabel(timeRange).toLowerCase()}</p>
                <p className="text-sm mt-1">Log waste entries to see top categories</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-kitchzero-text mb-4 flex items-center space-x-2">
            <Zap className="w-5 h-5 text-kitchzero-warning" />
            <span>Quick Actions</span>
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => (window.location.href = "/waste")}
              className="w-full text-left p-3 rounded-lg border border-kitchzero-border hover:bg-kitchzero-primary/5 hover:border-kitchzero-primary transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Trash2 className="w-5 h-5 text-kitchzero-accent group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-kitchzero-text">Log Waste Entry</p>
                  <p className="text-sm text-kitchzero-text/70">Record new food waste</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => (window.location.href = "/inventory")}
              className="w-full text-left p-3 rounded-lg border border-kitchzero-border hover:bg-kitchzero-primary/5 hover:border-kitchzero-primary transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-kitchzero-primary group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-kitchzero-text">Add Inventory</p>
                  <p className="text-sm text-kitchzero-text/70">Update stock items</p>
                </div>
              </div>
            </button>

            {user?.role === "SUPER_ADMIN" && (
              <button
                onClick={() => (window.location.href = "/branches")}
                className="w-full text-left p-3 rounded-lg border border-kitchzero-border hover:bg-kitchzero-primary/5 hover:border-kitchzero-primary transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-kitchzero-secondary group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-kitchzero-text">Manage Branches</p>
                    <p className="text-sm text-kitchzero-text/70">Add or edit locations</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="card">
          <h3 className="text-lg font-semibold text-kitchzero-text mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-kitchzero-warning" />
            <span>Alerts</span>
          </h3>
          <div className="space-y-3">
            {analytics.expiringItems > 0 ? (
              <div className="p-3 bg-kitchzero-warning/10 border border-kitchzero-warning/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-kitchzero-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-kitchzero-text">Items Expiring Soon</p>
                    <p className="text-sm text-kitchzero-text/70">
                      {analytics.expiringItems} items expire within 7 days
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-kitchzero-text">All Good!</p>
                    <p className="text-sm text-kitchzero-text/70">No urgent alerts at this time</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-3 bg-kitchzero-info border border-kitchzero-border rounded-lg">
              <div className="flex items-start space-x-3">
                <Activity className="w-5 h-5 text-kitchzero-primary mt-0.5" />
                <div>
                  <p className="font-medium text-kitchzero-text">System Status</p>
                  <p className="text-sm text-kitchzero-text/70">All systems operational</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="card">
          <h3 className="text-lg font-semibold text-kitchzero-text mb-4 flex items-center space-x-2">
            <Target className="w-5 h-5 text-kitchzero-success" />
            <span>Performance</span>
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-kitchzero-text">Waste Reduction</span>
                <span className={`text-sm font-bold ${analytics.wasteChange < 0 ? "text-green-600" : "text-gray-500"}`}>
                  {analytics.wasteChange < 0 ? Math.abs(analytics.wasteChange) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-gradient-to-r ${analytics.wasteChange < 0 ? "from-green-500 to-green-600" : "from-gray-400 to-gray-500"} h-2 rounded-full`}
                  style={{
                    width: `${analytics.wasteChange < 0 ? Math.min(Math.abs(analytics.wasteChange), 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-kitchzero-text">Efficiency Score</span>
                <span className="text-sm font-bold text-kitchzero-primary">{analytics.efficiencyScore}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`bg-gradient-to-r ${getEfficiencyColor(analytics.efficiencyScore)} h-2 rounded-full`}
                  style={{ width: `${analytics.efficiencyScore}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-kitchzero-text">Cost Savings</span>
                <span className="text-sm font-bold text-kitchzero-accent">{formatCurrency(analytics.costSavings)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-kitchzero-accent to-kitchzero-accent/70 h-2 rounded-full"
                  style={{
                    width: `${analytics.costSavings > 0 ? Math.min((analytics.costSavings / 100000) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
