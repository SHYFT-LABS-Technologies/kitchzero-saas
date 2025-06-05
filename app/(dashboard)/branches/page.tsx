"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth-provider"
import type { Branch, User } from "@/lib/types"
import { Plus, Building2, MapPin, Users, Package, Trash2, Edit, UserPlus, X } from "lucide-react"

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

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branchFormData),
      })

      if (response.ok) {
        setShowBranchForm(false)
        setEditingBranch(null)
        setBranchFormData({ name: "", location: "" })
        fetchBranches()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save branch")
      }
    } catch (error) {
      console.error("Failed to save branch:", error)
      alert("Failed to save branch")
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
      const method = editingUser ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userFormData),
      })

      if (response.ok) {
        setShowUserForm(false)
        setEditingUser(null)
        setUserFormData({ username: "", password: "", role: "BRANCH_ADMIN", branchId: "" })
        fetchUsers()
        fetchBranches()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save user")
      }
    } catch (error) {
      console.error("Failed to save user:", error)
      alert("Failed to save user")
    }
  }

  const handleDeleteBranch = async (branchId: string) => {
    if (!confirm("Are you sure you want to delete this branch?")) return

    try {
      const response = await fetch(`/api/branches/${branchId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchBranches()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete branch")
      }
    } catch (error) {
      console.error("Failed to delete branch:", error)
      alert("Failed to delete branch")
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchUsers()
        fetchBranches()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
      alert("Failed to delete user")
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
    setEditingUser(user)
    setUserFormData({
      username: user.username,
      password: "",
      role: user.role,
      branchId: user.branchId || "",
    })
    setShowUserForm(true)
  }

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-kitchzero-text mb-4">Access Denied</h1>
        <p className="text-kitchzero-text/70">Only Super Admins can access branch management.</p>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-kitchzero-text">Branch Management</h1>
          <p className="text-kitchzero-text/70 mt-2">Manage restaurant branches and assign administrators</p>
        </div>
        <div className="flex space-x-4">
          <button onClick={() => setShowUserForm(true)} className="btn-secondary flex items-center space-x-2">
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
          <button onClick={() => setShowBranchForm(true)} className="btn-primary flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* Branch Form Modal */}
      {showBranchForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-kitchzero-text">
                {editingBranch ? "Edit Branch" : "Add New Branch"}
              </h2>
              <button
                onClick={() => {
                  setShowBranchForm(false)
                  setEditingBranch(null)
                  setBranchFormData({ name: "", location: "" })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBranchSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Branch Name</label>
                <input
                  type="text"
                  value={branchFormData.name}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Downtown Restaurant"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={branchFormData.location}
                  onChange={(e) => setBranchFormData({ ...branchFormData, location: e.target.value })}
                  className="input"
                  placeholder="e.g., Colombo, Sri Lanka"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBranchForm(false)
                    setEditingBranch(null)
                    setBranchFormData({ name: "", location: "" })
                  }}
                  className="px-4 py-2 border border-kitchzero-border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingBranch ? "Update Branch" : "Add Branch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-kitchzero-text">
                {editingUser ? "Edit User" : "Add New User"}
              </h2>
              <button
                onClick={() => {
                  setShowUserForm(false)
                  setEditingUser(null)
                  setUserFormData({ username: "", password: "", role: "BRANCH_ADMIN", branchId: "" })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Password {editingUser && "(leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="input"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={userFormData.role}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, role: e.target.value as "SUPER_ADMIN" | "BRANCH_ADMIN" })
                  }
                  className="select"
                >
                  <option value="BRANCH_ADMIN">Branch Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              {userFormData.role === "BRANCH_ADMIN" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Assign to Branch</label>
                  <select
                    value={userFormData.branchId}
                    onChange={(e) => setUserFormData({ ...userFormData, branchId: e.target.value })}
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
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false)
                    setEditingUser(null)
                    setUserFormData({ username: "", password: "", role: "BRANCH_ADMIN", branchId: "" })
                  }}
                  className="px-4 py-2 border border-kitchzero-border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? "Update User" : "Add User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-kitchzero-primary/10 rounded-full">
                  <Building2 className="w-6 h-6 text-kitchzero-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-kitchzero-text">{branch.name}</h3>
                  <div className="flex items-center space-x-1 text-sm text-kitchzero-text/70">
                    <MapPin className="w-4 h-4" />
                    <span>{branch.location}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditBranch(branch)}
                  className="p-2 text-kitchzero-primary hover:bg-kitchzero-primary/10 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteBranch(branch.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-kitchzero-text/70">
                  <Users className="w-4 h-4" />
                  <span>Staff Members</span>
                </div>
                <span className="font-medium text-kitchzero-text">{branch.users?.length || 0}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-kitchzero-text/70">
                  <Package className="w-4 h-4" />
                  <span>Inventory Items</span>
                </div>
                <span className="font-medium text-kitchzero-text">{branch._count?.inventory || 0}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-kitchzero-text/70">
                  <Trash2 className="w-4 h-4" />
                  <span>Waste Logs</span>
                </div>
                <span className="font-medium text-kitchzero-text">{branch._count?.wasteLogs || 0}</span>
              </div>
            </div>

            {/* Assigned Users */}
            {branch.users && branch.users.length > 0 && (
              <div className="mt-4 pt-4 border-t border-kitchzero-border">
                <p className="text-sm font-medium text-kitchzero-text mb-2">Assigned Users:</p>
                <div className="space-y-1">
                  {branch.users.map((branchUser) => (
                    <div key={branchUser.id} className="flex items-center justify-between text-sm">
                      <span className="text-kitchzero-text/70">{branchUser.username}</span>
                      <span className="text-xs bg-kitchzero-info px-2 py-1 rounded">
                        {branchUser.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-kitchzero-border">
              <p className="text-xs text-kitchzero-text/50">
                Created: {new Date(branch.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-kitchzero-text/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-kitchzero-text mb-2">No branches yet</h3>
          <p className="text-kitchzero-text/70 mb-6">Get started by adding your first branch location.</p>
          <button onClick={() => setShowBranchForm(true)} className="btn-primary">
            Add Your First Branch
          </button>
        </div>
      )}

      {/* Users Management Section */}
      <div className="card">
        <h2 className="text-xl font-semibold text-kitchzero-text mb-6">User Management</h2>
        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-kitchzero-border">
                  <th className="text-left py-3 px-4 font-medium text-kitchzero-text">Username</th>
                  <th className="text-left py-3 px-4 font-medium text-kitchzero-text">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-kitchzero-text">Branch</th>
                  <th className="text-left py-3 px-4 font-medium text-kitchzero-text">Created</th>
                  <th className="text-right py-3 px-4 font-medium text-kitchzero-text">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userData) => (
                  <tr key={userData.id} className="border-b border-kitchzero-border/50">
                    <td className="py-3 px-4 text-kitchzero-text">{userData.username}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          userData.role === "SUPER_ADMIN"
                            ? "bg-kitchzero-accent/10 text-kitchzero-accent"
                            : "bg-kitchzero-primary/10 text-kitchzero-primary"
                        }`}
                      >
                        {userData.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-kitchzero-text/70">
                      {userData.branch ? `${userData.branch.name}` : "No branch assigned"}
                    </td>
                    <td className="py-3 px-4 text-kitchzero-text/70">
                      {new Date(userData.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditUser(userData)}
                          className="p-2 text-kitchzero-primary hover:bg-kitchzero-primary/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {userData.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(userData.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <p className="text-kitchzero-text/70 text-center py-8">No users found.</p>
        )}
      </div>
    </div>
  )
}
