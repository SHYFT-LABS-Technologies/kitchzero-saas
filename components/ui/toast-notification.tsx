
"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { X, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"

export interface Toast {
  id: string
  type: "success" | "error" | "warning" | "info"
  title: string
  message: string
  details?: ValidationErrorDetail[] // Add validation details
  duration?: number
}

export interface ValidationErrorDetail {
  field: string
  message: string
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
  addValidationErrors: (errors: ValidationErrorDetail[], title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    
    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    const duration = toast.duration || 5000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addValidationErrors = useCallback((errors: ValidationErrorDetail[], title = "Validation Error") => {
    addToast({
      type: "error",
      title,
      message: `Please fix the following errors:`,
      details: errors,
      duration: 8000 // Longer duration for validation errors
    })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, addValidationErrors }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function ToastContainer({ 
  toasts, 
  onRemove 
}: { 
  toasts: Toast[]
  onRemove: (id: string) => void 
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getBgColor = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 border-green-200"
      case "error":
        return "bg-red-50 border-red-200"
      case "warning":
        return "bg-yellow-50 border-yellow-200"
      case "info":
        return "bg-blue-50 border-blue-200"
    }
  }

  return (
    <div className={`${getBgColor()} border rounded-xl p-4 shadow-lg animate-slide-in`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {getIcon()}
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 text-sm">{toast.title}</h4>
            <p className="text-slate-600 text-sm mt-1">{toast.message}</p>
            
            {/* Validation Error Details */}
            {toast.details && toast.details.length > 0 && (
              <div className="mt-3 space-y-1">
                {toast.details.map((detail, index) => (
                  <div key={index} className="text-xs text-slate-700 bg-white/50 rounded px-2 py-1">
                    <span className="font-medium">{detail.field}:</span> {detail.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}