import React from 'react';
import { AlertTriangle, Clock, TrendingUp } from 'lucide-react';

/**
 * Checks if an item is expiring soon (within the next 7 days, inclusive of today).
 * @param expiryDate - The expiry date of the item.
 * @returns True if the item is expiring soon, false otherwise.
 */
export const isExpiringSoon = (expiryDate: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
  const expiry = new Date(expiryDate);
  expiry.setHours(0,0,0,0); // Normalize expiry to the start of the day

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 7 && diffDays >= 0;
};

/**
 * Checks if an item is already expired.
 * @param expiryDate - The expiry date of the item.
 * @returns True if the item is expired, false otherwise.
 */
export const isExpired = (expiryDate: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
  const expiry = new Date(expiryDate);
  expiry.setHours(0,0,0,0); // Normalize expiry to the start of the day
  return expiry < today;
};

/**
 * Returns a status badge component based on the item's expiry date.
 * @param expiryDate - The expiry date of the item.
 * @returns A JSX element representing the status badge.
 */
export const getStatusBadge = (expiryDate: Date): React.JSX.Element => {
  if (isExpired(expiryDate)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <AlertTriangle className="w-3 h-3" />
        Expired
      </span>
    );
  }
  if (isExpiringSoon(expiryDate)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" />
        Expiring Soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <TrendingUp className="w-3 h-3" />
      Fresh
    </span>
  );
};
