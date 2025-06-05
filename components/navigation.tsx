"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import {
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Package,
  Building,
  Trash2,
  ClipboardList,
  Bell,
  LogOut,
} from "lucide-react"

export default function Navigation() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [pendingReviews, setPendingReviews] = useState(0)

  useEffect(() => {
    // Only fetch pending reviews for super admins
    if (user?.role === "SUPER_ADMIN") {
      fetchPendingReviews()
      // Poll every 30 seconds
      const interval = setInterval(fetchPendingReviews, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchPendingReviews = async () => {
    try {
      const response = await fetch("/api/reviews?status=PENDING")
      if (response.ok) {
        const data = await response.json()
        setPendingReviews(data.reviews?.length || 0)
      }
    } catch (error) {
      console.error("Failed to fetch pending reviews:", error)
    }
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen)
  }

  const handleLogout = async () => {
    await logout()
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  const navLinks = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      show: true,
      //description: "Overview and analytics",
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: <Package className="w-5 h-5" />,
      show: true,
      //description: "Manage stock items",
    },
    {
      name: "Waste Management",
      href: "/waste",
      icon: <Trash2 className="w-5 h-5" />,
      show: true,
      //description: "Track food waste",
    },
    {
      name: "Reviews",
      href: "/reviews",
      icon: <ClipboardList className="w-5 h-5" />,
      show: user?.role === "SUPER_ADMIN",
      //description: "Approve requests",
      badge: pendingReviews > 0 ? pendingReviews : undefined,
    },
    {
      name: "Branches",
      href: "/branches",
      icon: <Building className="w-5 h-5" />,
      show: user?.role === "SUPER_ADMIN",
      //description: "Manage locations",
    },
  ]

  if (!user) {
    return null
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">KZ</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-900">KitchZero</h1>
                  <p className="text-xs text-gray-500 -mt-1">Waste Management</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:ml-8 lg:flex lg:space-x-1">
              {navLinks
                .filter((link) => link.show)
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group relative flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(link.href)
                        ? "bg-green-100 text-green-700 shadow-sm"
                        : "text-gray-600 hover:text-green-700 hover:bg-green-50"
                    }`}
                  >
                    <span className="mr-3">{link.icon}</span>
                    <div className="flex flex-col">
                      <span className="leading-tight">{link.name}</span>
                      <span className="text-xs text-gray-400 group-hover:text-green-600 transition-colors">
                        {link.description}
                      </span>
                    </div>
                    {link.badge && (
                      <span className="ml-3 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell for Super Admin */}
            {user?.role === "SUPER_ADMIN" && (
              <Link
                href="/reviews"
                className="relative p-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200"
                title={`${pendingReviews} pending reviews`}
              >
                <Bell className="h-6 w-6" />
                {pendingReviews > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {pendingReviews}
                  </span>
                )}
              </Link>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-200"
                onClick={toggleUserMenu}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-green-700 text-white flex items-center justify-center font-semibold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="font-medium text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500">
                    {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-green-700 text-white flex items-center justify-center font-semibold">
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user?.username}</p>
                        <p className="text-sm text-gray-500">
                          {user?.role === "SUPER_ADMIN" ? "Super Administrator" : "Branch Administrator"}
                        </p>
                        {user?.branch && <p className="text-xs text-green-600 font-medium">{user.branch.name}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={toggleMenu}
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <div className="py-3 space-y-1">
              {navLinks
                .filter((link) => link.show)
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      isActive(link.href)
                        ? "bg-green-100 text-green-700"
                        : "text-gray-600 hover:text-green-700 hover:bg-green-50"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center space-x-3">
                      {link.icon}
                      <div>
                        <p className="leading-tight">{link.name}</p>
                        <p className="text-sm text-gray-400">{link.description}</p>
                      </div>
                    </div>
                    {link.badge && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                ))}
            </div>

            {/* Mobile User Info */}
            <div className="border-t border-gray-200 pt-4 pb-3">
              <div className="flex items-center px-4 space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-green-700 text-white flex items-center justify-center font-semibold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user?.username}</p>
                  <p className="text-sm text-gray-500">
                    {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"}
                  </p>
                </div>
              </div>
              <div className="mt-3 px-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {isUserMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />}
    </nav>
  )
}
