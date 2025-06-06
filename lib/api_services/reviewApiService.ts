import * as reviewRepository from '@/lib/repositories/reviewRepository';
import * as wasteLogRepository from '@/lib/repositories/wasteLogRepository';
// For future: import * as inventoryRepository from '@/lib/repositories/inventoryRepository';
import { prisma } from '@/lib/prisma'; // For direct data manipulation if services aren't suitable for SUPER_ADMIN actions

import type { WasteLogReview as PrismaWasteLogReview, Prisma, WasteLog as PrismaWasteLog } from '@prisma/client';
import type { AuthUser } from '@/lib/types';
import { ForbiddenError, NotFoundError, BadRequestError, ConflictError } from '@/lib/api-utils';

type ReviewableEntityType = 'WASTE_LOG'; // Add 'INVENTORY_ITEM' etc. in future
type ReviewActionType = 'CREATE' | 'UPDATE' | 'DELETE';


/**
 * Fetches all reviews, optionally filtered by status. Requires SUPER_ADMIN role.
 */
export async function fetchAllReviews(
  requestingUser: AuthUser,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
): Promise<PrismaWasteLogReview[]> {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to view reviews.');
  }
  return reviewRepository.getAll(status);
}

/**
 * Finds a review by ID. Requires SUPER_ADMIN role.
 */
export async function findReviewById(id: string, requestingUser: AuthUser): Promise<PrismaWasteLogReview> {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to view this review.');
  }
  const review = await reviewRepository.getById(id);
  if (!review) {
    throw new NotFoundError('Review not found.');
  }
  return review;
}

/**
 * Processes a review (approve or reject). Requires SUPER_ADMIN role for the reviewer.
 * If approved, performs the action described in the review (create, update, or delete an entity).
 */
export async function processReview(
  reviewId: string,
  action: 'approve' | 'reject',
  reviewNotes: string,
  reviewer: AuthUser
): Promise<PrismaWasteLogReview> {
  if (reviewer.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('Only Super Admins can process reviews.');
  }

  const review = await reviewRepository.getById(reviewId);
  if (!review) {
    throw new NotFoundError('Review not found.');
  }
  if (review.status !== 'PENDING') {
    throw new BadRequestError(`Review has already been ${review.status.toLowerCase()}.`);
  }

  if (action === 'approve') {
    // Perform the action based on review details
    // For now, assumes entityType is always 'WASTE_LOG' as per current WasteLogReview structure
    if (review.action === 'CREATE') {
      if (!review.newData) throw new BadRequestError('Review for CREATE action is missing newData.');
      // Ensure branchId exists on newData for WasteLog
      const createData = review.newData as Prisma.WasteLogCreateInput;
      if (!createData.branchId) throw new BadRequestError('BranchId is missing in review data for WasteLog creation.');

      await wasteLogRepository.create({
        ...createData,
        // Ensure relations are connected correctly if not deeply serialized in newData
        branch: { connect: { id: createData.branchId as string } },
        // If createdBy is a relation on WasteLog, connect it:
        // createdBy: { connect: { id: review.createdById } },
      });
    } else if (review.action === 'UPDATE') {
      if (!review.wasteLogId) throw new BadRequestError('Review for UPDATE action is missing entity ID.');
      if (!review.newData) throw new BadRequestError('Review for UPDATE action is missing newData.');

      const updateData = review.newData as Prisma.WasteLogUpdateInput;
       // If branchId can be updated and is present in newData
      if (updateData.branchId && typeof updateData.branchId === 'string') {
        updateData.branch = { connect: { id: updateData.branchId } };
      } else {
        // Ensure branchId is not part of the direct update data if not connecting
        delete updateData.branchId;
      }

      await wasteLogRepository.update(review.wasteLogId, updateData);
    } else if (review.action === 'DELETE') {
      if (!review.wasteLogId) throw new BadRequestError('Review for DELETE action is missing entity ID.');
      await wasteLogRepository.deleteById(review.wasteLogId);
    } else {
      throw new BadRequestError(`Unsupported review action type: ${review.action}`);
    }

    // Update the review status
    return reviewRepository.update(reviewId, {
      status: 'APPROVED',
      approvedById: reviewer.id,
      reviewNotes,
      reviewedAt: new Date(),
    });

  } else { // action === 'reject'
    return reviewRepository.update(reviewId, {
      status: 'REJECTED',
      approvedById: reviewer.id, // Still store who processed it
      reviewNotes,
      reviewedAt: new Date(),
    });
  }
}

/**
 * Creates a review request. Typically called by other API services when a non-SUPER_ADMIN
 * performs an action that requires approval.
 * This function centralizes how review requests are made.
 */
export async function createReviewRequest(
    actionType: ReviewActionType,
    entityType: ReviewableEntityType, // e.g., 'WASTE_LOG'
    entityData: any, // The data for create/update, or original for delete
    creatorId: string,
    branchId: string,
    entityId?: string, // For UPDATE/DELETE actions
    reasonForChange?: string // For DELETE or significant UPDATEs
): Promise<PrismaWasteLogReview> {

    let createInput: Prisma.WasteLogReviewCreateInput = {
        action: actionType,
        status: 'PENDING',
        createdById: creatorId,
        branchId: branchId,
        // entityType: entityType, // Add this to your Prisma schema for WasteLogReview
    };

    if (actionType === 'CREATE') {
        createInput.newData = entityData;
    } else if (actionType === 'UPDATE') {
        if (!entityId) throw new BadRequestError('Entity ID is required for UPDATE reviews.');
        // Fetch original data to store for comparison
        // This assumes WasteLog for now. A more generic system would need to fetch based on entityType
        const originalEntity = await wasteLogRepository.getById(entityId);
        if (!originalEntity) throw new NotFoundError(`${entityType} not found for review.`);
        createInput.wasteLogId = entityId; // Link to the WasteLog
        createInput.originalData = originalEntity as any;
        createInput.newData = entityData;
    } else if (actionType === 'DELETE') {
        if (!entityId) throw new BadRequestError('Entity ID is required for DELETE reviews.');
        const originalEntity = await wasteLogRepository.getById(entityId);
        if (!originalEntity) throw new NotFoundError(`${entityType} not found for review.`);
        createInput.wasteLogId = entityId;
        createInput.originalData = originalEntity as any;
        createInput.reason = reasonForChange;
    } else {
        throw new BadRequestError(`Invalid action type for review: ${actionType}`);
    }

    return reviewRepository.create(createInput);
}
