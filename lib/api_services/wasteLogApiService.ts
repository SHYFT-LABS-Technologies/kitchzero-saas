import * as wasteLogRepository from '@/lib/repositories/wasteLogRepository';
import { prisma } from '@/lib/prisma'; // For creating review entries directly
import type { WasteLog as PrismaWasteLog, Prisma, WasteLogReview as PrismaWasteLogReview } from '@prisma/client';
import type { WasteLogData, AuthUser, DeletionReason } from '@/lib/types';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api-utils';

/**
 * Fetches all waste logs based on user role.
 */
export async function fetchAllWasteLogs(user: AuthUser): Promise<PrismaWasteLog[]> {
  if (user.role === 'SUPER_ADMIN') {
    return wasteLogRepository.getAll();
  } else if (user.role === 'BRANCH_ADMIN' && user.branchId) {
    return wasteLogRepository.getByBranchId(user.branchId);
  } else if (user.role === 'BRANCH_ADMIN' && !user.branchId) {
    throw new ForbiddenError('Branch admin is not associated with a branch.');
  }
  return [];
}

/**
 * Finds a waste log by ID and checks user authorization.
 */
export async function findWasteLogById(id: string, user: AuthUser): Promise<PrismaWasteLog> {
  const log = await wasteLogRepository.getById(id);
  if (!log) {
    throw new NotFoundError('Waste log not found.');
  }
  if (user.role === 'BRANCH_ADMIN' && user.branchId !== log.branchId) {
    throw new ForbiddenError('You are not authorized to access this waste log.');
  }
  return log;
}

/**
 * Records a new waste log. Creates a review request if submitted by a BRANCH_ADMIN.
 */
export async function recordNewWasteLog(
  data: WasteLogData,
  user: AuthUser
): Promise<PrismaWasteLog | { message: string; reviewId: string }> {
  let branchIdToAssign: string;

  if (user.role === 'BRANCH_ADMIN') {
    if (!user.branchId) {
      throw new ForbiddenError('Branch admin is not associated with a branch.');
    }
    if (data.branchId && data.branchId !== user.branchId) {
      throw new ForbiddenError('You can only add waste logs to your own branch.');
    }
    branchIdToAssign = user.branchId;

    // Create a review request for BRANCH_ADMIN
    const review = await prisma.wasteLogReview.create({
      data: {
        action: 'CREATE',
        status: 'PENDING',
        newData: data as any, // Store the proposed data
        createdById: user.id,
        branchId: branchIdToAssign,
      },
    });
    return { message: 'Waste log creation request submitted for approval.', reviewId: review.id };

  } else if (user.role === 'SUPER_ADMIN') {
    if (!data.branchId) {
      throw new BadRequestError('Branch ID is required for super admin to create a waste log.');
    }
    branchIdToAssign = data.branchId;

    const preparedData: Prisma.WasteLogCreateInput = {
      ...data,
      wasteDate: data.wasteDate ? new Date(data.wasteDate) : new Date(),
      branch: { connect: { id: branchIdToAssign } },
      // createdBy: { connect: { id: user.id } } // If you have user relations on WasteLog
    };
    return wasteLogRepository.create(preparedData);
  } else {
    throw new ForbiddenError('You are not authorized to create waste logs.');
  }
}

/**
 * Modifies an existing waste log. Creates a review request if modified by a BRANCH_ADMIN.
 */
export async function modifyWasteLog(
  id: string,
  data: Partial<WasteLogData>,
  user: AuthUser
): Promise<PrismaWasteLog | { message: string; reviewId: string }> {
  const existingLog = await findWasteLogById(id, user); // Auth check included

  if (user.role === 'BRANCH_ADMIN') {
    if (!user.branchId) throw new ForbiddenError('Branch admin is not associated with a branch.');
    // Branch admin cannot change branchId
    if (data.branchId && data.branchId !== existingLog.branchId) {
        throw new ForbiddenError('Branch admins cannot change the branch of a waste log.');
    }

    const review = await prisma.wasteLogReview.create({
      data: {
        action: 'UPDATE',
        status: 'PENDING',
        wasteLogId: existingLog.id,
        originalData: existingLog as any,
        newData: data as any,
        createdById: user.id,
        branchId: existingLog.branchId,
      },
    });
    return { message: 'Waste log update request submitted for approval.', reviewId: review.id };
  } else if (user.role === 'SUPER_ADMIN') {
    const preparedData: Prisma.WasteLogUpdateInput = {
      ...data,
      ...(data.wasteDate && { wasteDate: new Date(data.wasteDate) }),
      ...(data.branchId && { branch: { connect: { id: data.branchId } } }),
    };
     // Prevent branchId from being accidentally removed if not provided by SUPER_ADMIN
    if (data.branchId === null && user.role === 'SUPER_ADMIN') {
        throw new BadRequestError('Branch ID cannot be null when updating via Super Admin.');
    }


    return wasteLogRepository.update(id, preparedData);
  } else {
    throw new ForbiddenError('You are not authorized to modify waste logs.');
  }
}

/**
 * Removes a waste log. Creates a review request if removed by a BRANCH_ADMIN.
 */
export async function removeWasteLog(
  id: string,
  deletionReason: string | undefined,
  user: AuthUser
): Promise<{ message: string; reviewId?: string; deletedWasteLogId?: string }> {
  const existingLog = await findWasteLogById(id, user); // Auth check included

  if (user.role === 'BRANCH_ADMIN') {
    if (!user.branchId) throw new ForbiddenError('Branch admin is not associated with a branch.');
    if (!deletionReason) throw new BadRequestError('Deletion reason is required for branch admins.');

    const review = await prisma.wasteLogReview.create({
      data: {
        action: 'DELETE',
        status: 'PENDING',
        wasteLogId: existingLog.id,
        originalData: existingLog as any,
        reason: deletionReason,
        createdById: user.id,
        branchId: existingLog.branchId,
      },
    });
    return { message: 'Waste log deletion request submitted for approval.', reviewId: review.id };
  } else if (user.role === 'SUPER_ADMIN') {
    await wasteLogRepository.deleteById(id);
    return { message: 'Waste log deleted successfully.', deletedWasteLogId: id };
  } else {
    throw new ForbiddenError('You are not authorized to delete waste logs.');
  }
}
