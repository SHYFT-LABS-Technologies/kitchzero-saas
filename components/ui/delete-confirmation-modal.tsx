"use client"

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  title: string
  description: string
  itemName?: string
  requireReason?: boolean
  isLoading?: boolean
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  requireReason = true,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError("Please provide a reason for deletion")
      return
    }
    onConfirm(reason)
    setReason("")
    setError("")
  }

  const handleClose = () => {
    setReason("")
    setError("")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-kitchzero-text">{title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-kitchzero-text/70 mb-2">{description}</p>
            {itemName && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">Item to be deleted:</p>
                <p className="text-red-700 font-semibold">{itemName}</p>
              </div>
            )}
          </div>

          {requireReason && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-kitchzero-text mb-2">Reason for deletion *</label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError("")
                }}
                className="w-full px-3 py-2 border border-kitchzero-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Please explain why this item needs to be deleted..."
                disabled={isLoading}
              />
              {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Warning</p>
                <p className="text-sm text-yellow-700">
                  This action cannot be undone. The item will be permanently removed from the system.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-kitchzero-border rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
