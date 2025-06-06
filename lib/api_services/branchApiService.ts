import * as branchRepository from '@/lib/repositories/branchRepository';
import * as userRepository from '@/lib/repositories/userRepository'; // Assuming this will be created/exists
import * as inventoryRepository from '@/lib/repositories/inventoryRepository';
import * as wasteLogRepository from '@/lib/repositories/wasteLogRepository';
import type { Branch as PrismaBranch, Prisma } from '@prisma/client';
import type { BranchData, AuthUser } from '@/lib/types';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api-utils';

// The repository returns Branch from @prisma/client, which might include relations
// based on `branchInclude`. We can call this `BranchWithDetails` or similar if needed,
// or just use PrismaBranch and ensure components handle potentially optional relations.
// For now, PrismaBranch from repo (which includes users and counts) is fine.

/**
 * Fetches all branches with their related user counts and item counts.
 * @returns A promise that resolves to an array of branches.
 */
export async function fetchAllBranches(): Promise<PrismaBranch[]> {
  // Repository already includes users and _counts
  return branchRepository.getAll();
}

/**
 * Finds a branch by ID, including related user counts and item counts.
 * @param id - The ID of the branch.
 * @returns A promise that resolves to the branch.
 * @throws NotFoundError if the branch is not found.
 */
export async function findBranchById(id: string): Promise<PrismaBranch> {
  const branch = await branchRepository.getById(id);
  if (!branch) {
    throw new NotFoundError('Branch not found.');
  }
  // Repository already includes users and _counts
  return branch;
}

/**
 * Adds a new branch. Requires SUPER_ADMIN role.
 * @param data - Data for the new branch (name, location).
 * @param user - The authenticated user.
 * @returns A promise that resolves to the created branch.
 * @throws ForbiddenError if the user is not a SUPER_ADMIN.
 */
export async function addNewBranch(data: BranchData, user: AuthUser): Promise<PrismaBranch> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to create new branches.');
  }

  // Additional validation (e.g., check for name uniqueness if not handled by DB constraint message)
  // For now, relying on Prisma for unique constraints.

  const preparedData: Prisma.BranchCreateInput = {
    name: data.name,
    location: data.location,
  };

  return branchRepository.create(preparedData);
}

/**
 * Modifies an existing branch. Requires SUPER_ADMIN role.
 * @param id - The ID of the branch to modify.
 * @param data - Updated data for the branch.
 * @param user - The authenticated user.
 * @returns A promise that resolves to the updated branch.
 * @throws ForbiddenError if the user is not a SUPER_ADMIN.
 */
export async function modifyBranch(id: string, data: Partial<BranchData>, user: AuthUser): Promise<PrismaBranch> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to modify branches.');
  }

  await findBranchById(id); // Ensures branch exists before attempting update

  const preparedData: Prisma.BranchUpdateInput = {
    ...(data.name && { name: data.name }),
    ...(data.location && { location: data.location }),
  };

  if (Object.keys(preparedData).length === 0) {
    throw new BadRequestError("No update data provided.");
  }

  return branchRepository.update(id, preparedData);
}

/**
 * Removes a branch. Requires SUPER_ADMIN role.
 * Checks for dependencies (users, inventory, waste logs) before deletion.
 * @param id - The ID of the branch to remove.
 * @param user - The authenticated user.
 * @returns A promise that resolves when the branch is deleted.
 * @throws ForbiddenError if the user is not a SUPER_ADMIN.
 * @throws BadRequestError if the branch has active dependencies.
 */
export async function removeBranch(id: string, user: AuthUser): Promise<PrismaBranch> {
  if (user.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to delete branches.');
  }

  await findBranchById(id); // Ensures branch exists

  // Dependency Checks
  const userCount = await userRepository.countUsersByBranchId(id); // Requires this function in userRepository
  const inventoryCount = await inventoryRepository.countInventoryItemsByBranchId(id);
  const wasteLogCount = await wasteLogRepository.countWasteLogsByBranchId(id);

  const dependencies = [];
  if (userCount > 0) dependencies.push(`Users: ${userCount}`);
  if (inventoryCount > 0) dependencies.push(`Inventory Items: ${inventoryCount}`);
  if (wasteLogCount > 0) dependencies.push(`Waste Logs: ${wasteLogCount}`);

  if (dependencies.length > 0) {
    throw new BadRequestError(
      `Cannot delete branch. It has active dependencies: ${dependencies.join(', ')}.`
    );
  }

  return branchRepository.deleteById(id);
}
