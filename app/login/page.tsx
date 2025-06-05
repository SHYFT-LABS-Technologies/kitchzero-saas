"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/components/auth-provider"
import { Eye, EyeOff, Lock, User, ChefHat, Leaf, ArrowRight, CheckCircle } from "lucide-react"

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

    console.log("🔐 Attempting login with:", { username, password: password ? "***" : "empty" })

    try {
      const success = await login(username, password)
      if (success) {
        console.log("✅ Login successful, redirecting...")
        router.push("/dashboard")
      } else {
        console.log("❌ Login failed")
        setError("Invalid username or password")
      }
    } catch (err) {
      console.error("❌ Login error:", err)
      setError("An error occurred during login. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Animated Background with Glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-emerald-50">
        {/* Floating orbs for glassmorphism effect */}
        <div className="absolute top-10 left-10 w-48 h-48 bg-gradient-to-r from-green-400/30 to-emerald-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-40 h-40 bg-gradient-to-r from-emerald-300/25 to-green-400/25 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 p-8 flex-col justify-between text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
        </div>

        <div className="relative z-10">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">KitchZero</h1>
              <p className="text-green-100 text-sm">Smart Food Waste Management</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold leading-tight">
              Transform Your Kitchen into a 
              <span className="text-green-200"> Zero-Waste</span> Operation
            </h2>
            <p className="text-green-100 leading-relaxed">
              Join thousands of restaurants reducing food waste by up to 40% with our intelligent tracking and analytics platform.
            </p>

            {/* Key Features - Compact */}
            <div className="space-y-3 mt-6">
              {[
                "Real-time waste tracking & analytics",
                "AI-powered waste reduction insights",
                "Cost savings up to $50,000/year"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-4 h-4 bg-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-2.5 h-2.5 text-green-800" />
                  </div>
                  <span className="text-green-100 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Branding - Compact */}
        <div className="relative z-10 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Leaf className="w-4 h-4 text-green-300" />
            <span className="text-green-200">Reducing food waste, one meal at a time</span>
          </div>
          <div className="text-green-200">
            A product of <span className="font-semibold text-white">Shyft Labs</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm">
          {/* Glassmorphism Card - Compact */}
          <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl p-6 relative">
            {/* Subtle border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-2xl blur-xl"></div>
            
            <div className="relative z-10">
              {/* Mobile Logo - Compact */}
              <div className="lg:hidden flex items-center justify-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-xl font-bold text-gray-900">KitchZero</h1>
                  <p className="text-gray-600 text-xs">Smart Food Waste Management</p>
                </div>
              </div>

              {/* Welcome Text - Compact */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
                <p className="text-gray-600 text-sm">Sign in to your account to continue</p>
              </div>

              {/* Login Form - Compact */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 placeholder-gray-400 text-gray-900 text-sm"
                      placeholder="Enter your username"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-lg bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 placeholder-gray-400 text-gray-900 text-sm"
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 hover:bg-gray-100/50 rounded-r-lg transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Message - Compact */}
                {error && (
                  <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-xs font-bold">!</span>
                    </div>
                    <span className="text-red-700 text-xs">{error}</span>
                  </div>
                )}

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-sm">Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Test Credentials - More Compact */}
              <div className="mt-5 p-3 bg-gradient-to-r from-blue-50/80 to-green-50/80 backdrop-blur-sm border border-blue-200/50 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  <span>Demo Credentials:</span>
                </p>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center justify-between p-1.5 bg-white/50 rounded">
                    <span className="font-medium">Super Admin:</span>
                    <span className="font-mono text-xs">superadmin / admin123</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 bg-white/50 rounded">
                    <span className="font-medium">Branch Admin:</span>
                    <span className="font-mono text-xs">branchadmin / branch123</span>
                  </div>
                </div>
              </div>

              {/* Mobile Branding - Compact */}
              <div className="lg:hidden mt-4 pt-3 border-t border-gray-200/50 text-center">
                <p className="text-xs text-gray-500">
                  A product of <span className="font-semibold text-gray-700">Shyft Labs</span>
                </p>
              </div>
            </div>
          </div>

          {/* Additional Mobile Content - Compact */}
          <div className="lg:hidden mt-4 text-center">
            <div className="flex items-center justify-center space-x-1 text-green-600">
              <Leaf className="w-3 h-3" />
              <span className="text-xs">Reducing food waste, one meal at a time</span>
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