"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import DeleteConfirmationModal from "@/components/ui/delete-confirmation-modal"
import { ToastContainer, useToast } from "@/components/ui/toast-notification"
import type { WasteLog, Branch } from "@/lib/types"
import {
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Edit,
  Eye,
  Search,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Camera,
  MapPin,
  User,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  Bell,
  X,
} from "lucide-react"

interface WasteLogWithBranch extends WasteLog {
  branch: Branch
}

interface WasteLogReview {
  id: string
  action: "CREATE" | "UPDATE" | "DELETE"
  status: "PENDING" | "APPROVED" | "REJECTED"
  reason?: string
  createdAt: string
  creator: {
    username: string
    role: string
  }
  wasteLog?: {
    itemName: string
    branch: {
      name: string
    }
  }
}

export default function WastePage() {
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [wasteLogs, setWasteLogs] = useState<WasteLogWithBranch[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [reviews, setReviews] = useState<WasteLogReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<WasteLogWithBranch | null>(null)
  const [viewingLog, setViewingLog] = useState<WasteLogWithBranch | null>(null)
  const [showReviews, setShowReviews] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterReason, setFilterReason] = useState("")
  const [filterBranch, setFilterBranch] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    wasteLog: WasteLogWithBranch | null
    isLoading: boolean
  }>({
    isOpen: false,
    wasteLog: null,
    isLoading: false,
  })
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "kg",
    value: "",
    reason: "SPOILAGE",
    branchId: "",
    photo: "",
    date: "",
  })

  useEffect(() => {
    fetchWasteLogs()
    if (user?.role === "SUPER_ADMIN") {
      fetchBranches()
      fetchReviews()
    }
  }, [user])

  // Set today's date as default when form opens
  useEffect(() => {
    if (showForm && !editingLog) {
      const today = new Date().toISOString().split('T')[0]
      setFormData(prev => ({ ...prev, date: today }))
    }
  }, [showForm, editingLog])

  const fetchWasteLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/waste-logs", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (response.ok) {
        const data = await response.json()
        setWasteLogs(data.wasteLogs)
        addToast({
          type: "success",
          title: "Data Refreshed",
          message: "Waste logs have been refreshed successfully.",
        })
      } else {
        throw new Error('Failed to fetch waste logs')
      }
    } catch (error) {
      console.error("Failed to fetch waste logs:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to refresh waste logs. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch("/api/branches")
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches)
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews?status=PENDING")
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews)
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/waste-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.requiresApproval) {
          addToast({
            type: "info",
            title: "Submitted for Approval",
            message: "Your waste log has been submitted and is awaiting super admin approval.",
          })
        } else {
          addToast({
            type: "success",
            title: "Waste Log Created",
            message: "Waste log has been successfully created.",
          })
        }
        setShowForm(false)
        resetForm()
        fetchWasteLogs()
        if (user?.role === "SUPER_ADMIN") {
          fetchReviews()
        }
      }
    } catch (error) {
      console.error("Failed to create waste log:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to create waste log. Please try again.",
      })
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLog) return

    try {
      const response = await fetch(`/api/waste-logs/${editingLog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.requiresApproval) {
          addToast({
            type: "info",
            title: "Update Submitted",
            message: "Your update request has been submitted for super admin approval.",
          })
        } else {
          addToast({
            type: "success",
            title: "Waste Log Updated",
            message: "Waste log has been successfully updated.",
          })
        }
        setEditingLog(null)
        resetForm()
        fetchWasteLogs()
        if (user?.role === "SUPER_ADMIN") {
          fetchReviews()
        }
      }
    } catch (error) {
      console.error("Failed to update waste log:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to update waste log. Please try again.",
      })
    }
  }

  const handleDelete = async (reason: string) => {
    if (!deleteModal.wasteLog) return

    setDeleteModal((prev) => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch(`/api/waste-logs/${deleteModal.wasteLog.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.requiresApproval) {
          addToast({
            type: "info",
            title: "Delete Request Submitted",
            message: "Your delete request has been submitted for super admin approval.",
          })
        } else {
          addToast({
            type: "success",
            title: "Waste Log Deleted",
            message: "Waste log has been successfully deleted.",
          })
        }
        setDeleteModal({ isOpen: false, wasteLog: null, isLoading: false })
        fetchWasteLogs()
        if (user?.role === "SUPER_ADMIN") {
          fetchReviews()
        }
      }
    } catch (error) {
      console.error("Failed to delete waste log:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to delete waste log. Please try again.",
      })
      setDeleteModal((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const handleReviewAction = async (reviewId: string, action: "approve" | "reject") => {
    const reviewNotes = prompt(`Please provide notes for ${action}ing this request:`)
    if (!reviewNotes) return

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
        fetchWasteLogs()
      }
    } catch (error) {
      console.error("Failed to process review:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to process review. Please try again.",
      })
    }
  }

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      itemName: "",
      quantity: "",
      unit: "kg",
      value: "",
      reason: "SPOILAGE",
      branchId: "",
      photo: "",
      date: today,
    })
  }

  const openEditForm = (wasteLog: WasteLogWithBranch) => {
    setEditingLog(wasteLog)
    const logDate = new Date(wasteLog.createdAt).toISOString().split('T')[0]
    setFormData({
      itemName: wasteLog.itemName,
      quantity: wasteLog.quantity.toString(),
      unit: wasteLog.unit,
      value: wasteLog.value.toString(),
      reason: wasteLog.reason,
      branchId: wasteLog.branchId,
      photo: wasteLog.photo || "",
      date: logDate,
    })
    setShowForm(true)
  }

  const openDeleteModal = (wasteLog: WasteLogWithBranch) => {
    setDeleteModal({
      isOpen: true,
      wasteLog,
      isLoading: false,
    })
  }

  const formatReason = (reason: string) => {
    return reason
      .replace("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case "SPOILAGE":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case "OVERPRODUCTION":
        return <TrendingUp className="w-4 h-4 text-orange-500" />
      case "PLATE_WASTE":
        return <Trash2 className="w-4 h-4 text-yellow-500" />
      case "BUFFET_LEFTOVER":
        return <TrendingDown className="w-4 h-4 text-blue-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      case "APPROVED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        )
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  // Filter and sort waste logs
  const filteredWasteLogs = wasteLogs
    .filter((log) => {
      const matchesSearch = log.itemName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesReason = !filterReason || log.reason === filterReason
      const matchesBranch = !filterBranch || log.branchId === filterBranch
      return matchesSearch && matchesReason && matchesBranch
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof WasteLogWithBranch]
      const bValue = b[sortBy as keyof WasteLogWithBranch]

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kitchzero-primary"></div>
        <p className="ml-4 text-kitchzero-text">Loading waste management data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-kitchzero-text">Waste Management</h1>
          <p className="text-kitchzero-text/70 mt-2">Track, analyze, and reduce food waste across your operations</p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <button
            onClick={() => {
              fetchWasteLogs()
              if (user?.role === "SUPER_ADMIN") {
                fetchBranches()
                fetchReviews()
              }
            }}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 border border-kitchzero-border rounded-lg transition-colors ${
              loading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {user?.role === "SUPER_ADMIN" && reviews.length > 0 && (
            <button onClick={() => setShowReviews(true)} className="btn-secondary flex items-center space-x-2 relative">
              <Bell className="w-4 h-4" />
              <span>Reviews</span>
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {reviews.length}
              </span>
            </button>
          )}

          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Log Waste</span>
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card group hover:shadow-lg transition-all duration-200 border-l-4 border-l-kitchzero-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Total Entries</p>
              <p className="text-2xl font-bold text-kitchzero-text">{wasteLogs.length}</p>
              <p className="text-xs text-kitchzero-text/50 mt-1">All time records</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-kitchzero-primary/10 to-kitchzero-primary/20 rounded-xl group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-kitchzero-primary" />
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200 border-l-4 border-l-kitchzero-accent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Total Waste</p>
              <p className="text-2xl font-bold text-kitchzero-text">
                {wasteLogs.reduce((sum, log) => sum + log.quantity, 0).toFixed(1)} kg
              </p>
              <p className="text-xs text-kitchzero-text/50 mt-1">Weight accumulated</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-kitchzero-accent/10 to-kitchzero-accent/20 rounded-xl group-hover:scale-110 transition-transform">
              <Trash2 className="w-6 h-6 text-kitchzero-accent" />
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Total Value</p>
              <p className="text-2xl font-bold text-kitchzero-text">
                {wasteLogs
                  .reduce((sum, log) => sum + log.value, 0)
                  .toLocaleString("en-LK", {
                    style: "currency",
                    currency: "LKR",
                    minimumFractionDigits: 0,
                  })}
              </p>
              <p className="text-xs text-kitchzero-text/50 mt-1">Financial impact</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 rounded-xl group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card group hover:shadow-lg transition-all duration-200 border-l-4 border-l-kitchzero-success">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-kitchzero-text/70">Avg per Entry</p>
              <p className="text-2xl font-bold text-kitchzero-text">
                {wasteLogs.length > 0
                  ? (wasteLogs// Continue from previous code...

                  .reduce((sum, log) => sum + log.value, 0) / wasteLogs.length).toLocaleString("en-LK", {
                      style: "currency",
                      currency: "LKR",
                      minimumFractionDigits: 0,
                    })
                  : "LKR 0"}
              </p>
              <p className="text-xs text-kitchzero-text/50 mt-1">Per waste entry</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-kitchzero-success/10 to-kitchzero-success/20 rounded-xl group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6 text-kitchzero-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="card">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input w-full sm:w-64"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters
                    ? "bg-kitchzero-primary text-white border-kitchzero-primary"
                    : "border-kitchzero-border hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {(filterReason || filterBranch) && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-2 h-2"></span>
                )}
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-")
                  setSortBy(field)
                  setSortOrder(order as "asc" | "desc")
                }}
                className="select"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="value-desc">Highest Value</option>
                <option value="value-asc">Lowest Value</option>
                <option value="quantity-desc">Most Quantity</option>
                <option value="quantity-asc">Least Quantity</option>
              </select>

              <button className="btn-secondary flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 bg-gray-50 rounded-lg border">
              <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)} className="select">
                <option value="">All Reasons</option>
                <option value="SPOILAGE">Spoilage</option>
                <option value="OVERPRODUCTION">Overproduction</option>
                <option value="PLATE_WASTE">Plate Waste</option>
                <option value="BUFFET_LEFTOVER">Buffet Leftover</option>
              </select>

              {user?.role === "SUPER_ADMIN" && (
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="select">
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}

              {(filterReason || filterBranch) && (
                <button
                  onClick={() => {
                    setFilterReason("")
                    setFilterBranch("")
                  }}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Waste Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-kitchzero-text">Item</th>
                <th className="text-left py-4 px-6 font-semibold text-kitchzero-text">
                  <button
                    onClick={() => {
                      setSortBy("quantity")
                      setSortOrder(sortBy === "quantity" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                    className="flex items-center space-x-1 hover:text-kitchzero-primary"
                  >
                    <span>Quantity</span>
                    {sortBy === "quantity" &&
                      (sortOrder === "desc" ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="text-left py-4 px-6 font-semibold text-kitchzero-text">
                  <button
                    onClick={() => {
                      setSortBy("value")
                      setSortOrder(sortBy === "value" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                    className="flex items-center space-x-1 hover:text-kitchzero-primary"
                  >
                    <span>Value</span>
                    {sortBy === "value" &&
                      (sortOrder === "desc" ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="text-left py-4 px-6 font-semibold text-kitchzero-text">Reason</th>
                {user?.role === "SUPER_ADMIN" && (
                  <th className="text-left py-4 px-6 font-semibold text-kitchzero-text">Branch</th>
                )}
                <th className="text-left py-4 px-6 font-semibold text-kitchzero-text">
                  <button
                    onClick={() => {
                      setSortBy("createdAt")
                      setSortOrder(sortBy === "createdAt" && sortOrder === "desc" ? "asc" : "desc")
                    }}
                    className="flex items-center space-x-1 hover:text-kitchzero-primary"
                  >
                    <span>Date</span>
                    {sortBy === "createdAt" &&
                      (sortOrder === "desc" ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="text-right py-4 px-6 font-semibold text-kitchzero-text">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWasteLogs.map((log, index) => (
                <tr
                  key={log.id}
                  className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-25"}`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      {log.photo && (
                        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Camera className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-kitchzero-text">{log.itemName}</p>
                        <p className="text-sm text-kitchzero-text/70">{log.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-kitchzero-text">{log.quantity}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-kitchzero-text">
                      {log.value.toLocaleString("en-LK", {
                        style: "currency",
                        currency: "LKR",
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      {getReasonIcon(log.reason)}
                      <span className="text-sm font-medium">{formatReason(log.reason)}</span>
                    </div>
                  </td>
                  {user?.role === "SUPER_ADMIN" && (
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-kitchzero-text/70">{log.branch.name}</span>
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-kitchzero-text/70">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setViewingLog(log)}
                        className="p-2 text-kitchzero-primary hover:bg-kitchzero-primary/10 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditForm(log)}
                        className="p-2 text-kitchzero-secondary hover:bg-kitchzero-secondary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(log)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredWasteLogs.length === 0 && (
          <div className="text-center py-12">
            <Trash2 className="w-16 h-16 text-kitchzero-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-kitchzero-text mb-2">No waste logs found</h3>
            <p className="text-kitchzero-text/70 mb-6">
              {searchTerm || filterReason || filterBranch
                ? "Try adjusting your filters"
                : "Start by logging your first waste entry"}
            </p>
            {!searchTerm && !filterReason && !filterBranch && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                Log Your First Waste Entry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, wasteLog: null, isLoading: false })}
        onConfirm={handleDelete}
        title="Delete Waste Entry"
        description="Are you sure you want to delete this waste entry? This action cannot be undone."
        itemName={deleteModal.wasteLog?.itemName}
        requireReason={user?.role === "BRANCH_ADMIN"}
        isLoading={deleteModal.isLoading}
      />

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-kitchzero-text">
                {editingLog ? "Edit Waste Entry" : "Log New Waste Entry"}
              </h2>
              <p className="text-kitchzero-text/70 mt-1">
                {editingLog && user?.role === "BRANCH_ADMIN"
                  ? "Changes will require super admin approval"
                  : "Record food waste details for tracking and analysis"}
              </p>
            </div>

            <form onSubmit={editingLog ? handleEdit : handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-kitchzero-text mb-2">Item Name *</label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="input"
                    placeholder="e.g., Rice, Chicken, Vegetables"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-kitchzero-text mb-2">Quantity *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="input"
                    placeholder="0.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-kitchzero-text mb-2">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="select"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="pieces">Pieces</option>
                    <option value="liters">Liters</option>
                    <option value="portions">Portions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-kitchzero-text mb-2">Value (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-kitchzero-text mb-2">Waste Reason *</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="select"
                  >
                    <option value="SPOILAGE">Spoilage</option>
                    <option value="OVERPRODUCTION">Overproduction</option>
                    <option value="PLATE_WASTE">Plate Waste</option>
                    <option value="BUFFET_LEFTOVER">Buffet Leftover</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-kitchzero-text mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                {user?.role === "SUPER_ADMIN" && (
                  <div>
                    <label className="block text-sm font-semibold text-kitchzero-text mb-2">Branch *</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="select"
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} - {branch.location}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-kitchzero-text mb-2">Photo URL (Optional)</label>
                <input
                  type="url"
                  value={formData.photo}
                  onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                  className="input"
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-kitchzero-text/50 mt-1">Add a photo URL to document the waste</p>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingLog(null)
                    resetForm()
                  }}
                  className="px-6 py-2 border border-kitchzero-border rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-8">
                  {editingLog ? "Update Entry" : "Log Waste Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-kitchzero-text">Waste Entry Details</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-kitchzero-text/70">Item Name</p>
                  <p className="text-lg font-semibold text-kitchzero-text">{viewingLog.itemName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-kitchzero-text/70">Quantity</p>
                  <p className="text-lg font-semibold text-kitchzero-text">
                    {viewingLog.quantity} {viewingLog.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-kitchzero-text/70">Value</p>
                  <p className="text-lg font-semibold text-kitchzero-text">
                    {viewingLog.value.toLocaleString("en-LK", {
                      style: "currency",
                      currency: "LKR",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-kitchzero-text/70">Reason</p>
                  <div className="flex items-center space-x-2">
                    {getReasonIcon(viewingLog.reason)}
                    <p className="text-lg font-semibold text-kitchzero-text">{formatReason(viewingLog.reason)}</p>
                  </div>
                </div>
              </div>

              {user?.role === "SUPER_ADMIN" && (
                <div>
                  <p className="text-sm font-medium text-kitchzero-text/70">Branch</p>
                  <p className="text-lg font-semibold text-kitchzero-text">
                    {viewingLog.branch.name} - {viewingLog.branch.location}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-kitchzero-text/70">Date & Time</p>
                <p className="text-lg font-semibold text-kitchzero-text">
                  {new Date(viewingLog.createdAt).toLocaleString()}
                </p>
              </div>

              {viewingLog.photo && (
                <div>
                  <p className="text-sm font-medium text-kitchzero-text/70 mb-2">Photo</p>
                  <img
                    src={viewingLog.photo || "/placeholder.svg"}
                    alt="Waste photo"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button onClick={() => setViewingLog(null)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Reviews Modal */}
      {showReviews && user?.role === "SUPER_ADMIN" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-kitchzero-text">Pending Reviews</h2>
                  <p className="text-kitchzero-text/70 mt-1">
                    Review and approve changes requested by branch administrators
                  </p>
                </div>
                <button
                  onClick={() => setShowReviews(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium border ${
                                review.action === "CREATE"
                                  ? "text-green-600 bg-green-50 border-green-200"
                                  : review.action === "UPDATE"
                                    ? "text-blue-600 bg-blue-50 border-blue-200"
                                    : "text-red-600 bg-red-50 border-red-200"
                              }`}
                            >
                              {review.action} Request
                            </span>
                            {getStatusBadge(review.status)}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center space-x-2 text-sm text-kitchzero-text/70">
                              <User className="w-4 h-4" />
                              <span className="font-medium">{review.creator.username}</span>
                              <span className="text-kitchzero-text/50">({review.creator.role})</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-kitchzero-text/70">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {review.wasteLog && (
                            <div className="bg-gray-50 p-3 rounded-lg mb-3">
                              <p className="text-sm font-medium text-kitchzero-text">
                                Item: <span className="font-semibold">{review.wasteLog.itemName}</span>
                              </p>
                              <p className="text-sm text-kitchzero-text/70">Branch: {review.wasteLog.branch.name}</p>
                            </div>
                          )}

                          {review.reason && (
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                              <p className="text-sm font-medium text-blue-800">Reason:</p>
                              <p className="text-sm text-blue-700 italic">"{review.reason}"</p>
                            </div>
                          )}
                        </div>

                        {review.status === "PENDING" && (
                          <div className="flex space-x-3 ml-4">
                            <button
                              onClick={() => handleReviewAction(review.id, "approve")}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReviewAction(review.id, "reject")}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-kitchzero-text mb-2">All caught up!</h3>
                  <p className="text-kitchzero-text/70">No pending reviews at this time.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-kitchzero-text/70">
                  {reviews.length} pending review{reviews.length !== 1 ? "s" : ""}
                </p>
                <button onClick={() => setShowReviews(false)} className="btn-primary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}