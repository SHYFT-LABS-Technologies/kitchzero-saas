import * as userRepository from '@/lib/repositories/userRepository';
import * as branchRepository from '@/lib/repositories/branchRepository'; // To validate branchId
import { hashPassword } from '@/lib/auth';
import type { User as PrismaUser, Prisma } from '@prisma/client';
import type { UserCreationData, UserUpdateData, AuthUser } from '@/lib/types';
import { ForbiddenError, NotFoundError, BadRequestError, ConflictError } from '@/lib/api-utils';

// Helper to exclude password from user object
function excludePassword(user: PrismaUser): Omit<PrismaUser, 'password'> {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Fetches all users. Requires SUPER_ADMIN role.
 */
export async function fetchAllUsers(requestingUser: AuthUser): Promise<Omit<PrismaUser, 'password'>[]> {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to view all users.');
  }
  const users = await userRepository.getAll();
  return users.map(excludePassword);
}

/**
 * Finds a user by ID. Requires SUPER_ADMIN role.
 */
export async function findUserById(id: string, requestingUser: AuthUser): Promise<Omit<PrismaUser, 'password'>> {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to view this user.');
  }
  const user = await userRepository.getById(id);
  if (!user) {
    throw new NotFoundError('User not found.');
  }
  return excludePassword(user);
}

/**
 * Adds a new user. Requires SUPER_ADMIN role.
 */
export async function addNewUser(data: UserCreationData, requestingUser: AuthUser): Promise<Omit<PrismaUser, 'password'>> {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to create users.');
  }

  if (!data.password) {
    throw new BadRequestError('Password is required for new users.');
  }

  // Validate role
  if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(data.role)) {
    throw new BadRequestError('Invalid user role specified.');
  }

  if (data.role === 'BRANCH_ADMIN') {
    if (!data.branchId) {
      throw new BadRequestError('Branch ID is required for Branch Admins.');
    }
    const branchExists = await branchRepository.getById(data.branchId);
    if (!branchExists) {
      throw new BadRequestError('Specified Branch ID does not exist.');
    }
  } else {
    // Ensure branchId is null if not a BRANCH_ADMIN
    data.branchId = null;
  }

  const existingUser = await userRepository.getByUsername(data.username);
  if (existingUser) {
    throw new ConflictError('Username already exists.');
  }

  const hashedPassword = await hashPassword(data.password);

  const preparedData: Prisma.UserCreateInput = {
    username: data.username,
    password: hashedPassword,
    role: data.role,
    branch: data.role === 'BRANCH_ADMIN' && data.branchId ? { connect: { id: data.branchId } } : undefined,
  };

  const newUser = await userRepository.create(preparedData);
  return excludePassword(newUser);
}

/**
 * Modifies an existing user. Requires SUPER_ADMIN role.
 */
export async function modifyUser(id: string, data: UserUpdateData, requestingUser: AuthUser): Promise<Omit<PrismaUser, 'password'>> {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to modify users.');
  }

  const userToUpdate = await userRepository.getById(id);
  if (!userToUpdate) {
    throw new NotFoundError('User not found.');
  }

  // Prevent SUPER_ADMIN from changing their own role if they are the only one.
  // This logic might be more complex depending on business rules (e.g., >1 super admin must exist)
  if (userToUpdate.id === requestingUser.id && data.role && data.role !== 'SUPER_ADMIN') {
     const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
     if (superAdminCount <= 1) {
        throw new BadRequestError('Cannot change the role of the only Super Admin.');
     }
  }


  const updateData: Prisma.UserUpdateInput = {};

  if (data.username && data.username !== userToUpdate.username) {
    const existingUser = await userRepository.getByUsername(data.username);
    if (existingUser) {
      throw new ConflictError('Username already exists.');
    }
    updateData.username = data.username;
  }

  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }

  if (data.role) {
    if (!['SUPER_ADMIN', 'BRANCH_ADMIN'].includes(data.role)) {
      throw new BadRequestError('Invalid user role specified.');
    }
    updateData.role = data.role;
    if (data.role === 'SUPER_ADMIN') {
      updateData.branchId = null; // Disassociate from branch if becoming SUPER_ADMIN
    }
  }

  if (data.role === 'BRANCH_ADMIN') {
    if (!data.branchId) {
      throw new BadRequestError('Branch ID is required for Branch Admins.');
    }
    const branchExists = await branchRepository.getById(data.branchId);
    if (!branchExists) {
      throw new BadRequestError('Specified Branch ID does not exist.');
    }
    updateData.branchId = data.branchId;
  } else if (data.role === 'SUPER_ADMIN') {
      updateData.branchId = null; // Explicitly set to null if role changes to SUPER_ADMIN
  } else if (data.branchId === null) { // Allows unsetting branchId if role is not BRANCH_ADMIN
      updateData.branchId = null;
  }


  if (Object.keys(updateData).length === 0) {
    // If only branchId was potentially changed but role wasn't BRANCH_ADMIN,
    // or if no actual changes were made to user fields.
    // However, branchId changes are handled above.
    // This check ensures we don't make an empty update call.
     if (data.branchId !== undefined && data.role === 'BRANCH_ADMIN' && data.branchId !== userToUpdate.branchId) {
        // This case is covered if data.branchId is set and role is BRANCH_ADMIN
     } else if (data.branchId === null && userToUpdate.branchId !== null && userToUpdate.role !== 'BRANCH_ADMIN' ) {
        // This case is for unsetting branchId for non-branch-admins
     }
     else {
        // Return the user as is if no relevant fields were changed
        // or if only branchId was provided but not applicable to role change.
        return excludePassword(userToUpdate);
     }
  }


  const updatedUser = await userRepository.update(id, updateData);
  return excludePassword(updatedUser);
}

/**
 * Removes a user. Requires SUPER_ADMIN role.
 */
export async function removeUser(id: string, requestingUser: AuthUser): Promise<Omit<PrismaUser, 'password'>> {
  if (requestingUser.role !== 'SUPER_ADMIN') {
    throw new ForbiddenError('You are not authorized to delete users.');
  }

  if (id === requestingUser.id) {
    throw new BadRequestError('You cannot delete your own account.');
  }

  const userToDelete = await userRepository.getById(id);
  if (!userToDelete) {
    throw new NotFoundError('User not found.');
  }

  // Additional check: prevent deletion of the last SUPER_ADMIN
  if (userToDelete.role === 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (superAdminCount <= 1) {
      throw new BadRequestError('Cannot delete the only Super Admin account.');
    }
  }

  const deletedUser = await userRepository.deleteById(id);
  return excludePassword(deletedUser);
}
