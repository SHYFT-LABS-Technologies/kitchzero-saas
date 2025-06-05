"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import DeleteConfirmationModal from "@/components/ui/delete-confirmation-modal"
import { ToastContainer, useToast } from "@/components/ui/toast-notification"
import type { InventoryItem, Branch } from "@/lib/types"
import {
  Plus,
  Package,
  DollarSign,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Download,
  RefreshCw,
  X,
  MapPin,
  Clock,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  ChevronDownIcon,
  Calendar,
} from "lucide-react"

interface InventoryItemWithBranch extends InventoryItem {
  branch: Branch
}

type SortField = "itemName" | "quantity" | "expiryDate" | "purchaseCost" | "createdAt"
type SortOrder = "asc" | "desc"

export default function InventoryPage() {
  const { user } = useAuth()
  const { toasts, addToast, removeToast } = useToast()
  const [inventory, setInventory] = useState<InventoryItemWithBranch[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItemWithBranch | null>(null)
  const [viewingItem, setViewingItem] = useState<InventoryItemWithBranch | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterBranch, setFilterBranch] = useState("")
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [showFilters, setShowFilters] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    item: InventoryItemWithBranch | null
    isLoading: boolean
  }>({
    isOpen: false,
    item: null,
    isLoading: false,
  })
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "kg",
    expiryDate: "",
    purchaseCost: "",
    branchId: "",
  })

  useEffect(() => {
    fetchInventory()
    if (user?.role === "SUPER_ADMIN") {
      fetchBranches()
    }
  }, [user])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/inventory", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      if (response.ok) {
        const data = await response.json()
        setInventory(data.inventory)
        addToast({
          type: "success",
          title: "Data Refreshed",
          message: "Inventory data has been refreshed successfully.",
        })
      } else {
        throw new Error("Failed to fetch inventory")
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to refresh inventory. Please try again.",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        addToast({
          type: "success",
          title: "Inventory Item Created",
          message: "Inventory item has been successfully created.",
        })
        setShowForm(false)
        resetForm()
        fetchInventory()
      }
    } catch (error) {
      console.error("Failed to create inventory item:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to create inventory item. Please try again.",
      })
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    try {
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        addToast({
          type: "success",
          title: "Inventory Item Updated",
          message: "Inventory item has been successfully updated.",
        })
        setEditingItem(null)
        resetForm()
        fetchInventory()
      }
    } catch (error) {
      console.error("Failed to update inventory item:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to update inventory item. Please try again.",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.item) return

    setDeleteModal((prev) => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch(`/api/inventory/${deleteModal.item.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        addToast({
          type: "success",
          title: "Inventory Item Deleted",
          message: "Inventory item has been successfully deleted.",
        })
        setDeleteModal({ isOpen: false, item: null, isLoading: false })
        fetchInventory()
      }
    } catch (error) {
      console.error("Failed to delete inventory item:", error)
      addToast({
        type: "error",
        title: "Error",
        message: "Failed to delete inventory item. Please try again.",
      })
      setDeleteModal((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const resetForm = () => {
    setFormData({
      itemName: "",
      quantity: "",
      unit: "kg",
      expiryDate: "",
      purchaseCost: "",
      branchId: "",
    })
  }

  const openEditForm = (item: InventoryItemWithBranch) => {
    setEditingItem(item)
    setFormData({
      itemName: item.itemName,
      quantity: item.quantity.toString(),
      unit: item.unit,
      expiryDate: item.expiryDate.toISOString().split("T")[0],
      purchaseCost: item.purchaseCost.toString(),
      branchId: item.branchId,
    })
    setShowForm(true)
  }

  const openDeleteModal = (item: InventoryItemWithBranch) => {
    setDeleteModal({
      isOpen: true,
      item,
      isLoading: false,
    })
  }

  const isExpiringSoon = (expiryDate: Date) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7 && diffDays >= 0
  }

  const isExpired = (expiryDate: Date) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    return expiry < today
  }

  const getStatusBadge = (expiryDate: Date) => {
    if (isExpired(expiryDate)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3" />
          Expired
        </span>
      )
    }
    if (isExpiringSoon(expiryDate)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          Expiring Soon
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <TrendingUp className="w-3 h-3" />
        Fresh
      </span>
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortOrder === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  // Filter and sort inventory
  const filteredInventory = inventory
    .filter((item) => {
      const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        !filterStatus ||
        (filterStatus === "expired" && isExpired(item.expiryDate)) ||
        (filterStatus === "expiring" && isExpiringSoon(item.expiryDate)) ||
        (filterStatus === "fresh" && !isExpired(item.expiryDate) && !isExpiringSoon(item.expiryDate))
      const matchesBranch = !filterBranch || item.branchId === filterBranch
      return matchesSearch && matchesStatus && matchesBranch
    })
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const stats = {
    total: inventory.length,
    expired: inventory.filter((item) => isExpired(item.expiryDate)).length,
    expiring: inventory.filter((item) => isExpiringSoon(item.expiryDate)).length,
    fresh: inventory.filter((item) => !isExpired(item.expiryDate) && !isExpiringSoon(item.expiryDate)).length,
    totalValue: inventory.reduce((sum, item) => sum + item.purchaseCost, 0),
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
              <h3 className="text-lg font-semibold text-slate-900">Loading Inventory Management</h3>
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
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Inventory Management
                  </h1>
                  <p className="text-slate-600 mt-1 text-sm lg:text-base">
                    Track your stock items, monitor expiry dates, and manage inventory levels
                  </p>
                </div>
              </div>

              <div className="mt-6 lg:mt-0 flex items-center space-x-3">
                <button
                  onClick={() => {
                    fetchInventory()
                    if (user?.role === "SUPER_ADMIN") {
                      fetchBranches()
                    }
                  }}
                  disabled={loading}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-sm shadow-sm ${
                    loading ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Refreshing..." : "Refresh"}
                </button>

                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Total Items Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                  <div className="text-xs text-slate-500 font-medium">ITEMS</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Total Items</h3>
                <p className="text-sm text-slate-500">All inventory tracked</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Fresh Items Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{stats.fresh}</div>
                  <div className="text-xs text-slate-500 font-medium">FRESH</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Fresh Items</h3>
                <p className="text-sm text-slate-500">Good condition stock</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Expiring Soon Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-orange-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{stats.expiring}</div>
                  <div className="text-xs text-slate-500 font-medium">EXPIRING</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Expiring Soon</h3>
                <p className="text-sm text-slate-500">Within 7 days</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Expired Items Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-pink-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{stats.expired}</div>
                  <div className="text-xs text-slate-500 font-medium">EXPIRED</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Expired Items</h3>
                <p className="text-sm text-slate-500">Needs attention</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-pink-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Total Value Card */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-violet-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">
                    {stats.totalValue.toLocaleString("en-LK", {
                      style: "currency",
                      currency: "LKR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">VALUE</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Total Value</h3>
                <p className="text-sm text-slate-500">Inventory worth</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
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
                      placeholder="Search inventory items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-80 pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    />
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 font-medium text-sm ${
                      showFilters
                        ? "bg-kitchzero-primary text-white border-kitchzero-primary shadow-lg"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    <ChevronDownIcon
                      className={`w-4 h-4 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`}
                    />
                    {(filterStatus || filterBranch) && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </button>
                </div>

                {/* Export Controls */}
                <div className="flex items-center space-x-3">
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
                      <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200"
                      >
                        <option value="">All Status</option>
                        <option value="fresh">Fresh</option>
                        <option value="expiring">Expiring Soon</option>
                        <option value="expired">Expired</option>
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
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(filterStatus || filterBranch) && (
                      <div className="flex-shrink-0">
                        <label className="block text-sm font-medium text-transparent mb-2">Clear</label>
                        <button
                          onClick={() => {
                            setFilterStatus("")
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
                    <button
                      onClick={() => handleSort("itemName")}
                      className="flex items-center gap-1.5 hover:text-kitchzero-primary transition-colors group"
                    >
                      Item Details
                      {getSortIcon("itemName")}
                    </button>
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">
                    <button
                      onClick={() => handleSort("quantity")}
                      className="flex items-center gap-1.5 hover:text-kitchzero-primary transition-colors group"
                    >
                      Quantity
                      {getSortIcon("quantity")}
                    </button>
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">
                    <button
                      onClick={() => handleSort("expiryDate")}
                      className="flex items-center gap-1.5 hover:text-kitchzero-primary transition-colors group"
                    >
                      Expiry Date
                      {getSortIcon("expiryDate")}
                    </button>
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">
                    <button
                      onClick={() => handleSort("purchaseCost")}
                      className="flex items-center gap-1.5 hover:text-kitchzero-primary transition-colors group"
                    >
                      Cost
                      {getSortIcon("purchaseCost")}
                    </button>
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Status</th>
                  {user?.role === "SUPER_ADMIN" && (
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Branch</th>
                  )}
                  <th className="text-right py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-transparent transition-all duration-200"
                  >
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-kitchzero-primary/10 group-hover:to-kitchzero-secondary/10 transition-all duration-200">
                          <Package className="w-5 h-5 text-slate-500 group-hover:text-kitchzero-primary transition-colors" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{item.itemName}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">Unit: {item.unit}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="text-lg font-bold text-slate-900">{item.quantity}</div>
                      <div className="text-xs text-slate-500 font-medium">{item.unit}</div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="text-sm font-semibold text-slate-900">
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {Math.ceil(
                          (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                        )}{" "}
                        days
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <div className="text-lg font-bold text-slate-900">
                        {item.purchaseCost.toLocaleString("en-LK", {
                          style: "currency",
                          currency: "LKR",
                          minimumFractionDigits: 0,
                        })}
                      </div>
                      <div className="text-xs text-slate-500">Purchase cost</div>
                    </td>

                    <td className="py-5 px-6">{getStatusBadge(item.expiryDate)}</td>

                    {user?.role === "SUPER_ADMIN" && (
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white transition-colors">
                            <MapPin className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{item.branch.name}</div>
                            <div className="text-xs text-slate-500">Branch location</div>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-5 px-6">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="p-2.5 text-slate-400 hover:text-kitchzero-primary hover:bg-kitchzero-primary/5 rounded-xl transition-all duration-200 group/btn"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => openEditForm(item)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 group/btn"
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(item)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group/btn"
                          title="Delete Item"
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
          {filteredInventory.length === 0 && (
            <div className="text-center py-16 px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">No inventory items found</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                {searchTerm || filterStatus || filterBranch
                  ? "No items match your current filters. Try adjusting your search criteria."
                  : "Start by adding your first inventory item to track your stock levels and expiry dates."}
              </p>
              {!searchTerm && !filterStatus && !filterBranch && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Item
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, isLoading: false })}
        onConfirm={handleDelete}
        title="Delete Inventory Item"
        description="Are you sure you want to delete this inventory item? This action cannot be undone."
        itemName={deleteModal.item?.itemName}
        requireReason={false}
        isLoading={deleteModal.isLoading}
      />

      {/* Enhanced Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
              <button
                onClick={() => {
                  setShowForm(false)
                  setEditingItem(null)
                  resetForm()
                }}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    {editingItem ? "Update the inventory item details" : "Add a new item to your inventory"}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={editingItem ? handleEdit : handleSubmit} className="p-6 space-y-6">
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
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Expiry Date *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Purchase Cost (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    placeholder="0.00"
                    required
                  />
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
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} - {branch.location}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="px-6 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {editingItem ? "Update Item" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced View Details Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
              <button
                onClick={() => setViewingItem(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Inventory Item Details</h2>
                  <p className="text-white/80 text-sm mt-1">Complete item information</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Item Name</label>
                  <p className="text-lg font-bold text-slate-900">{viewingItem.itemName}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quantity</label>
                  <p className="text-lg font-bold text-slate-900">
                    {viewingItem.quantity} {viewingItem.unit}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Purchase Cost</label>
                  <p className="text-lg font-bold text-slate-900">
                    {viewingItem.purchaseCost.toLocaleString("en-LK", {
                      style: "currency",
                      currency: "LKR",
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                  <div className="mt-1">{getStatusBadge(viewingItem.expiryDate)}</div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry Date</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <p className="text-lg font-bold text-slate-900">
                    {new Date(viewingItem.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {user?.role === "SUPER_ADMIN" && viewingItem.branch && (
                <div className="space-y-2 pt-4 border-t border-slate-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Branch Location
                  </label>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <p className="text-lg font-bold text-slate-900">
                      {viewingItem.branch.name} - {viewingItem.branch.location}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t border-slate-200">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Added On</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <p className="text-lg font-bold text-slate-900">
                    {new Date(viewingItem.createdAt).toLocaleDateString()} at{" "}
                    {new Date(viewingItem.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingItem(null)}
                className="px-6 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
