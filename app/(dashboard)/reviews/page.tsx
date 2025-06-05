"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { ToastContainer, useToast } from "@/components/ui/toast-notification"
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
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
        return <Plus className="w-5 h-5 text-green-600" />
      case "UPDATE":
        return <Edit className="w-5 h-5 text-blue-600" />
      case "DELETE":
        return <Trash2 className="w-5 h-5 text-red-600" />
      default:
        return <FileText className="w-5 h-5 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "text-green-600 bg-green-50 border-green-200"
      case "UPDATE":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "DELETE":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <Clock className="w-4 h-4 mr-1" />
            Pending Review
          </span>
        )
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
            <CheckCircle className="w-4 h-4 mr-1" />
            Approved
          </span>
        )
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-4 h-4 mr-1" />
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
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-kitchzero-text mb-4">Access Denied</h1>
        <p className="text-kitchzero-text/70">Only Super Admins can access the reviews page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kitchzero-text">Review Management</h1>
          <p className="text-kitchzero-text/70 mt-2">Review and approve changes requested by branch administrators</p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <button
            onClick={fetchReviews}
            className="flex items-center space-x-2 px-4 py-2 border border-kitchzero-border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card group hover:shadow-lg transition-all duration-200 border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Pending Reviews</p>
              <p className="text-2xl font-bold text-kitchzero-text">
                {reviews.filter((r) => r.status === "PENDING").length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Approved</p>
              <p className="text-2xl font-bold text-kitchzero-text">
                {reviews.filter((r) => r.status === "APPROVED").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Rejected</p>
              <p className="text-2xl font-bold text-kitchzero-text">
                {reviews.filter((r) => r.status === "REJECTED").length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200 border-l-4 border-l-kitchzero-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Total Reviews</p>
              <p className="text-2xl font-bold text-kitchzero-text">{reviews.length}</p>
            </div>
            <FileText className="w-8 h-8 text-kitchzero-primary" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input w-full sm:w-64"
              />
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select">
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="">All Status</option>
            </select>

            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="select">
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kitchzero-primary"></div>
            <p className="ml-4 text-kitchzero-text">Loading reviews...</p>
          </div>
        ) : filteredReviews.length > 0 ? (
          filteredReviews.map((review) => (
            <div key={review.id} className="card hover:shadow-lg transition-all duration-200">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-gray-50">{getActionIcon(review.action)}</div>
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${getActionColor(review.action)}`}
                        >
                          {review.action} Request
                        </span>
                        {getStatusBadge(review.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-kitchzero-text/70">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{review.creator.username}</span>
                          {review.creator.branch && <span>({review.creator.branch.name})</span>}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                      className="p-2 text-kitchzero-primary hover:bg-kitchzero-primary/10 rounded-lg transition-colors"
                    >
                      {expandedReview === review.id ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {review.newData && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-kitchzero-text mb-1">
                        {review.action === "CREATE" ? "New Item" : "Item Details"}
                      </p>
                      <p className="font-semibold text-kitchzero-text">{review.newData.itemName}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-kitchzero-text/70">
                        <span>
                          {review.newData.quantity} {review.newData.unit}
                        </span>
                        <span>
                          {review.newData.value?.toLocaleString("en-LK", { style: "currency", currency: "LKR" })}
                        </span>
                      </div>
                    </div>
                  )}

                  {review.reason && (
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                      <p className="text-sm font-medium text-blue-800 mb-1">Request Reason</p>
                      <p className="text-sm text-blue-700 italic">"{review.reason}"</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {review.status === "PENDING" && (
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleReviewAction(review.id, "reject")}
                      disabled={processingReview === review.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{processingReview === review.id ? "Processing..." : "Reject"}</span>
                    </button>
                    <button
                      onClick={() => handleReviewAction(review.id, "approve")}
                      disabled={processingReview === review.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
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
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-kitchzero-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-kitchzero-text mb-2">No reviews found</h3>
            <p className="text-kitchzero-text/70">
              {searchTerm || actionFilter ? "Try adjusting your filters" : "No reviews match the current criteria"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
