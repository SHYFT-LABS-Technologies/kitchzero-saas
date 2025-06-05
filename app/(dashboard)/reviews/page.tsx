"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { ToastContainer, useToast } from "@/components/ui/toast-notification"
import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  Shield,
  Eye,
  Building2,
  MessageSquare,
  TrendingUp,
} from "lucide-react"

interface WasteLogReview {
  id: string
  wasteLogId?: string
  wasteLog?: {
    id: string
    itemName: string
    quantity: number
    unit: string
    value: number
    reason: string
    branch: {
      id: string
      name: string
      location: string
    }
  }
  action: "CREATE" | "UPDATE" | "DELETE"
  status: "PENDING" | "APPROVED" | "REJECTED"
  originalData?: any
  newData?: any
  reason?: string
  createdBy: string
  creator: {
    id: string
    username: string
    role: string
    branch?: {
      name: string
    }
  }
  approvedBy?: string
  approver?: {
    username: string
  }
  reviewNotes?: string
  createdAt: string
  updatedAt: string
  reviewedAt?: string
}

export default function ReviewsPage() {
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [allReviews, setAllReviews] = useState<WasteLogReview[]>([]) // For stats cards
  const [reviews, setReviews] = useState<WasteLogReview[]>([]) // For filtered display
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("PENDING")
  const [actionFilter, setActionFilter] = useState("")
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [processingReview, setProcessingReview] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchAllReviews() // Fetch all reviews for stats
      fetchReviews() // Fetch filtered reviews for display
    }
  }, [user])

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchReviews().catch(() => {
        addToast({
          type: "error",
          title: "Error",
          message: "Failed to fetch reviews. Please try again.",
        })
      })
    }
  }, [statusFilter])

  const fetchAllReviews = async () => {
    try {
      const response = await fetch("/api/reviews") // No status filter for stats
      if (response.ok) {
        const data = await response.json()
        setAllReviews(data.reviews || [])
      }
    } catch (error) {
      console.error("Failed to fetch all reviews:", error)
    }
  }

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reviews?status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
      } else {
        console.error("Failed to fetch reviews:", response.statusText)
        throw new Error("Failed to fetch reviews")
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    try {
      await Promise.all([fetchAllReviews(), fetchReviews()])
      addToast({
        type: "success",
        title: "Data Refreshed",
        message: "Review data has been refreshed successfully.",
      })
    } catch (error) {
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to refresh data. Please try again.",
      })
    }
  }

  const handleReviewAction = async (reviewId: string, action: "approve" | "reject") => {
    const reviewNotes = prompt(`Please provide notes for ${action}ing this request:`)
    if (!reviewNotes) return

    setProcessingReview(reviewId)

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes }),
      })

      if (response.ok) {
        addToast({
          type: "success",
          title: `Request ${action === "approve" ? "Approved" : "Rejected"}`,
          message: `The request has been successfully ${action}d.`,
        })
        refreshData() // Refresh both all reviews and filtered reviews
      } else {
        throw new Error(`Failed to ${action} review`)
      }
    } catch (error) {
      console.error("Failed to process review:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to process review. Please try again.",
      })
    } finally {
      setProcessingReview(null)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Plus className="w-5 h-5 text-emerald-600" />
      case "UPDATE":
        return <Edit className="w-5 h-5 text-blue-600" />
      case "DELETE":
        return <Trash2 className="w-5 h-5 text-red-600" />
      default:
        return <FileText className="w-5 h-5 text-slate-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "text-emerald-700 bg-emerald-50 border-emerald-200"
      case "UPDATE":
        return "text-blue-700 bg-blue-50 border-blue-200"
      case "DELETE":
        return "text-red-700 bg-red-50 border-red-200"
      default:
        return "text-slate-700 bg-slate-50 border-slate-200"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        )
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  const formatReason = (reason: string) => {
    return reason
      .replace("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.creator.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.wasteLog?.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (review.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesAction = !actionFilter || review.action === actionFilter
    return matchesSearch && matchesAction
  })

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Access Denied</h1>
            <p className="text-slate-500 max-w-md mx-auto">
              Only Super Admins can access the reviews page. Please contact your administrator for access.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-kitchzero-primary/20 rounded-full animate-spin border-t-kitchzero-primary"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-kitchzero-secondary rounded-full animate-spin animate-reverse"></div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-900">Loading Review Management</h3>
              <p className="text-sm text-slate-500 mt-1">Fetching your data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Enhanced Header Section */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-kitchzero-primary/5 via-transparent to-kitchzero-secondary/5"></div>
          <div className="relative px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-kitchzero-primary to-kitchzero-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Review Management
                  </h1>
                  <p className="text-slate-600 mt-1 text-sm lg:text-base">
                    Review and approve changes requested by branch administrators
                  </p>
                </div>
              </div>

              <div className="mt-6 lg:mt-0 flex items-center space-x-3">
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-sm shadow-sm ${
                    loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Modern Stats Cards - Using allReviews for accurate totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pending Reviews Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-orange-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {allReviews.filter((r) => r.status === "PENDING").length}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">PENDING</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Pending Reviews</h3>
                <p className="text-sm text-slate-500">Awaiting approval</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Approved Reviews Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {allReviews.filter((r) => r.status === "APPROVED").length}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">APPROVED</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Approved</h3>
                <p className="text-sm text-slate-500">Successfully processed</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Rejected Reviews Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-pink-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {allReviews.filter((r) => r.status === "REJECTED").length}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">REJECTED</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Rejected</h3>
                <p className="text-sm text-slate-500">Declined requests</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Total Reviews Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-violet-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{allReviews.length}</div>
                  <div className="text-xs text-slate-500 font-medium">TOTAL</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Total Reviews</h3>
                <p className="text-sm text-slate-500">All time requests</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                {/* Enhanced Search Input */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-kitchzero-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search reviews..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="">All Status</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Action Filter */}
                <div className="relative">
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200"
                  >
                    <option value="">All Actions</option>
                    <option value="CREATE">Create</option>
                    <option value="UPDATE">Update</option>
                    <option value="DELETE">Delete</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Professional Reviews Table */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Review Requests</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {filteredReviews.length} of {reviews.length} requests shown
                </p>
              </div>
              <div className="text-sm text-slate-500">
                Status: <span className="font-medium text-slate-700">{statusFilter || "All"}</span>
              </div>
            </div>
          </div>

          {filteredReviews.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Request Details</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Requestor</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Item Information</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Date</th>
                    <th className="text-right py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReviews.map((review) => (
                    <>
                      {/* Main Row */}
                      <tr
                        key={review.id}
                        className="group hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-transparent transition-all duration-200"
                      >
                        {/* Request Details */}
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center group-hover:from-kitchzero-primary/10 group-hover:to-kitchzero-secondary/10 transition-all duration-200">
                              {getActionIcon(review.action)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionColor(
                                    review.action,
                                  )}`}
                                >
                                  {review.action}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-slate-900">{review.action} Request</div>
                              <div className="text-xs text-slate-500">ID: {review.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>

                        {/* Requestor */}
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{review.creator.username}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                {review.creator.branch && (
                                  <>
                                    <Building2 className="w-3 h-3" />
                                    {review.creator.branch.name}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Item Information */}
                        <td className="py-5 px-6">
                          {review.newData ? (
                            <div>
                              <div className="text-sm font-semibold text-slate-900 mb-1">{review.newData.itemName}</div>
                              <div className="text-xs text-slate-500 space-y-0.5">
                                <div>
                                  Qty: {review.newData.quantity} {review.newData.unit}
                                </div>
                                <div>
                                  Value:{" "}
                                  {review.newData.value?.toLocaleString("en-LK", {
                                    style: "currency",
                                    currency: "LKR",
                                    minimumFractionDigits: 0,
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500 italic">No item data</div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-5 px-6">
                          {getStatusBadge(review.status)}
                          {review.reviewNotes && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <MessageSquare className="w-3 h-3" />
                                Has notes
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-5 px-6">
                          <div className="text-sm font-medium text-slate-900">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(review.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-5 px-6">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Details Button */}
                            <button
                              onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                              className="p-2 text-slate-400 hover:text-kitchzero-primary hover:bg-kitchzero-primary/5 rounded-lg transition-all duration-200 group/btn"
                              title="View Details"
                            >
                              {expandedReview === review.id ? (
                                <ChevronDown className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                              ) : (
                                <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                              )}
                            </button>

                            {/* Action Buttons for Pending Reviews */}
                            {review.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => handleReviewAction(review.id, "reject")}
                                  disabled={processingReview === review.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-200 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Reject Request"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  {processingReview === review.id ? "..." : "Reject"}
                                </button>
                                <button
                                  onClick={() => handleReviewAction(review.id, "approve")}
                                  disabled={processingReview === review.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all duration-200 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Approve Request"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {processingReview === review.id ? "..." : "Approve"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {expandedReview === review.id && (
                        <tr className="bg-gradient-to-r from-slate-50/30 to-transparent">
                          <td colSpan={6} className="px-6 py-6">
                            <div className="bg-white rounded-xl border border-slate-200/60 p-6">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Request Reason */}
                                {review.reason && (
                                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-lg border border-blue-200/60">
                                    <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4" />
                                      Request Reason
                                    </h5>
                                    <p className="text-sm text-blue-700 italic leading-relaxed">"{review.reason}"</p>
                                  </div>
                                )}

                                {/* Original Data */}
                                {review.originalData && (
                                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-4 rounded-lg border border-orange-200/60">
                                    <h5 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                                      <Eye className="w-4 h-4" />
                                      Original Data
                                    </h5>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-orange-700">Item:</span>
                                        <span className="font-medium text-orange-900">
                                          {review.originalData.itemName}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-orange-700">Quantity:</span>
                                        <span className="font-medium text-orange-900">
                                          {review.originalData.quantity} {review.originalData.unit}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-orange-700">Value:</span>
                                        <span className="font-medium text-orange-900">
                                          {review.originalData.value?.toLocaleString("en-LK", {
                                            style: "currency",
                                            currency: "LKR",
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Review Notes */}
                                {review.reviewNotes && (
                                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 rounded-lg border border-purple-200/60 lg:col-span-2">
                                    <h5 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                                      <MessageSquare className="w-4 h-4" />
                                      Review Notes
                                    </h5>
                                    <p className="text-sm text-purple-700 italic mb-3">{review.reviewNotes}</p>
                                    {review.approver && (
                                      <div className="pt-2 border-t border-purple-200 text-xs text-purple-600">
                                        Reviewed by: <span className="font-medium">{review.approver.username}</span>
                                        {review.reviewedAt && (
                                          <span className="ml-2">
                                            on {new Date(review.reviewedAt).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Additional Details */}
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 p-4 rounded-lg border border-slate-200/60 lg:col-span-2">
                                  <h5 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Request Timeline
                                  </h5>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Submitted:</span>
                                      <span className="font-medium text-slate-900">
                                        {new Date(review.createdAt).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">Last Updated:</span>
                                      <span className="font-medium text-slate-900">
                                        {new Date(review.updatedAt).toLocaleString()}
                                      </span>
                                    </div>
                                    {review.reviewedAt && (
                                      <div className="flex justify-between">
                                        <span className="text-slate-600">Reviewed:</span>
                                        <span className="font-medium text-slate-900">
                                          {new Date(review.reviewedAt).toLocaleString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">No reviews found</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                {searchTerm || actionFilter
                  ? "No reviews match your current filters. Try adjusting your search criteria."
                  : "No reviews match the current criteria. Check back later for new requests."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
