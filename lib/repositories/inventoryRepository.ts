import { prisma } from '@/lib/prisma';
import type { InventoryItem, Prisma } from '@prisma/client';

/**
 * Fetches all inventory items from the database, including their related branch.
 * @returns A promise that resolves to an array of inventory items.
 */
export async function getAll(): Promise<InventoryItem[]> {
  return prisma.inventoryItem.findMany({
    include: {
      branch: true, // Include the related branch information
    },
    orderBy: {
      createdAt: 'desc', // Default ordering
    },
  });
}

/**
 * Fetches a single inventory item by its ID, including its related branch.
 * @param id - The ID of the inventory item to fetch.
 * @returns A promise that resolves to the inventory item or null if not found.
 */
export async function getById(id: string): Promise<InventoryItem | null> {
  return prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      branch: true,
    },
  });
}

/**
 * Creates a new inventory item in the database.
 * @param data - The data for the new inventory item, conforming to Prisma.InventoryItemCreateInput.
 * @returns A promise that resolves to the newly created inventory item.
 */
export async function create(data: Prisma.InventoryItemCreateInput): Promise<InventoryItem> {
  return prisma.inventoryItem.create({
    data,
  });
}

/**
 * Updates an existing inventory item in the database.
 * @param id - The ID of the inventory item to update.
 * @param data - The data to update the inventory item with, conforming to Prisma.InventoryItemUpdateInput.
 * @returns A promise that resolves to the updated inventory item.
 */
export async function update(id: string, data: Prisma.InventoryItemUpdateInput): Promise<InventoryItem> {
  return prisma.inventoryItem.update({
    where: { id },
    data,
  });
}

/**
 * Deletes an inventory item from the database by its ID.
 * @param id - The ID of the inventory item to delete.
 * @returns A promise that resolves when the item is deleted.
 */
export async function deleteById(id: string): Promise<InventoryItem> {
  return prisma.inventoryItem.delete({
    where: { id },
  });
}

/**
 * Fetches inventory items by branch ID.
 * @param branchId - The ID of the branch.
 * @returns A promise that resolves to an array of inventory items for the specified branch.
 */
export async function getByBranchId(branchId: string): Promise<InventoryItem[]> {
    return prisma.inventoryItem.findMany({
        where: { branchId },
        include: {
            branch: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}
