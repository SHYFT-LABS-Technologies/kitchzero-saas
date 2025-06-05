"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "./auth-provider"
import { LayoutDashboard, Trash2, Package, Building2, LogOut, Menu, X } from "lucide-react"

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Waste Logs", href: "/waste", icon: Trash2 },
    { name: "Inventory", href: "/inventory", icon: Package },
    ...(user?.role === "SUPER_ADMIN" ? [{ name: "Branches", href: "/branches", icon: Building2 }] : []),
  ]

  const handleLogout = async () => {
    await logout()
    window.location.href = "/login"
  }

  return (
    <nav className="bg-white shadow-sm border-b border-kitchzero-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-kitchzero-primary">KitchZero</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "text-kitchzero-primary bg-kitchzero-primary/10"
                      : "text-kitchzero-text hover:text-kitchzero-primary"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            <div className="flex items-center space-x-4 ml-8 pl-8 border-l border-kitchzero-border">
              <span className="text-sm text-kitchzero-text/70">
                {user?.username} ({user?.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"})
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 text-kitchzero-text hover:text-kitchzero-accent transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-kitchzero-text hover:text-kitchzero-primary">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-kitchzero-border">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? "text-kitchzero-primary bg-kitchzero-primary/10"
                      : "text-kitchzero-text hover:text-kitchzero-primary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}

            <div className="pt-4 mt-4 border-t border-kitchzero-border">
              <div className="px-3 py-2 text-sm text-kitchzero-text/70">
                {user?.username} ({user?.role === "SUPER_ADMIN" ? "Super Admin" : "Branch Admin"})
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-kitchzero-text hover:text-kitchzero-accent transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
