import { prisma } from '@/lib/prisma';
import type { WasteLogReview, Prisma } from '@prisma/client';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const reviewInclude = {
  creator: {
    select: { id: true, username: true, role: true },
  },
  approver: {
    select: { id: true, username: true, role: true },
  },
  wasteLog: { // Assuming the review is primarily for WasteLogs as per WasteLogReview type
    include: {
      branch: {
        select: { id: true, name: true, location: true },
      },
    },
  },
  // If you add reviews for other entities like InventoryItem, include them similarly:
  // inventoryItem: { include: { branch: true } },
};

/**
 * Fetches reviews, optionally filtered by status.
 * Includes related creator, approver, and the entity being reviewed (e.g., wasteLog with its branch).
 * @param status - Optional status to filter reviews by.
 * @returns A promise that resolves to an array of reviews.
 */
export async function getAll(status?: ReviewStatus): Promise<WasteLogReview[]> {
  return prisma.wasteLogReview.findMany({
    where: status ? { status } : {},
    include: reviewInclude,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Fetches a single review by its ID, including related data.
 * @param id - The ID of the review to fetch.
 * @returns A promise that resolves to the review or null if not found.
 */
export async function getById(id: string): Promise<WasteLogReview | null> {
  return prisma.wasteLogReview.findUnique({
    where: { id },
    include: reviewInclude,
  });
}

/**
 * Creates a new review in the database.
 * @param data - The data for the new review, conforming to Prisma.WasteLogReviewCreateInput.
 * @returns A promise that resolves to the newly created review.
 */
export async function create(data: Prisma.WasteLogReviewCreateInput): Promise<WasteLogReview> {
  return prisma.wasteLogReview.create({
    data,
    include: reviewInclude,
  });
}

/**
 * Updates an existing review in the database.
 * Typically used to change status, add review notes, and set the approver.
 * @param id - The ID of the review to update.
 * @param data - The data to update the review with, conforming to Prisma.WasteLogReviewUpdateInput.
 * @returns A promise that resolves to the updated review.
 */
export async function update(id: string, data: Prisma.WasteLogReviewUpdateInput): Promise<WasteLogReview> {
  return prisma.wasteLogReview.update({
    where: { id },
    data,
    include: reviewInclude,
  });
}

/**
 * Deletes a review from the database by its ID.
 * This is less common but provided for completeness.
 * @param id - The ID of the review to delete.
 * @returns A promise that resolves to the deleted review.
 */
export async function deleteById(id: string): Promise<WasteLogReview> {
  return prisma.wasteLogReview.delete({
    where: { id },
  });
}
