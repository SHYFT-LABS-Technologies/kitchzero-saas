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
  Calendar,
  Search,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Shield,
  Eye,
  Building2,
  Package,
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
  const [reviews, setReviews] = useState<WasteLogReview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("PENDING")
  const [actionFilter, setActionFilter] = useState("")
  const [expandedReview, setExpandedReview] = useState<string | null>(null)
  const [processingReview, setProcessingReview] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchReviews()
    }
  }, [user, statusFilter])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reviews?status=${statusFilter}`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
        addToast({
          type: "success",
          title: "Data Refreshed",
          message: "Review data has been refreshed successfully.",
        })
      } else {
        console.error("Failed to fetch reviews:", response.statusText)
        addToast({
          type: "error",
          title: "Error",
          message: "Failed to fetch reviews. Please try again.",
        })
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to fetch reviews. Please try again.",
      })
    } finally {
      setLoading(false)
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
        fetchReviews()
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
                  onClick={fetchReviews}
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

        {/* Enhanced Modern Stats Cards */}
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
                    {reviews.filter((r) => r.status === "PENDING").length}
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
                    {reviews.filter((r) => r.status === "APPROVED").length}
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
                    {reviews.filter((r) => r.status === "REJECTED").length}
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
                  <div className="text-2xl font-bold text-slate-900">{reviews.length}</div>
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

        {/* Enhanced Reviews List */}
        <div className="space-y-6">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
              <div
                key={review.id}
                className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className="p-6 space-y-6">
                  {/* Enhanced Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-kitchzero-primary/10 group-hover:to-kitchzero-secondary/10 transition-all duration-200">
                        {getActionIcon(review.action)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${getActionColor(
                              review.action,
                            )}`}
                          >
                            {review.action} Request
                          </span>
                          {getStatusBadge(review.status)}
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900">{review.creator.username}</span>
                              {review.creator.branch && (
                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {review.creator.branch.name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                      className="p-3 text-slate-400 hover:text-kitchzero-primary hover:bg-kitchzero-primary/5 rounded-xl transition-all duration-200 group/btn"
                    >
                      {expandedReview === review.id ? (
                        <ChevronDown className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      ) : (
                        <ChevronRight className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                      )}
                    </button>
                  </div>

                  {/* Enhanced Quick Info Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {review.newData && (
                      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50 p-5 rounded-xl border border-slate-200/60">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-kitchzero-primary/10 to-kitchzero-secondary/10 rounded-full -translate-y-10 translate-x-10"></div>
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-slate-600" />
                            <p className="text-sm font-semibold text-slate-700">
                              {review.action === "CREATE" ? "New Item Details" : "Item Information"}
                            </p>
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 mb-3">{review.newData.itemName}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-white rounded-lg border border-slate-200/60">
                              <div className="text-lg font-bold text-slate-900">
                                {review.newData.quantity} {review.newData.unit}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">Quantity</div>
                            </div>
                            <div className="text-center p-3 bg-white rounded-lg border border-slate-200/60">
                              <div className="text-lg font-bold text-slate-900">
                                {review.newData.value?.toLocaleString("en-LK", {
                                  style: "currency",
                                  currency: "LKR",
                                  minimumFractionDigits: 0,
                                })}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">Value</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {review.reason && (
                      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 p-5 rounded-xl border border-blue-200/60">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-200/20 to-blue-300/20 rounded-full -translate-y-10 translate-x-10"></div>
                        <div className="relative">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-semibold text-blue-800">Request Reason</p>
                          </div>
                          <p className="text-sm text-blue-700 italic leading-relaxed">"{review.reason}"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Expanded Details */}
                  {expandedReview === review.id && (
                    <div className="pt-6 border-t border-slate-200 space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {review.originalData && (
                          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-5 rounded-xl border border-orange-200/60">
                            <h5 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Original Data
                            </h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-orange-700">Item:</span>
                                <span className="font-medium text-orange-900">{review.originalData.itemName}</span>
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

                        {review.reviewNotes && (
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-5 rounded-xl border border-purple-200/60">
                            <h5 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              Review Notes
                            </h5>
                            <p className="text-sm text-purple-700 italic">{review.reviewNotes}</p>
                            {review.approver && (
                              <div className="mt-3 pt-3 border-t border-purple-200 text-xs text-purple-600">
                                Reviewed by: <span className="font-medium">{review.approver.username}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Action Buttons */}
                  {review.status === "PENDING" && (
                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                      <button
                        onClick={() => handleReviewAction(review.id, "reject")}
                        disabled={processingReview === review.id}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{processingReview === review.id ? "Processing..." : "Reject"}</span>
                      </button>
                      <button
                        onClick={() => handleReviewAction(review.id, "approve")}
                        disabled={processingReview === review.id}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{processingReview === review.id ? "Processing..." : "Approve"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
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
