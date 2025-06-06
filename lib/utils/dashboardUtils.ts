import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type React from 'react';

/**
 * Formats a number as LKR currency.
 * @param amount - The amount to format.
 * @returns A string representing the formatted currency.
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Returns an icon component based on the numerical change.
 * @param change - The numerical change (positive, negative, or zero).
 * @returns A JSX element representing the icon.
 */
export const getChangeIcon = (change: number): React.JSX.Element => {
  if (change > 0) return <ArrowUpRight className="w-4 h-4 text-red-600" />;
  if (change < 0) return <ArrowDownRight className="w-4 h-4 text-green-600" />;
  return <Minus className="w-4 h-4 text-gray-500" />;
};

/**
 * Returns a Tailwind CSS color class based on the numerical change.
 * @param change - The numerical change.
 * @param inverse - If true, inverts the color logic (positive is green, negative is red).
 * @returns A string Tailwind CSS color class.
 */
export const getChangeColor = (change: number, inverse = false): string => {
  if (change > 0) return inverse ? "text-green-600" : "text-red-600";
  if (change < 0) return inverse ? "text-red-600" : "text-green-600";
  return "text-gray-500";
};

/**
 * Returns a Tailwind CSS gradient color class for the efficiency score.
 * @param score - The efficiency score (0-100).
 * @returns A string representing Tailwind CSS gradient classes.
 */
export const getEfficiencyColor = (score: number): string => {
  if (score >= 80) return "from-green-500 to-green-600";
  if (score >= 60) return "from-yellow-500 to-yellow-600";
  return "from-red-500 to-red-600";
};

/**
 * Returns a human-readable label for a given time range key.
 * @param range - The time range key (e.g., "today", "7d").
 * @returns A human-readable string label.
 */
export const getTimeRangeLabel = (range: string): string => {
  switch (range) {
    case "today":
      return "Today";
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    case "90d":
      return "Last 90 days";
    default:
      return "Today";
  }
};
