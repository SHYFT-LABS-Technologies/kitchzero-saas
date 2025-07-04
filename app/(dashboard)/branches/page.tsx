"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import type { Branch, User } from "@/lib/types"
import {
  Plus,
  Building2,
  MapPin,
  Users,
  Package,
  Trash2,
  Edit,
  UserPlus,
  X,
  Calendar,
  Shield,
  BarChart3,
  Clock,
} from "lucide-react"

interface BranchWithStats extends Branch {
  users: User[]
  _count: {
    inventory: number
    wasteLogs: number
  }
}

export default function BranchesPage() {
  const { user } = useAuth()
  const [branches, setBranches] = useState<BranchWithStats[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showBranchForm, setShowBranchForm] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingBranch, setEditingBranch] = useState<BranchWithStats | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [branchFormData, setBranchFormData] = useState({
    name: "",
    location: "",
  })
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    role: "BRANCH_ADMIN" as "SUPER_ADMIN" | "BRANCH_ADMIN",
    branchId: "",
  })

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchBranches()
      fetchUsers()
    }
  }, [user])

  const fetchBranches = async () => {
    try {
      const response = await fetch("/api/branches")
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches)
      }
    } catch (error) {
      console.error("Failed to fetch branches:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches"
      const method = editingBranch ? "PUT" : "POST"

      // Validate form data before sending
      if (!branchFormData.name.trim()) {
        alert("Branch name is required")
        return
      }
      if (!branchFormData.location.trim()) {
        alert("Location is required")
        return
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: branchFormData.name.trim(),
          location: branchFormData.location.trim()
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setShowBranchForm(false)
        setEditingBranch(null)
        setBranchFormData({ name: "", location: "" })
        fetchBranches()
        // Show success message if available
        if (result.message) {
          alert(result.message)
        }
      } else {
        // Handle validation errors
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details.map((detail: any) =>
            `${detail.field}: ${detail.message}`
          ).join('\n')
          alert(`Validation errors:\n${errorMessages}`)
        } else {
          alert(result.error || "Failed to save branch")
        }
      }
    } catch (error) {
      console.error("Failed to save branch:", error)
      alert("Failed to save branch. Please check your connection and try again.")
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Client-side validation
      if (!userFormData.username.trim()) {
        alert("Username is required")
        return
      }

      if (userFormData.username.trim().length < 3) {
        alert("Username must be at least 3 characters long")
        return
      }

      if (!editingUser && !userFormData.password.trim()) {
        alert("Password is required")
        return
      }

      if (!editingUser && userFormData.password.length < 6) {
        alert("Password must be at least 6 characters long")
        return
      }

      if (!userFormData.role) {
        alert("Role is required")
        return
      }

      if (userFormData.role === "BRANCH_ADMIN" && !userFormData.branchId) {
        alert("Branch selection is required for Branch Admin role")
        return
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
      const method = editingUser ? "PUT" : "POST"

      // Prepare clean data
      const submitData: any = {
        username: userFormData.username.trim(),
        role: userFormData.role,
      }

      // Only include password if it's provided
      if (userFormData.password.trim()) {
        submitData.password = userFormData.password
      }

      // Only include branchId for BRANCH_ADMIN role
      if (userFormData.role === "BRANCH_ADMIN") {
        submitData.branchId = userFormData.branchId
      }

      console.log("Submitting user data:", submitData)

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()
      console.log("User submission result:", result)

      if (response.ok) {
        setShowUserForm(false)
        setEditingUser(null)
        setUserFormData({ username: "", password: "", role: "BRANCH_ADMIN", branchId: "" })
        fetchUsers()
        fetchBranches()

        if (result.message) {
          alert(result.message)
        }
      } else {
        // Handle validation errors
        if (result.details && Array.isArray(result.details)) {
          const errorMessages = result.details.map((detail: any) =>
            `${detail.field}: ${detail.message}`
          ).join('\n')
          alert(`Validation errors:\n${errorMessages}`)
        } else {
          alert(result.error || "Failed to save user")
        }
      }
    } catch (error) {
      console.error("Failed to save user:", error)
      alert("Failed to save user. Please check your connection and try again.")
    }
  }

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("Are you sure you want to delete this branch? This will also delete all associated inventory and waste logs.")) return

    try {
      const response = await fetch(`/api/branches/${branchId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok) {
        fetchBranches()
        if (result.warning) {
          alert(`${result.message}\n\nWarning: ${result.warning}`)
        } else if (result.message) {
          alert(result.message)
        }
      } else {
        if (result.dependencies) {
          const deps = result.dependencies
          alert(`${result.error}\n\nDependencies:\n- Users: ${deps.users}\n- Inventory: ${deps.inventory}\n- Waste Logs: ${deps.wasteLogs}`)
        } else {
          alert(result.error || "Failed to delete branch")
        }
      }
    } catch (error) {
      console.error("Failed to delete branch:", error)
      alert("Failed to delete branch. Please check your connection and try again.")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (response.ok) {
        fetchUsers()
        fetchBranches()
        if (result.message) {
          alert(result.message)
        }
      } else {
        alert(result.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
      alert("Failed to delete user. Please check your connection and try again.")
    }
  }

  const openEditBranch = (branch: BranchWithStats) => {
    setEditingBranch(branch)
    setBranchFormData({
      name: branch.name,
      location: branch.location,
    })
    setShowBranchForm(true)
  }

  const openEditUser = (user: User) => {
    // Make sure branches are loaded
    if (user?.role === "SUPER_ADMIN" && branches.length === 0) {
      fetchBranches();
    }

    setEditingUser(user)
    setUserFormData({
      username: user.username,
      password: "",
      role: user.role,
      branchId: user.branchId || "",
    })
    setShowUserForm(true)
  }

  const openNewUserForm = () => {
    // Make sure branches are loaded
    if (user?.role === "SUPER_ADMIN" && branches.length === 0) {
      fetchBranches();
    }

    setEditingUser(null)
    setUserFormData({ username: "", password: "", role: "BRANCH_ADMIN", branchId: "" })
    setShowUserForm(true)
  }

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
              Only Super Admins can access branch management. Please contact your administrator for access.
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
              <h3 className="text-lg font-semibold text-slate-900">Loading Branch Management</h3>
              <p className="text-sm text-slate-500 mt-1">Fetching your data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Enhanced Header Section */}
        <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-kitchzero-primary/5 via-transparent to-kitchzero-secondary/5"></div>
          <div className="relative px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-kitchzero-primary to-kitchzero-secondary rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Branch Management
                  </h1>
                  <p className="text-slate-600 mt-1 text-sm lg:text-base">
                    Manage restaurant branches and assign administrators
                  </p>
                </div>
              </div>

              <div className="mt-6 lg:mt-0 flex items-center space-x-3">
                <button
                  onClick={openNewUserForm} // Use the new function
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
                <button
                  onClick={() => setShowBranchForm(true)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Branch
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Branches */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{branches.length}</div>
                  <div className="text-xs text-slate-500 font-medium">BRANCHES</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Total Branches</h3>
                <p className="text-sm text-slate-500">Active locations</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Total Users */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">{users.length}</div>
                  <div className="text-xs text-slate-500 font-medium">USERS</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Total Users</h3>
                <p className="text-sm text-slate-500">System administrators</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Total Inventory */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-violet-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {branches.reduce((sum, branch) => sum + (branch._count?.inventory || 0), 0)}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">ITEMS</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Total Inventory</h3>
                <p className="text-sm text-slate-500">Across all branches</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Total Waste Logs */}
          <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-red-50/30"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {branches.reduce((sum, branch) => sum + (branch._count?.wasteLogs || 0), 0)}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">LOGS</div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Waste Entries</h3>
                <p className="text-sm text-slate-500">Total tracked waste</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-red-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>
        </div>

        {/* Enhanced Branch Form Modal */}
        {showBranchForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Modal Header */}
              <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
                <button
                  onClick={() => {
                    setShowBranchForm(false)
                    setEditingBranch(null)
                    setBranchFormData({ name: "", location: "" })
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{editingBranch ? "Edit Branch" : "Add New Branch"}</h2>
                    <p className="text-white/80 text-sm mt-1">
                      {editingBranch ? "Update branch information" : "Create a new branch location"}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleBranchSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Branch Name *</label>
                  <input
                    type="text"
                    value={branchFormData.name}
                    onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    placeholder="e.g., Downtown Restaurant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Location *</label>
                  <input
                    type="text"
                    value={branchFormData.location}
                    onChange={(e) => setBranchFormData({ ...branchFormData, location: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    placeholder="e.g., Colombo, Sri Lanka"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBranchForm(false)
                      setEditingBranch(null)
                      setBranchFormData({ name: "", location: "" })
                    }}
                    className="px-6 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {editingBranch ? "Update Branch" : "Add Branch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced User Form Modal */}
        {showUserForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              {/* Modal Header */}
              <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
                <button
                  onClick={() => {
                    setShowUserForm(false)
                    setEditingUser(null)
                    setUserFormData({ username: "", password: "", role: "BRANCH_ADMIN", branchId: "" })
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{editingUser ? "Edit User" : "Add New User"}</h2>
                    <p className="text-white/80 text-sm mt-1">
                      {editingUser ? "Update user information" : "Create a new system user"}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUserSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Username *</label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password {editingUser && "(leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                    placeholder="Enter password"
                    required={!editingUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Role *</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) =>
                      setUserFormData({ ...userFormData, role: e.target.value as "SUPER_ADMIN" | "BRANCH_ADMIN" })
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-kitchzero-primary/20 focus:border-kitchzero-primary transition-all duration-200 text-sm"
                  >
                    <option value="BRANCH_ADMIN">Branch Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
                {userFormData.role === "BRANCH_ADMIN" && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Assign to Branch *</label>
                    <select
                      value={userFormData.branchId}
                      onChange={(e) => {
                        console.log("Branch selected:", e.target.value); // Debug log
                        setUserFormData({ ...userFormData, branchId: e.target.value })
                      }}
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
                <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserForm(false)
                      setEditingUser(null)
                      setUserFormData({ username: "", password: "", role: "BRANCH_ADMIN", branchId: "" })
                    }}
                    className="px-6 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {editingUser ? "Update User" : "Add User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Branches Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Branch Locations</h2>
              <p className="text-sm text-slate-500 mt-1">Manage and monitor all your restaurant branches</p>
            </div>
            <div className="text-sm text-slate-500">
              {branches.length} {branches.length === 1 ? "branch" : "branches"} total
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Card Header with Gradient */}
                <div className="relative bg-gradient-to-r from-kitchzero-primary/5 via-kitchzero-secondary/5 to-kitchzero-primary/5 p-6 border-b border-slate-200/60">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-kitchzero-primary to-kitchzero-secondary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Building2 className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-kitchzero-primary transition-colors">
                          {branch.name}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-slate-500 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span>{branch.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openEditBranch(branch)}
                        className="p-2.5 text-slate-400 hover:text-kitchzero-primary hover:bg-kitchzero-primary/10 rounded-xl transition-all duration-200 group/btn"
                        title="Edit Branch"
                      >
                        <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group/btn"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Statistics Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200/60">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-lg font-bold text-emerald-700">{branch.users?.length || 0}</div>
                      <div className="text-xs text-emerald-600 font-medium">Staff</div>
                    </div>

                    <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl border border-purple-200/60">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-lg font-bold text-purple-700">{branch._count?.inventory || 0}</div>
                      <div className="text-xs text-purple-600 font-medium">Items</div>
                    </div>

                    <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl border border-orange-200/60">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-lg font-bold text-orange-700">{branch._count?.wasteLogs || 0}</div>
                      <div className="text-xs text-orange-600 font-medium">Logs</div>
                    </div>
                  </div>

                  {/* Assigned Users Section */}
                  {branch.users && branch.users.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Users className="w-4 h-4" />
                        <span>Assigned Staff ({branch.users.length})</span>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {branch.users.map((branchUser) => (
                          <div
                            key={branchUser.id}
                            className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-50/50 rounded-lg border border-slate-200/60 hover:from-slate-100 hover:to-slate-100/50 transition-all duration-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4 text-slate-600" />
                              </div>
                              <span className="text-sm font-medium text-slate-700">{branchUser.username}</span>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${branchUser.role === "SUPER_ADMIN"
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                                }`}
                            >
                              {branchUser.role === "SUPER_ADMIN" ? "Super" : "Admin"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-medium">No staff assigned</p>
                      <p className="text-xs text-slate-400 mt-1">Add users to manage this branch</p>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-50/50 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>Created {new Date(branch.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-emerald-600 font-medium">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Empty State for Branches */}
        {branches.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">No branches yet</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Get started by adding your first branch location to begin managing your restaurant operations.
            </p>
            <button
              onClick={() => setShowBranchForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              Add Your First Branch
            </button>
          </div>
        )}

        {/* Enhanced Users Management Section */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="relative bg-gradient-to-r from-slate-50 to-slate-100/50 px-8 py-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-kitchzero-primary/10 to-kitchzero-secondary/10 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-kitchzero-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">User Management</h2>
                <p className="text-sm text-slate-500 mt-1">Manage system administrators and their permissions</p>
              </div>
            </div>
          </div>

          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Username</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Role</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Branch</th>
                    <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm">Created</th>
                    <th className="text-right py-4 px-6 font-semibold text-slate-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((userData) => (
                    <tr
                      key={userData.id}
                      className="group hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-transparent transition-all duration-200"
                    >
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-kitchzero-primary/10 group-hover:to-kitchzero-secondary/10 transition-all duration-200">
                            <Users className="w-5 h-5 text-slate-500 group-hover:text-kitchzero-primary transition-colors" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{userData.username}</div>
                            <div className="text-xs text-slate-500">System User</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${userData.role === "SUPER_ADMIN"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                        >
                          <Shield className="w-3 h-3" />
                          {userData.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"}
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <div className="text-sm font-medium text-slate-900">
                          {userData.branch ? userData.branch.name : "No branch assigned"}
                        </div>
                        {userData.branch && (
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {userData.branch.location}
                          </div>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        <div className="text-sm font-medium text-slate-900">
                          {new Date(userData.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(userData.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditUser(userData)}
                            className="p-2.5 text-slate-400 hover:text-kitchzero-primary hover:bg-kitchzero-primary/5 rounded-xl transition-all duration-200 group/btn"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </button>
                          {userData.id !== user.id && (
                            <button
                              onClick={() => handleDeleteUser(userData.id)}
                              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group/btn"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No users found</h3>
              <p className="text-slate-500 mb-6">Start by adding administrators to manage your branches.</p>
              <button
                onClick={() => setShowUserForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary text-white rounded-xl hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <UserPlus className="w-5 h-5" />
                Add Your First User
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
