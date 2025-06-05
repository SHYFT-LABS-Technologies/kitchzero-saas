"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider } from "@/components/auth-provider"

function HomeContent() {
  const router = useRouter()

  useEffect(() => {
    router.push("/login")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-kitchzero-primary"></div>
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  )
}
