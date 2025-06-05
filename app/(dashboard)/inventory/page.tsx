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
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Expired</span>
    }
    if (isExpiringSoon(expiryDate)) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">Expiring Soon</span>
      )
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Fresh</span>
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="ml-4 text-gray-700">Loading inventory data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">
            Track your stock items, monitor expiry dates, and manage inventory levels
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex items-center space-x-4">
          <button
            onClick={() => {
              fetchInventory()
              if (user?.role === "SUPER_ADMIN") {
                fetchBranches()
              }
            }}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg transition-colors ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fresh Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.fresh}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expiring}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalValue.toLocaleString("en-LK", {
                  style: "currency",
                  currency: "LKR",
                  minimumFractionDigits: 0,
                })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters ? "bg-green-600 text-white border-green-600" : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {(filterStatus || filterBranch) && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-2 h-2"></span>
                )}
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 bg-gray-50 rounded-lg border">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="fresh">Fresh</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>

              {user?.role === "SUPER_ADMIN" && (
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}

              {(filterStatus || filterBranch) && (
                <button
                  onClick={() => {
                    setFilterStatus("")
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

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("itemName")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Item Name</span>
                    {getSortIcon("itemName")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("quantity")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Quantity</span>
                    {getSortIcon("quantity")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("expiryDate")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Expiry Date</span>
                    {getSortIcon("expiryDate")}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("purchaseCost")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Cost</span>
                    {getSortIcon("purchaseCost")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {user?.role === "SUPER_ADMIN" && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <Package className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                        <div className="text-sm text-gray-500">{item.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.quantity}</div>
                    <div className="text-sm text-gray-500">{item.unit}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{new Date(item.expiryDate).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">
                      {Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}{" "}
                      days
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.purchaseCost.toLocaleString("en-LK", {
                        style: "currency",
                        currency: "LKR",
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.expiryDate)}</td>
                  {user?.role === "SUPER_ADMIN" && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{item.branch.name}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setViewingItem(item)}
                        className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditForm(item)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(item)}
                        className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
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

        {filteredInventory.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus || filterBranch
                ? "Try adjusting your filters"
                : "Start by adding your first inventory item"}
            </p>
            {!searchTerm && !filterStatus && !filterBranch && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Add Your First Item
              </button>
            )}
          </div>
        )}
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

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
              </h2>
              <p className="text-gray-600 mt-1">
                {editingItem ? "Update the inventory item details" : "Add a new item to your inventory"}
              </p>
            </div>

            <form onSubmit={editingItem ? handleEdit : handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Item Name *</label>
                  <input
                    type="text"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Rice, Chicken, Vegetables"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="pieces">Pieces</option>
                    <option value="liters">Liters</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date *</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Purchase Cost (LKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    required
                  />
                </div>

                {user?.role === "SUPER_ADMIN" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Branch *</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingItem(null)
                    resetForm()
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-medium transition-colors"
                >
                  {editingItem ? "Update Item" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Inventory Item Details</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Item Name</p>
                  <p className="text-lg font-semibold text-gray-900">{viewingItem.itemName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Quantity</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingItem.quantity} {viewingItem.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Purchase Cost</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingItem.purchaseCost.toLocaleString("en-LK", {
                      style: "currency",
                      currency: "LKR",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <div className="mt-1">{getStatusBadge(viewingItem.expiryDate)}</div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Expiry Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(viewingItem.expiryDate).toLocaleDateString()}
                </p>
              </div>

              {user?.role === "SUPER_ADMIN" && viewingItem.branch && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Branch</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {viewingItem.branch.name} - {viewingItem.branch.location}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-500">Added On</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(viewingItem.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingItem(null)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
