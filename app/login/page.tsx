"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Eye, EyeOff, Lock, User, ChefHat, TrendingUp, Zap, DollarSign, ArrowRight } from "lucide-react"

function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const success = await login(username, password)
      if (success) {
        router.push("/dashboard")
      } else {
        setError("Invalid username or password")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred during login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (type: string) => {
    if (type === "super") {
      setUsername("superadmin")
      setPassword("admin123")
    } else {
      setUsername("branchadmin")
      setPassword("branch123")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Left Panel - Branding (Hidden on mobile and tablet) */}
        <div className="hidden xl:flex xl:w-3/5 relative overflow-hidden">
          {/* Background with overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800"></div>
          <div className="absolute inset-0 bg-black/10"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-8 xl:p-12 text-white w-full">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">KitchZero</h1>
                <p className="text-emerald-100 text-sm">Smart Food Waste Management</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-lg">
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
                Transform Your Kitchen into a <span className="text-emerald-200">Zero-Waste</span> Operation
              </h2>
              <p className="text-emerald-100 text-lg mb-8 leading-relaxed">
                Join thousands of restaurants reducing food waste by up to 40% with our intelligent tracking and
                analytics platform.
              </p>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-emerald-500/30 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-200" />
                  </div>
                  <span className="text-emerald-100">Real-time waste tracking & analytics</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-emerald-500/30 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-emerald-200" />
                  </div>
                  <span className="text-emerald-100">AI-powered waste reduction insights</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-emerald-500/30 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-200" />
                  </div>
                  <span className="text-emerald-100">Cost savings up to $50,000/year</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-emerald-200 text-sm">© 2025 KitchZero. All rights reserved.</div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full xl:w-2/5 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="w-full max-w-md">
            {/* Mobile Logo - Always visible on mobile/tablet */}
            <div className="xl:hidden text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">KitchZero</h1>
                  <p className="text-gray-600 text-xs sm:text-sm">Smart Food Waste Management</p>
                </div>
              </div>
            </div>

            {/* Welcome */}
            <div className="text-center xl:text-left mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
              <p className="text-sm sm:text-base text-gray-600">Sign in to your account to continue</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm sm:text-base"
                    placeholder="Enter your username"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 sm:pl-10 pr-10 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-sm sm:text-base"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center touch-manipulation"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-50 p-3 sm:p-4 border border-red-200">
                  <div className="text-xs sm:text-sm text-red-700">{error}</div>
                </div>
              )}

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 sm:mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">Demo Credentials</span>
                </div>
              </div>

              <div className="mt-4 sm:mt-6 grid grid-cols-1 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => fillCredentials("super")}
                  className="w-full inline-flex justify-between items-center px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation"
                >
                  <div className="text-left">
                    <div className="font-medium">Super Admin</div>
                    <div className="text-xs text-gray-500">Full system access</div>
                  </div>
                  <div className="text-xs text-gray-400">Tap to fill</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials("branch")}
                  className="w-full inline-flex justify-between items-center px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation"
                >
                  <div className="text-left">
                    <div className="font-medium">Branch Admin</div>
                    <div className="text-xs text-gray-500">Branch-level access</div>
                  </div>
                  <div className="text-xs text-gray-400">Tap to fill</div>
                </button>
              </div>
            </div>

            {/* Mobile Footer */}
            <div className="xl:hidden mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500">
              © 2025 KitchZero. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  )
}