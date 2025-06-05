import type { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export interface AuthUser {
  id: string
  username: string
  role: "SUPER_ADMIN" | "BRANCH_ADMIN"
  branchId?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" })
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser
  } catch {
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return null

  return verifyToken(token)
}

export async function authenticateUser(username: string, password: string): Promise<AuthUser | null> {
  try {
    console.log("🔍 Looking for user:", username)

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true },
    })

    if (!user) {
      console.log("❌ User not found:", username)
      return null
    }

    console.log("✅ User found:", user.username)
    console.log("🔐 Verifying password...")

    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid) {
      console.log("❌ Invalid password for user:", username)
      return null
    }

    console.log("✅ Password verified for user:", username)

    return {
      id: user.id,
      username: user.username,
      role: user.role as "SUPER_ADMIN" | "BRANCH_ADMIN",
      branchId: user.branchId || undefined,
    }
  } catch (error) {
    console.error("❌ Error in authenticateUser:", error)
    return null
  }
}
