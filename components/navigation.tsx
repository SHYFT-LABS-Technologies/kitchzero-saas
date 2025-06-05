"use client"

import { useState, useEffect, useRef } from "react"
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
  ChefHat,
} from "lucide-react"

export default function Navigation() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [pendingReviews, setPendingReviews] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Only fetch pending reviews for super admins
    if (user?.role === "SUPER_ADMIN") {
      fetchPendingReviews()
      // Poll every 30 seconds
      const interval = setInterval(fetchPendingReviews, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Handle clicks outside of user menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        userButtonRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [userMenuRef, userButtonRef])

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
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: <Package className="w-5 h-5" />,
      show: true,
    },
    {
      name: "Waste Management",
      href: "/waste",
      icon: <Trash2 className="w-5 h-5" />,
      show: true,
    },
    {
      name: "Reviews",
      href: "/reviews",
      icon: <ClipboardList className="w-5 h-5" />,
      show: user?.role === "SUPER_ADMIN",
      badge: pendingReviews > 0 ? pendingReviews : undefined,
    },
    {
      name: "Branches",
      href: "/branches",
      icon: <Building className="w-5 h-5" />,
      show: user?.role === "SUPER_ADMIN",
    },
  ]

  if (!user) {
    return null
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-kitchzero-primary to-kitchzero-secondary rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900">KitchZero</h1>
                  <p className="text-xs text-slate-500 -mt-1">Waste Management</p>
                </div>
              </Link>
            </div>

            {/* Center Navigation */}
            <div className="hidden lg:flex lg:items-center lg:justify-center lg:flex-1">
              <div className="flex items-center space-x-1">
                {navLinks
                  .filter((link) => link.show)
                  .map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`relative flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive(link.href)
                          ? "bg-kitchzero-primary/10 text-kitchzero-primary border border-kitchzero-primary/20"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <span className="mr-2.5">{link.icon}</span>
                      <span>{link.name}</span>
                      {link.badge && (
                        <span className="ml-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  ))}
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notification Bell for Super Admin */}
              {user?.role === "SUPER_ADMIN" && (
                <Link
                  href="/reviews"
                  className="relative p-2 rounded-lg text-slate-500 hover:text-kitchzero-primary hover:bg-kitchzero-primary/10 transition-all duration-200"
                  title={`${pendingReviews} pending reviews`}
                >
                  <Bell className="h-5 w-5" />
                  {pendingReviews > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingReviews}
                    </span>
                  )}
                </Link>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  ref={userButtonRef}
                  type="button"
                  className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200"
                  onClick={toggleUserMenu}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-kitchzero-primary to-kitchzero-secondary text-white flex items-center justify-center font-semibold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="font-medium text-slate-900 text-sm">{user?.username}</p>
                    <p className="text-xs text-slate-500">
                      {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div
                    ref={userMenuRef}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-kitchzero-primary to-kitchzero-secondary text-white flex items-center justify-center font-semibold">
                          {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user?.username}</p>
                          <p className="text-sm text-slate-500">
                            {user?.role === "SUPER_ADMIN" ? "Super Administrator" : "Branch Administrator"}
                          </p>
                          {user?.branch && (
                            <p className="text-xs text-kitchzero-primary font-medium">{user.branch.name}</p>
                          )}
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
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={toggleMenu}
                  aria-expanded={isOpen}
                  aria-label="Toggle navigation menu"
                >
                  {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="lg:hidden border-t border-slate-100 animate-fadeIn">
              <div className="py-2 space-y-1">
                {navLinks
                  .filter((link) => link.show)
                  .map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                        isActive(link.href)
                          ? "bg-kitchzero-primary/10 text-kitchzero-primary"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-center space-x-3">
                        {link.icon}
                        <span>{link.name}</span>
                      </div>
                      {link.badge && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  ))}
              </div>

              {/* Mobile User Info */}
              <div className="border-t border-slate-100 pt-4 pb-3">
                <div className="flex items-center px-4 space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-kitchzero-primary to-kitchzero-secondary text-white flex items-center justify-center font-semibold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{user?.username}</p>
                    <p className="text-sm text-slate-500">
                      {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"}
                    </p>
                    {user?.branch && <p className="text-xs text-kitchzero-primary font-medium">{user.branch.name}</p>}
                  </div>
                </div>
                <div className="mt-3 px-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-lg text-sm text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}
