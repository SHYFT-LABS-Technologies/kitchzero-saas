"use client"

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorBoundaryState>
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent {...this.state} />
    }

    return this.props.children
  }
}

const DefaultErrorFallback: React.FC<ErrorBoundaryState> = ({ error }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h2>
        <p className="text-slate-600 mb-6">
          {error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="inline-flex items-center gap-2 bg-gradient-to-r from-kitchzero-primary to-kitchzero-secondary hover:from-kitchzero-primary/90 hover:to-kitchzero-secondary/90 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Page
        </button>
      </div>
    </div>
  )
}