"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import type { InventoryItem, Branch } from "@/lib/types"
import { Plus, Package, Calendar, DollarSign, AlertTriangle } from "lucide-react"

export default function InventoryPage() {
  const { user } = useAuth()
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
    try {
      const response = await fetch("/api/inventory")
      if (response.ok) {
        const data = await response.json()
        setInventory(data.inventory)
      }
    } catch (error) {
      console.error("Failed to fetch inventory:", error)
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
        setShowForm(false)
        setFormData({
          itemName: "",
          quantity: "",
          unit: "kg",
          expiryDate: "",
          purchaseCost: "",
          branchId: "",
        })
        fetchInventory()
      }
    } catch (error) {
      console.error("Failed to create inventory item:", error)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kitchzero-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-kitchzero-text">Inventory Management</h1>
          <p className="text-kitchzero-text/70 mt-2">Track your stock items and expiry dates</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Add Item Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-xl font-semibold text-kitchzero-text mb-6">Add New Inventory Item</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Item Name</label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <input
                type="number"
                step="0.1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="select"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="pieces">Pieces</option>
                <option value="liters">Liters</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Expiry Date</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Purchase Cost (LKR)</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchaseCost}
                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                className="input"
                required
              />
            </div>

            {user?.role === "SUPER_ADMIN" && (
              <div>
                <label className="block text-sm font-medium mb-2">Branch</label>
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

            <div className="md:col-span-2 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-kitchzero-border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Add Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-kitchzero-text mb-6">Current Inventory</h2>
        {inventory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border-2 ${
                  isExpired(item.expiryDate)
                    ? "border-red-500 bg-red-50"
                    : isExpiringSoon(item.expiryDate)
                      ? "border-kitchzero-warning bg-kitchzero-warning/10"
                      : "border-kitchzero-border bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-kitchzero-primary/10 rounded-full">
                      <Package className="w-5 h-5 text-kitchzero-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-kitchzero-text">{item.itemName}</h3>
                      <p className="text-sm text-kitchzero-text/70">
                        {item.quantity} {item.unit}
                      </p>
                      {user?.role === "SUPER_ADMIN" && item.branch && (
                        <p className="text-xs text-kitchzero-text/50">{item.branch.name}</p>
                      )}
                    </div>
                  </div>
                  {(isExpired(item.expiryDate) || isExpiringSoon(item.expiryDate)) && (
                    <AlertTriangle className="w-5 h-5 text-kitchzero-warning" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1 text-kitchzero-text/70">
                      <Calendar className="w-4 h-4" />
                      <span>Expires: {new Date(item.expiryDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-kitchzero-text">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">
                        {item.purchaseCost.toLocaleString("en-LK", {
                          style: "currency",
                          currency: "LKR",
                        })}
                      </span>
                    </div>
                  </div>

                  {isExpired(item.expiryDate) && (
                    <div className="text-xs text-red-600 font-medium">⚠️ EXPIRED - Consider logging as waste</div>
                  )}

                  {isExpiringSoon(item.expiryDate) && !isExpired(item.expiryDate) && (
                    <div className="text-xs text-kitchzero-warning font-medium">
                      ⏰ Expires soon - Use within 7 days
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-kitchzero-text/70 text-center py-8">No inventory items found.</p>
        )}
      </div>
    </div>
  )
}
