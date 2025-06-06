import { prisma } from '@/lib/prisma';
import type { Branch, Prisma } from '@prisma/client';

const branchInclude = {
  users: {
    select: {
      id: true,
      username: true,
      role: true,
    },
  },
  _count: {
    select: {
      inventoryItems: true, // Ensure this matches your Prisma schema relation name
      wasteLogs: true,      // Ensure this matches your Prisma schema relation name
    },
  },
};

/**
 * Fetches all branches from the database.
 * Includes related users (id, username, role) and counts of inventory and waste logs.
 * @returns A promise that resolves to an array of branches with their related data.
 */
export async function getAll(): Promise<Branch[]> {
  // Using any to bypass strict type checking for include structure until Prisma types are fully aligned
  return prisma.branch.findMany({
    include: branchInclude as any,
    orderBy: {
      name: 'asc', // Default sort by name
    },
  });
}

/**
 * Fetches a single branch by its ID.
 * Includes related users (id, username, role) and counts of inventory and waste logs.
 * @param id - The ID of the branch to fetch.
 * @returns A promise that resolves to the branch with its related data, or null if not found.
 */
export async function getById(id: string): Promise<Branch | null> {
  return prisma.branch.findUnique({
    where: { id },
    include: branchInclude as any,
  });
}

/**
 * Creates a new branch in the database.
 * @param data - The data for the new branch, conforming to Prisma.BranchCreateInput.
 * @returns A promise that resolves to the newly created branch.
 */
export async function create(data: Prisma.BranchCreateInput): Promise<Branch> {
  return prisma.branch.create({
    data,
    include: branchInclude as any, // Return the full structure on create as well
  });
}

/**
 * Updates an existing branch in the database.
 * @param id - The ID of the branch to update.
 * @param data - The data to update the branch with, conforming to Prisma.BranchUpdateInput.
 * @returns A promise that resolves to the updated branch.
 */
export async function update(id: string, data: Prisma.BranchUpdateInput): Promise<Branch> {
  return prisma.branch.update({
    where: { id },
    data,
    include: branchInclude as any,
  });
}

/**
 * Deletes a branch from the database by its ID.
 * Note: This does not handle related entities. Deletion might fail if there are constraints.
 * The service layer should handle checks for related entities before calling this.
 * @param id - The ID of the branch to delete.
 * @returns A promise that resolves to the deleted branch.
 */
export async function deleteById(id: string): Promise<Branch> {
  return prisma.branch.delete({
    where: { id },
  });
}

// Functions to count related entities - these will be used by the branchApiService for dependency checks.
// These assume you have direct relations named `users`, `inventoryItems`, `wasteLogs` on your Branch model.
// Adjust relation names as per your actual Prisma schema.

/**
 * Counts users assigned to a specific branch.
 * @param branchId The ID of the branch.
 * @returns A promise that resolves to the count of users.
 */
export async function countUsersByBranchId(branchId: string): Promise<number> {
    return prisma.user.count({
        where: { branchId },
    });
}

/**
 * Counts inventory items associated with a specific branch.
 * @param branchId The ID of the branch.
 * @returns A promise that resolves to the count of inventory items.
 */
export async function countInventoryItemsByBranchId(branchId: string): Promise<number> {
    return prisma.inventoryItem.count({ // Corrected model name
        where: { branchId },
    });
}

/**
 * Counts waste logs associated with a specific branch.
 * @param branchId The ID of the branch.
 * @returns A promise that resolves to the count of waste logs.
 */
export async function countWasteLogsByBranchId(branchId: string): Promise<number> {
    return prisma.wasteLog.count({
        where: { branchId },
    });
}
