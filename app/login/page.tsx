"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/components/auth-provider"

function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kitchzero-primary/10 to-kitchzero-secondary/10">
      <div className="max-w-md w-full mx-4">
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-kitchzero-primary mb-2">KitchZero</h1>
            <p className="text-kitchzero-text/70">Smart Food Waste Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Test Credentials:</p>
            <p className="text-xs text-gray-500">Super Admin: superadmin / admin123</p>
            <p className="text-xs text-gray-500">Branch Admin: branchadmin / branch123</p>
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
