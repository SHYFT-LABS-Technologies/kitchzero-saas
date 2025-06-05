import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider } from "@/components/ui/toast-notification"

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Optimize font display
  variable: "--font-inter", // Enable variable font usage
})

export const metadata: Metadata = {
  title: "KitchZero - Smart Food Waste Management",
  description: "Reduce food waste with intelligent tracking and analytics",
  manifest: "/manifest.json",
  themeColor: "#6DBA7E",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KitchZero",
  },
  formatDetection: {
    telephone: true,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // Allow zooming for accessibility
  minimumScale: 1,
  userScalable: true, // Better for accessibility
  themeColor: "#6DBA7E",
  viewportFit: "cover", // Support for notched devices
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-kitchzero-background text-kitchzero-text antialiased min-h-screen`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}


