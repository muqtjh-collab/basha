
/**
 * Checks if a user has a specific permission for a module/action.
 * Super Admins (role level 1) always return true.
 */
export const hasPermission = (
  user: any | null | undefined,
  module: string,
  action: 'read' | 'write' | 'delete' = 'read'
): boolean => {
  if (!user || !user.role) return false;
  
  // Super Admin bypass
  if (user.role.name === 'super_admin' || user.role.level === 1) {
    return true;
  }

  // Get default role permissions
  const defaultPerms = user.role.defaultPermissions || {};
  const customPerms = user.customPermissions || {};
  
  // Merge permissions (custom permissions override defaults)
  const mergedPerms = {
    ...defaultPerms,
    ...customPerms,
  };

  const modulePerms = mergedPerms[module];
  
  if (!modulePerms) return false;
  
  // Boolean direct check (e.g., reports: true) or nested actions check (e.g. vehicles: { read: true })
  if (typeof modulePerms === 'boolean') {
    return modulePerms;
  }
  
  return !!modulePerms[action];
};

/**
 * Checks if a user's geographic scope covers a target branch.
 * If geographicScope is null/empty or user is super admin/ops manager, returns true.
 */
export const isBranchInScope = (
  user: any | null | undefined,
  branchId: string | null | undefined
): boolean => {
  if (!user) return false;
  if (user.role.name === 'super_admin' || user.role.name === 'operations_manager') return true;
  if (!branchId) return false;
  if (!user.geographicScope || user.geographicScope.length === 0) {
    // If agent is assigned a branch, their scope defaults to that branch
    return user.branchId === branchId;
  }
  return user.geographicScope.includes(branchId);
};
