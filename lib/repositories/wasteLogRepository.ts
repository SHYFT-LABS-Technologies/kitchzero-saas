import { prisma } from '@/lib/prisma';
import type { WasteLog, Prisma } from '@prisma/client';

/**
 * Fetches all waste logs from the database, including their related branch.
 * Orders by createdAt descending by default.
 * @returns A promise that resolves to an array of waste logs.
 */
export async function getAll(): Promise<WasteLog[]> {
  return prisma.wasteLog.findMany({
    include: {
      branch: true, // Include the related branch information
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Fetches a single waste log by its ID, including its related branch.
 * @param id - The ID of the waste log to fetch.
 * @returns A promise that resolves to the waste log or null if not found.
 */
export async function getById(id: string): Promise<WasteLog | null> {
  return prisma.wasteLog.findUnique({
    where: { id },
    include: {
      branch: true,
    },
  });
}

/**
 * Creates a new waste log in the database.
 * @param data - The data for the new waste log, conforming to Prisma.WasteLogCreateInput.
 * @returns A promise that resolves to the newly created waste log.
 */
export async function create(data: Prisma.WasteLogCreateInput): Promise<WasteLog> {
  return prisma.wasteLog.create({
    data,
    include: { // Ensure created object also includes branch for consistency if needed immediately
        branch: true,
    }
  });
}

/**
 * Updates an existing waste log in the database.
 * @param id - The ID of the waste log to update.
 * @param data - The data to update the waste log with, conforming to Prisma.WasteLogUpdateInput.
 * @returns A promise that resolves to the updated waste log.
 */
export async function update(id: string, data: Prisma.WasteLogUpdateInput): Promise<WasteLog> {
  return prisma.wasteLog.update({
    where: { id },
    data,
    include: {
        branch: true,
    }
  });
}

/**
 * Deletes a waste log from the database by its ID.
 * @param id - The ID of the waste log to delete.
 * @returns A promise that resolves to the deleted waste log.
 */
export async function deleteById(id: string): Promise<WasteLog> {
  return prisma.wasteLog.delete({
    where: { id },
  });
}

/**
 * Fetches waste logs by branch ID.
 * @param branchId - The ID of the branch.
 * @returns A promise that resolves to an array of waste logs for the specified branch.
 */
export async function getByBranchId(branchId: string): Promise<WasteLog[]> {
    return prisma.wasteLog.findMany({
        where: { branchId },
        include: {
            branch: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}
