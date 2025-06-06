import { prisma } from '@/lib/prisma';
import type { User, Prisma } from '@prisma/client';

/**
 * Fetches all users from the database, including their related branch.
 * @returns A promise that resolves to an array of users.
 */
export async function getAll(): Promise<User[]> {
  return prisma.user.findMany({
    include: {
      branch: true,
    },
    orderBy: {
      username: 'asc',
    },
  });
}

/**
 * Fetches a single user by its ID, including their related branch.
 * @param id - The ID of the user to fetch.
 * @returns A promise that resolves to the user or null if not found.
 */
export async function getById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      branch: true,
    },
  });
}

/**
 * Fetches a single user by username.
 * @param username - The username to search for.
 * @returns A promise that resolves to the user or null if not found.
 */
export async function getByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
        where: { username },
        include: { branch: true },
    });
}

/**
 * Creates a new user in the database.
 * @param data - The data for the new user, conforming to Prisma.UserCreateInput.
 * @returns A promise that resolves to the newly created user.
 */
export async function create(data: Prisma.UserCreateInput): Promise<User> {
  return prisma.user.create({
    data,
    include: {
        branch: true,
    }
  });
}

/**
 * Updates an existing user in the database.
 * @param id - The ID of the user to update.
 * @param data - The data to update the user with, conforming to Prisma.UserUpdateInput.
 * @returns A promise that resolves to the updated user.
 */
export async function update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
  return prisma.user.update({
    where: { id },
    data,
    include: {
        branch: true,
    }
  });
}

/**
 * Deletes a user from the database by its ID.
 * @param id - The ID of the user to delete.
 * @returns A promise that resolves to the deleted user.
 */
export async function deleteById(id: string): Promise<User> {
  return prisma.user.delete({
    where: { id },
  });
}

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
