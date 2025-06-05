export interface User {
  id: string
  username: string
  role: "SUPER_ADMIN" | "BRANCH_ADMIN"
  branchId?: string
  branch?: Branch
  createdAt: Date
  updatedAt: Date
}

export interface Branch {
  id: string
  name: string
  location: string
  createdAt: Date
  updatedAt: Date
}

export interface InventoryItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  expiryDate: Date
  purchaseCost: number
  branchId: string
  branch?: Branch
}

export interface WasteLog {
  id: string
  itemName: string
  quantity: number
  unit: string
  value: number
  reason: "OVERPRODUCTION" | "SPOILAGE" | "PLATE_WASTE" | "BUFFET_LEFTOVER"
  photo?: string
  branchId: string
  branch?: Branch
  createdAt: Date
  updatedAt: Date
}

export interface WasteLogReview {
  id: string
  wasteLogId?: string
  wasteLog?: WasteLog
  action: "CREATE" | "UPDATE" | "DELETE"
  status: "PENDING" | "APPROVED" | "REJECTED"
  originalData?: any
  newData?: any
  reason?: string
  createdBy: string
  creator: User
  approvedBy?: string
  approver?: User
  reviewNotes?: string
  createdAt: Date
  updatedAt: Date
  reviewedAt?: Date
}

export interface Analytics {
  totalWasteKg: number
  totalWasteLKR: number
  topWastedItems: Array<{
    itemName: string
    totalQuantity: number
    totalValue: number
  }>
  wasteOverTime: Array<{
    date: string
    quantity: number
    value: number
  }>
}
