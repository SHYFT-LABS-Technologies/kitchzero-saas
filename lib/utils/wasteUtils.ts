import type React from 'react';
import {
  AlertCircle,
  TrendingUp,
  Trash2,
  TrendingDown,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

/**
 * Formats a waste reason string for display.
 * (e.g., "PLATE_WASTE" -> "Plate Waste")
 * @param reason - The reason string.
 * @returns A formatted reason string.
 */
export const formatReason = (reason: string): string => {
  if (!reason) return "Unknown Reason";
  return reason
    .replace("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Returns an icon component based on the waste reason.
 * @param reason - The waste reason string.
 * @returns A JSX element representing the icon.
 */
export const getReasonIcon = (reason: string): React.JSX.Element => {
  switch (reason) {
    case "SPOILAGE":
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case "OVERPRODUCTION":
      return <TrendingUp className="w-4 h-4 text-orange-500" />;
    case "PLATE_WASTE":
      return <Trash2 className="w-4 h-4 text-yellow-500" />;
    case "BUFFET_LEFTOVER":
      return <TrendingDown className="w-4 h-4 text-blue-500" />;
    default:
      return <FileText className="w-4 h-4 text-gray-500" />;
  }
};

/**
 * Returns a status badge component based on the review status string.
 * @param status - The status string (e.g., "PENDING", "APPROVED", "REJECTED").
 * @returns A JSX element representing the status badge, or null if status is unrecognized.
 */
export const getStatusBadge = (status: string): React.JSX.Element | null => {
  switch (status) {
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      );
    case "APPROVED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      );
    default:
      return null;
  }
};
