"use client"

import { useEffect, useState } from "react"
import { Bell, Clock, FileText, User } from "lucide-react"
import { useAuth } from "../auth-provider"

interface Review {
  id: string
  action: "CREATE" | "UPDATE" | "DELETE"
  status: "PENDING" | "APPROVED" | "REJECTED"
  reason?: string
  createdAt: string
  creator: {
    username: string
    role: string
  }
  newData?: {
    itemName: string
  }
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      fetchReviews()
      // Poll for new reviews every 30 seconds
      const interval = setInterval(fetchReviews, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/reviews?status=PENDING")
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAction = async (reviewId: string, action: "approve" | "reject") => {
    const reviewNotes = prompt(`Please provide notes for ${action}ing this request:`)
    if (!reviewNotes) return

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNotes }),
      })

      if (response.ok) {
        fetchReviews()
        alert(`Request ${action}ed successfully!`)
      }
    } catch (error) {
      console.error("Failed to process review:", error)
      alert("Failed to process review. Please try again.")
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE":
        return <FileText className="w-4 h-4 text-green-600" />
      case "UPDATE":
        return <FileText className="w-4 h-4 text-blue-600" />
      case "DELETE":
        return <FileText className="w-4 h-4 text-red-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE":
        return "text-green-600 bg-green-50 border-green-200"
      case "UPDATE":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "DELETE":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  if (user?.role !== "SUPER_ADMIN") {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-500 hover:text-green-600 transition-colors rounded-lg hover:bg-green-50"
      >
        <Bell className="w-5 h-5" />
        {reviews.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {reviews.length}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Pending Reviews</h3>
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {reviews.length} request{reviews.length !== 1 ? "s" : ""} awaiting approval
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {reviews.length > 0 ? (
              <div className="p-2">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(review.action)}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getActionColor(review.action)}`}
                        >
                          {review.action}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="font-medium text-gray-900">{review.creator.username}</span>
                      </div>

                      {review.newData && (
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">{review.newData.itemName}</span>
                        </div>
                      )}

                      {review.reason && <p className="text-xs text-gray-600 italic">"{review.reason}"</p>}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleReviewAction(review.id, "approve")}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewAction(review.id, "reject")}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No pending reviews</p>
                <p className="text-gray-400 text-xs mt-1">All caught up!</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={() => {
                setShowNotifications(false)
                window.location.href = "/reviews"
              }}
              className="w-full text-center text-sm text-green-600 hover:text-green-700 font-medium"
            >
              View All in Reviews
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
