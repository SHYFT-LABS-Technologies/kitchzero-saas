import * as inventoryRepository from '@/lib/repositories/inventoryRepository';
import type { InventoryItem as PrismaInventoryItem, Prisma } from '@prisma/client';
import type { InventoryData, AuthUser } from '@/lib/types'; // Assuming InventoryData is defined in lib/types for DTOs
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api-utils'; // Assuming these custom error classes exist

// Helper to convert Prisma model to a more specific DTO if needed, or just use Prisma types
// For now, we'll assume PrismaInventoryItem is suitable for responses,
// and InventoryData (from lib/types) is suitable for request payloads.

/**
 * Fetches all inventory items based on user role.
 * SUPER_ADMIN gets all items. BRANCH_ADMIN gets items for their branch.
 * @param user - The authenticated user.
 * @returns A promise that resolves to an array of inventory items.
 */
export async function fetchAllInventory(user: AuthUser): Promise<PrismaInventoryItem[]> {
  if (user.role === 'SUPER_ADMIN') {
    return inventoryRepository.getAll();
  } else if (user.role === 'BRANCH_ADMIN' && user.branchId) {
    return inventoryRepository.getByBranchId(user.branchId);
  } else if (user.role === 'BRANCH_ADMIN' && !user.branchId) {
    throw new ForbiddenError('Branch admin is not associated with a branch.');
  }
  return []; // Should not reach here if roles are handled
}

/**
 * Finds an inventory item by ID and checks user authorization.
 * @param id - The ID of the inventory item.
 * @param user - The authenticated user.
 * @returns A promise that resolves to the inventory item.
 * @throws NotFoundError if the item is not found.
 * @throws ForbiddenError if the user is not authorized to access the item.
 */
export async function findInventoryItemById(id: string, user: AuthUser): Promise<PrismaInventoryItem> {
  const item = await inventoryRepository.getById(id);
  if (!item) {
    throw new NotFoundError('Inventory item not found.');
  }
  if (user.role === 'BRANCH_ADMIN' && user.branchId !== item.branchId) {
    throw new ForbiddenError('You are not authorized to access this inventory item.');
  }
  return item;
}

/**
 * Adds a new inventory item.
 * @param data - The data for the new inventory item.
 * @param user - The authenticated user.
 * @returns A promise that resolves to the created inventory item.
 * @throws ForbiddenError if a branch admin tries to create an item for another branch.
 * @throws BadRequestError if branchId is missing for a super admin.
 */
export async function addNewInventoryItem(data: InventoryData, user: AuthUser): Promise<PrismaInventoryItem> {
  let branchIdToAssign: string;

  if (user.role === 'BRANCH_ADMIN') {
    if (!user.branchId) {
      throw new ForbiddenError('Branch admin is not associated with a branch.');
    }
    if (data.branchId && data.branchId !== user.branchId) {
      throw new ForbiddenError('You can only add inventory items to your own branch.');
    }
    branchIdToAssign = user.branchId;
  } else if (user.role === 'SUPER_ADMIN') {
    if (!data.branchId) {
      throw new BadRequestError('Branch ID is required for super admin to create an inventory item.');
    }
    branchIdToAssign = data.branchId;
  } else {
    throw new ForbiddenError('You are not authorized to create inventory items.');
  }

  const preparedData: Prisma.InventoryItemCreateInput = {
    itemName: data.itemName,
    quantity: data.quantity,
    unit: data.unit,
    expiryDate: new Date(data.expiryDate), // Ensure date format is correct
    purchaseCost: data.purchaseCost,
    branch: {
      connect: { id: branchIdToAssign },
    },
    // Assuming createdBy/updatedBy will be handled if those fields exist in your model
  };

  return inventoryRepository.create(preparedData);
}

/**
 * Modifies an existing inventory item.
 * @param id - The ID of the inventory item to modify.
 * @param data - The updated data for the inventory item.
 * @param user - The authenticated user.
 * @returns A promise that resolves to the updated inventory item.
 * @throws ForbiddenError if a branch admin tries to change the branchId or modify an item not in their branch.
 */
export async function modifyInventoryItem(id: string, data: Partial<InventoryData>, user: AuthUser): Promise<PrismaInventoryItem> {
  const existingItem = await findInventoryItemById(id, user); // This also performs auth check for branch admin

  if (user.role === 'BRANCH_ADMIN') {
    if (data.branchId && data.branchId !== existingItem.branchId) {
      throw new ForbiddenError('Branch admins cannot change the branch of an inventory item.');
    }
  }

  const preparedData: Prisma.InventoryItemUpdateInput = {
    ...data,
    ...(data.expiryDate && { expiryDate: new Date(data.expiryDate) }), // Ensure date format
    // If branchId is part of data and user is SUPER_ADMIN, it can be updated.
    // For BRANCH_ADMIN, branchId cannot be changed from existingItem.branchId.
    ...(user.role === 'SUPER_ADMIN' && data.branchId && {
        branch: { connect: { id: data.branchId } }
    }),
  };
  // Remove branchId from data if user is BRANCH_ADMIN to prevent accidental update if it was part of data
  if (user.role === 'BRANCH_ADMIN') {
    delete preparedData.branchId;
  }


  return inventoryRepository.update(id, preparedData);
}

/**
 * Removes an inventory item.
 * @param id - The ID of the inventory item to remove.
 * @param user - The authenticated user.
 * @returns A promise that resolves when the item is deleted.
 */
export async function removeInventoryItem(id: string, user: AuthUser): Promise<PrismaInventoryItem> {
  await findInventoryItemById(id, user); // Ensures item exists and user is authorized
  return inventoryRepository.deleteById(id);
}
