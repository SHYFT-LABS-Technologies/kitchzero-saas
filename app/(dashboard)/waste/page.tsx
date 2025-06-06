"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from '@/components/auth-provider'; // Standard import
import { fetchWithCsrf } from '@/lib/api-client'; // Added import
import DeleteConfirmationModal from "@/components/ui/delete-confirmation-modal"
import { ToastContainer, useToast } from "@/components/ui/toast-notification"
import type { WasteLog, Branch } from "@/lib/types"
// Removed: import { api, ApiClientError } from "@/lib/api-client";
import { FormField } from "@/components/ui/form-field"
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
  Settings,
  Info,
  Zap,
  Target,
  Activity,
  ChevronDown,
  ExternalLink,
  Upload,
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
  // Obtain user session and CSRF token from authentication context.
  const { user, csrfToken } = useAuth();
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
    wasteDate: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetchWasteLogs(false) // Don't show toast on initial load
    if (user?.role === "SUPER_ADMIN") {
      fetchBranches()
      fetchReviews()
    }
  }, [user])

  const fetchWasteLogs = async (showToast = false) => {
    try {
      setLoading(true)
      const response = await fetch("/api/waste-logs", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Ensure wasteLogs is always an array
        const wasteLogsArray = Array.isArray(data.wasteLogs) ? data.wasteLogs : []
        setWasteLogs(wasteLogsArray)

        // Only show toast if explicitly requested (manual refresh)
        if (showToast) {
          addToast({
            type: "success",
            title: "Data Refreshed",
            message: "Waste logs have been refreshed successfully.",
          })
        }
      } else {
        throw new Error('Failed to fetch waste logs')
      }
    } catch (error) {
      console.error("Failed to fetch waste logs:", error)
      // Set empty array on error to prevent reduce issues
      setWasteLogs([])
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
        setBranches(Array.isArray(data.branches) ? data.branches : [])
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error)
      setBranches([])
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews?status=PENDING")
      if (response.ok) {
        const data = await response.json()
        setReviews(Array.isArray(data.reviews) ? data.reviews : [])
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error)
      setReviews([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)

      // API call with CSRF protection.
      const response = await fetchWithCsrf('/api/waste-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      }, csrfToken);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit waste log and parse error details.' }));
        // Attempt to replicate ApiClientError style error handling
        if (errorData.details && Array.isArray(errorData.details)) {
          addValidationErrors(errorData.details, "Please fix the following errors");
        } else {
          addToast({ type: "error", title: "Error", message: errorData.error || 'Failed to submit waste log.'});
        }
        throw new Error(errorData.error || 'Failed to submit waste log');
      }

      const result = await response.json();

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

    } catch (error) { // Error is already an Error instance or has been made one
      // Avoid re-wrapping if it's already a known error structure from above
      if (!(error instanceof Error && error.message.includes('Failed to submit waste log'))) {
         addToast({
           type: "error",
           title: "Submission Error",
           message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
         })
      }
      console.error("handleSubmit error:", error); // Keep console log for debugging
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLog) return

    try {
      // API call with CSRF protection.
      const response = await fetchWithCsrf(`/api/waste-logs/${editingLog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }, csrfToken);

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
        fetchWasteLogs(false) // Don't show refresh toast, we already show update success
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
      // API call with CSRF protection.
      const response = await fetchWithCsrf(`/api/waste-logs/${deleteModal.wasteLog.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }, csrfToken);

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
        fetchWasteLogs(false) // Don't show refresh toast, we already show delete success
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
      // API call with CSRF protection.
      const response = await fetchWithCsrf(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes }),
      }, csrfToken);

      if (response.ok) {
        addToast({
          type: "success",
          title: `Request ${action === "approve" ? "Approved" : "Rejected"}`,
          message: `The request has been successfully ${action}d.`,
        })
        fetchReviews()
        fetchWasteLogs(false) // Don't show refresh toast, we already show review action success
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
    setFormData({
      itemName: "",
      quantity: "",
      unit: "kg",
      value: "",
      reason: "SPOILAGE",
      branchId: "",
      photo: "",
      wasteDate: new Date().toISOString().split("T")[0],
    })
  }

  const openEditForm = (wasteLog: WasteLogWithBranch) => {
    setEditingLog(wasteLog)
    setFormData({
      itemName: wasteLog.itemName,
      quantity: wasteLog.quantity.toString(),
      unit: wasteLog.unit,
      value: wasteLog.value.toString(),
      reason: wasteLog.reason,
      branchId: wasteLog.branchId,
      photo: wasteLog.photo || "",
      wasteDate: new Date(wasteLog.createdAt).toISOString().split("T")[0],
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        )
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  // Safe stats calculation with array checks
  const stats = {
    total: Array.isArray(wasteLogs) ? wasteLogs.length : 0,
    totalWaste: Array.isArray(wasteLogs) ? wasteLogs.reduce((sum, log) => sum + (Number(log.quantity) || 0), 0) : 0,
    totalValue: Array.isArray(wasteLogs) ? wasteLogs.reduce((sum, log) => sum + (Number(log.value) || 0), 0) : 0,
    averageValue: (() => {
      if (!Array.isArray(wasteLogs) || wasteLogs.length === 0) return 0;
      const totalValue = wasteLogs.reduce((sum, log) => sum + (Number(log.value) || 0), 0);
      return totalValue / wasteLogs.length;
    })()
  }

  // Filter and sort waste logs safely
  const filteredWasteLogs = Array.isArray(wasteLogs)
    ? wasteLogs
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
    : []

  const addValidationErrors = (details: any[], title: string) => {
    details.forEach(detail => {
      addToast({
        type: "error",
        title: title,
        message: `${detail.field}: ${detail.message}`,
      })
    })
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
              <h3 className="text-lg font-semibold text-slate-900">Loading Waste Management</h3>
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
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Waste Management
                  </h1>
                  <p className="text-slate-600 mt-1 text-sm lg:text-base">
                    Track, analyze, and reduce food waste across your operations
                  </p>
                </div>
              </div>

              <div className="mt-6 lg:mt-0 flex items-center space-x-3">
                <button
                  onClick={() => {
                    fetchWasteLogs(true) // Show toast for manual refresh only
                    if (user?.role === "SUPER_ADMIN") {
                      fetchBranches()
                      fetchReviews()
                    }
                  }}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-sm shadow-sm ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                    }`}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>

                {user?.role === "SUPER_ADMIN" && Array.isArray(reviews) && reviews.length > 0 && (
                  <button
                    onClick={() => setShowReviews(true)}
                    className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                  >
                    <Bell className="w-4 h-4" />
                    Reviews
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse shadow-lg">
                      {reviews.length}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Log Waste
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Entries Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                  <div className="text-xs text-slate-500 font-medium">ENTRIES</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Total Entries</h3>
                <p className="text-sm text-slate-500">All time records tracked</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Total Waste Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-red-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {stats.totalWaste.toFixed(1)}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">KG</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Total Waste</h3>
                <p className="text-sm text-slate-500">Weight accumulated</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Total Value Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-pink-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(stats.totalValue)}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">VALUE</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Financial Impact</h3>
                <p className="text-sm text-slate-500">Total value lost</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Average per Entry Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(stats.averageValue)}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">AVG</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Average Value</h3>
                <p className="text-sm text-slate-500">Per waste entry</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col space-y-4">
              {/* Main Search and Filter Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                  {/* Enhanced Search Input */}
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-kitchzero-primary transition-colors" />
                    <input
                      type="text"
                      placeholder="Search waste items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-80 pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    />
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 font-medium text-sm ${showFilters
                      ? "bg-kitchzero-primary text-white border-kitchzero-primary shadow-lg"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                    {(filterReason || filterBranch) && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </button>
                </div>

                {/* Sort and Export Controls */}
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split("-")
                        setSortBy(field)
                        setSortOrder(order as "asc" | "desc")
                      }}
                      className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200"
                    >
                      <option value="createdAt-desc">Newest First</option>
                      <option value="createdAt-asc">Oldest First</option>
                      <option value="value-desc">Highest Value</option>
                      <option value="value-asc">Lowest Value</option>
                      <option value="quantity-desc">Most Quantity</option>
                      <option value="quantity-asc">Least Quantity</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              {showFilters && (
                <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 rounded-xl border border-slate-200/60 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Waste Reason</label>
                      <select
                        value={filterReason}
                        onChange={(e) => setFilterReason(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200"
                      >
                        <option value="">All Reasons</option>
                        <option value="SPOILAGE">Spoilage</option>
                        <option value="OVERPRODUCTION">Overproduction</option>
                        <option value="PLATE_WASTE">Plate Waste</option>
                        <option value="BUFFET_LEFTOVER">Buffet Leftover</option>
                      </select>
                    </div>

                    {user?.role === "SUPER_ADMIN" && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Branch Location</label>
                        <select
                          value={filterBranch}
                          onChange={(e) => setFilterBranch(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200"
                        >
                          <option value="">All Branches</option>
                          {Array.isArray(branches) && branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(filterReason || filterBranch) && (
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-transparent mb-2">Clear</label>
                        <button
                          onClick={() => {
                            setFilterReason("")
                            setFilterBranch("")
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all duration-200 font-medium"
                        >
                          <X className="w-4 h-4" />
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">
                    Item Details
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">
                    <button
                      onClick={() => {
                        setSortBy("quantity")
                        setSortOrder(sortBy === "quantity" && sortOrder === "desc" ? "asc" : "desc")
                      }}
                      className="flex items-center gap-1.5 hover:text-kitchzero-primary transition-colors group"
                    >
                      Quantity
                      {sortBy === "quantity" && (
                        sortOrder === "desc" ?
                          <SortDesc className="w-4 h-4 text-kitchzero-primary" /> :
                          <SortAsc className="w-4 h-4 text-kitchzero-primary" />
                      )}
                      {sortBy !== "quantity" && (
                        <div className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity">
                          <SortDesc className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">
                    <button
                      onClick={() => {
                        setSortBy("value")
                        setSortOrder(sortBy === "value" && sortOrder === "desc" ? "asc" : "desc")
                      }}
                      className="flex items-center gap-1.5 hover:text-kitchzero-primary transition-colors group"
                    >
                      Financial Impact
                      {sortBy === "value" && (
                        sortOrder === "desc" ?
                          <SortDesc className="w-4 h-4 text-kitchzero-primary" /> :
                          <SortAsc className="w-4 h-4 text-kitchzero-primary" />
                      )}
                      {sortBy !== "value" && (
                        <div className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity">
                          <SortDesc className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Waste Category</th>
                  {user?.role === "SUPER_ADMIN" && (
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Location</th>
                  )}
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">
                    <button
                      onClick={() => {
                        setSortBy("createdAt")
                        setSortOrder(sortBy === "createdAt" && sortOrder === "desc" ? "asc" : "desc")
                      }}
                      className="flex items-center gap-1.5 hover:text-kitchzero-primary transition-colors group"
                    >
                      Date Logged
                      {sortBy === "createdAt" && (
                        sortOrder === "desc" ?
                          <SortDesc className="w-4 h-4 text-kitchzero-primary" /> :
                          <SortAsc className="w-4 h-4 text-kitchzero-primary" />
                      )}
                      {sortBy !== "createdAt" && (
                        <div className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity">
                          <SortDesc className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  </th>
                  <th className="text-right py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWasteLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className="group hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-transparent transition-all duration-200"
                  >
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-kitchzero-primary/10 group-hover:to-kitchzero-secondary/10 transition-all duration-200">
                          {log.photo ? (
                            <Camera className="w-5 h-5 text-slate-500 group-hover:text-kitchzero-primary transition-colors" />
                          ) : (
                            <FileText className="w-5 h-5 text-slate-500 group-hover:text-kitchzero-primary transition-colors" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{log.itemName}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">Unit: {log.unit}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="text-lg font-bold text-slate-900">{Number(log.quantity).toFixed(1)}</div>
                      <div className="text-xs text-slate-500 font-medium">{log.unit}</div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="text-lg font-bold text-red-600">
                        {new Intl.NumberFormat("en-LK", {
                          style: "currency",
                          currency: "LKR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }).format(Number(log.value) || 0)}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">Cost impact</div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors">
                          {getReasonIcon(log.reason)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{formatReason(log.reason)}</div>
                          <div className="text-xs text-slate-500">Waste type</div>
                        </div>
                      </div>
                    </td>

                    {user?.role === "SUPER_ADMIN" && (
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors">
                            <MapPin className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{log.branch?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">Branch location</div>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-5 px-6">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors">
                          <Calendar className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingLog(log)}
                          className="p-2.5 text-slate-400 hover:text-kitchzero-primary hover:bg-kitchzero-primary/5 rounded-xl transition-all duration-200 group/btn"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => openEditForm(log)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group/btn"
                          title="Edit Entry"
                        >
                          <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(log)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group/btn"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enhanced Empty State */}
          {filteredWasteLogs.length === 0 && (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">No waste logs found</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                {searchTerm || filterReason || filterBranch
                  ? "No entries match your current filters. Try adjusting your search criteria."
                  : "Start tracking your food waste to gain insights and reduce costs across your operations."}
              </p>
              {!searchTerm && !filterReason && !filterBranch && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  Log Your First Waste Entry
                </button>
              )}
            </div>
          )}
        </div>
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

      {/* Enhanced Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingLog(null)
                  resetForm()
                }}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {editingLog ? "Edit Waste Entry" : "Log New Waste Entry"}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    {editingLog && user?.role === "BRANCH_ADMIN"
                      ? "Changes will require super admin approval"
                      : "Record food waste details for tracking and analysis"}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={editingLog ? handleEdit : handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Item Name *</label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    placeholder="e.g., Rice, Chicken, Vegetables"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Waste Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="date"
                      value={formData.wasteDate}
                      onChange={(e) => setFormData({ ...formData, wasteDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                      max={new Date().toISOString().split("T")[0]} // Prevent future dates
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">When did the waste occur?</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    placeholder="0.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="pieces">Pieces</option>
                    <option value="liters">Liters</option>
                    <option value="portions">Portions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Value (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Waste Reason *</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                  >
                    <option value="SPOILAGE">Spoilage</option>
                    <option value="OVERPRODUCTION">Overproduction</option>
                    <option value="PLATE_WASTE">Plate Waste</option>
                    <option value="BUFFET_LEFTOVER">Buffet Leftover</option>
                  </select>
                </div>

                {user?.role === "SUPER_ADMIN" && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Branch *</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                      required
                    >
                      <option value="">Select Branch</option>
                      {Array.isArray(branches) && branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} - {branch.location}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Photo URL (Optional)</label>
                <input
                  type="url"
                  value={formData.photo}
                  onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-slate-500 mt-1">Add a photo URL to document the waste</p>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingLog(null)
                    resetForm()
                  }}
                  className="px-6 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : (editingLog ? "Update Entry" : "Log Waste Entry")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced View Details Modal */}
      {viewingLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
              <button
                onClick={() => setViewingLog(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Waste Entry Details</h2>
                  <p className="text-white/80 text-sm mt-1">Complete entry information</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Item Name</label>
                  <p className="text-lg font-bold text-slate-900">{viewingLog.itemName}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</label>
                  <p className="text-lg font-bold text-slate-900">
                    {Number(viewingLog.quantity).toFixed(1)} {viewingLog.unit}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Financial Value</label>
                  <p className="text-lg font-bold text-red-600">
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(Number(viewingLog.value) || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Waste Reason</label>
                  <div className="flex items-center gap-2">
                    {getReasonIcon(viewingLog.reason)}
                    <p className="text-lg font-bold text-slate-900">{formatReason(viewingLog.reason)}</p>
                  </div>
                </div>
              </div>

              {user?.role === "SUPER_ADMIN" && viewingLog.branch && (
                <div className="space-y-2 pt-4 border-t border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Branch Location</label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <p className="text-lg font-bold text-slate-900">
                      {viewingLog.branch.name} - {viewingLog.branch.location}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Time Logged</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-lg font-bold text-slate-900">
                    {new Date(viewingLog.createdAt).toLocaleDateString()} at{" "}
                    {new Date(viewingLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {viewingLog.photo && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Documentation Photo</label>
                  <div className="relative group">
                    <img
                      src={viewingLog.photo || "/placeholder.svg"}
                      alt="Waste documentation"
                      className="w-full h-48 object-cover rounded-xl border border-slate-200 group-hover:shadow-lg transition-all duration-200"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-all duration-200 flex items-center justify-center">
                      <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingLog(null)}
                className="px-6 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Reviews Modal */}
      {showReviews && user?.role === "SUPER_ADMIN" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
              <button
                onClick={() => setShowReviews(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Pending Reviews</h2>
                  <p className="text-white/80 text-sm mt-1">
                    Review and approve changes requested by branch administrators</p>
                </div>
              </div>
              {Array.isArray(reviews) && reviews.length > 0 && (
                <div className="absolute top-6 right-16">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full text-sm font-semibold">
                    <Activity className="w-4 h-4" />
                    {reviews.length} pending
                  </span>
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="max-h-[calc(90vh-200px)] overflow-y-auto p-6">
              {Array.isArray(reviews) && reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="group relative overflow-hidden bg-white border border-slate-200 rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-slate-50/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            {/* Action Type and Status */}
                            <div className="flex items-center gap-3 mb-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${review.action === "CREATE"
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : review.action === "UPDATE"
                                    ? "text-blue-700 bg-blue-50 border-blue-200"
                                    : "text-red-700 bg-red-50 border-red-200"
                                  }`}
                              >
                                {review.action === "CREATE" && <Plus className="w-3 h-3" />}
                                {review.action === "UPDATE" && <Edit className="w-3 h-3" />}
                                {review.action === "DELETE" && <Trash2 className="w-3 h-3" />}
                                {review.action} Request
                              </span>
                              {getStatusBadge(review.status)}
                            </div>

                            {/* User and Date Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                                  <User className="w-5 h-5 text-slate-500" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 text-sm">{review.creator.username}</div>
                                  <div className="text-xs text-slate-500">{review.creator.role}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-slate-500" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 text-sm">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Waste Log Details */}
                            {review.wasteLog && (
                              <div className="bg-gradient-to-r from-slate-50 to-slate-50/50 border border-slate-200 rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <FileText className="w-5 h-5 text-slate-500" />
                                  <div>
                                    <div className="font-semibold text-slate-900">
                                      {review.wasteLog.itemName}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      Branch: {review.wasteLog.branch.name}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Reason */}
                            {review.reason && (
                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                  <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="font-semibold text-blue-900 text-sm mb-1">Request Reason:</div>
                                    <div className="text-blue-700 text-sm italic leading-relaxed">
                                      "{review.reason}"
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {review.status === "PENDING" && (
                            <div className="flex gap-3 ml-6">
                              <button
                                onClick={() => handleReviewAction(review.id, "approve")}
                                className="group/btn flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                              >
                                <CheckCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewAction(review.id, "reject")}
                                className="group/btn flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                              >
                                <XCircle className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">All caught up!</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    No pending reviews at this time. All requests have been processed.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {Array.isArray(reviews) ? reviews.length : 0} pending review{(Array.isArray(reviews) && reviews.length !== 1) ? "s" : ""}
                </span>
              </div>
              <button
                onClick={() => setShowReviews(false)}
                className="px-6 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Close Reviews
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}