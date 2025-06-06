import { z } from 'zod'

export const RESOURCES = {
  WASTE_LOGS: 'waste_logs',
  INVENTORY: 'inventory',
  BRANCHES: 'branches',
  USERS: 'users',
  REVIEWS: 'reviews',
  ANALYTICS: 'analytics',
  EXPORTS: 'exports'
} as const

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
  ADMIN: 'admin'
} as const

export const SCOPES = {
  OWN: 'own',
  BRANCH: 'branch',
  GLOBAL: 'global'
} as const

export type Resource = typeof RESOURCES[keyof typeof RESOURCES]
export type Action = typeof ACTIONS[keyof typeof ACTIONS]
export type Scope = typeof SCOPES[keyof typeof SCOPES]

export interface Permission {
  resource: Resource
  action: Action
  scope: Scope
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than'
  value: any
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: [
    { resource: RESOURCES.WASTE_LOGS, action: ACTIONS.ADMIN, scope: SCOPES.GLOBAL },
    { resource: RESOURCES.INVENTORY, action: ACTIONS.ADMIN, scope: SCOPES.GLOBAL },
    { resource: RESOURCES.BRANCHES, action: ACTIONS.ADMIN, scope: SCOPES.GLOBAL },
    { resource: RESOURCES.USERS, action: ACTIONS.ADMIN, scope: SCOPES.GLOBAL },
    { resource: RESOURCES.REVIEWS, action: ACTIONS.ADMIN, scope: SCOPES.GLOBAL },
    { resource: RESOURCES.ANALYTICS, action: ACTIONS.READ, scope: SCOPES.GLOBAL },
    { resource: RESOURCES.EXPORTS, action: ACTIONS.EXPORT, scope: SCOPES.GLOBAL }
  ],
  
  BRANCH_ADMIN: [
    { resource: RESOURCES.WASTE_LOGS, action: ACTIONS.CREATE, scope: SCOPES.BRANCH },
    { resource: RESOURCES.WASTE_LOGS, action: ACTIONS.READ, scope: SCOPES.BRANCH },
    { resource: RESOURCES.WASTE_LOGS, action: ACTIONS.UPDATE, scope: SCOPES.BRANCH },
    { resource: RESOURCES.WASTE_LOGS, action: ACTIONS.DELETE, scope: SCOPES.BRANCH },
    { resource: RESOURCES.INVENTORY, action: ACTIONS.CREATE, scope: SCOPES.BRANCH },
    { resource: RESOURCES.INVENTORY, action: ACTIONS.READ, scope: SCOPES.BRANCH },
    { resource: RESOURCES.INVENTORY, action: ACTIONS.UPDATE, scope: SCOPES.BRANCH },
    { resource: RESOURCES.INVENTORY, action: ACTIONS.DELETE, scope: SCOPES.BRANCH },
    { resource: RESOURCES.ANALYTICS, action: ACTIONS.READ, scope: SCOPES.BRANCH },
    { resource: RESOURCES.EXPORTS, action: ACTIONS.EXPORT, scope: SCOPES.BRANCH },
    { resource: RESOURCES.BRANCHES, action: ACTIONS.READ, scope: SCOPES.OWN }
  ]
}

export interface PermissionContext {
  userId: string
  userRole: string
  branchId?: string
  resource: Resource
  action: Action
  resourceData?: any
  targetBranchId?: string
}

export class PermissionChecker {
  hasPermission(context: PermissionContext): boolean {
    const userPermissions = ROLE_PERMISSIONS[context.userRole] || []
    
    return userPermissions.some(permission => 
      this.matchesPermission(permission, context)
    )
  }
  
  private matchesPermission(permission: Permission, context: PermissionContext): boolean {
    if (permission.resource !== context.resource && permission.resource !== '*') {
      return false
    }
    
    if (permission.action !== context.action && permission.action !== ACTIONS.ADMIN) {
      return false
    }
    
    return this.matchesScope(permission.scope, context)
  }
  
  private matchesScope(scope: Scope, context: PermissionContext): boolean {
    switch (scope) {
      case SCOPES.GLOBAL:
        return true
        
      case SCOPES.BRANCH:
        if (!context.branchId) return false
        if (context.targetBranchId && context.targetBranchId !== context.branchId) {
          return false
        }
        return true
        
      case SCOPES.OWN:
        if (context.resourceData?.userId) {
          return context.resourceData.userId === context.userId
        }
        if (context.resourceData?.branchId) {
          return context.resourceData.branchId === context.branchId
        }
        return true
        
      default:
        return false
    }
  }
}

export const permissionChecker = new PermissionChecker()

export function canAccessResource(
  userRole: string,
  userId: string,
  userBranchId: string | undefined,
  resource: Resource,
  action: Action,
  resourceData?: any
): boolean {
  return permissionChecker.hasPermission({
    userId,
    userRole,
    branchId: userBranchId,
    resource,
    action,
    resourceData,
    targetBranchId: resourceData?.branchId
  })
}