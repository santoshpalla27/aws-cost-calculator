/**
 * Role-Based Access Control Middleware
 */

const { AuthorizationError } = require('../utils/errors');
const { ROLES } = require('../utils/constants');

/**
 * Check if user has required role(s)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user has required permission(s)
 */
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }

    const userPermissions = req.user.permissions || [];
    
    // Super admin has all permissions
    if (userPermissions.includes('*')) {
      return next();
    }

    const hasPermission = requiredPermissions.every((permission) => {
      // Check for exact match or wildcard match
      return userPermissions.some((userPerm) => {
        if (userPerm === permission) return true;
        // Check wildcard (e.g., 'quiz:*' matches 'quiz:read')
        const [resource, action] = permission.split(':');
        const [userResource, userAction] = userPerm.split(':');
        return userResource === resource && userAction === '*';
      });
    });

    if (!hasPermission) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Check if user is admin
 */
const isAdmin = requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN);

/**
 * Check if user is super admin
 */
const isSuperAdmin = requireRole(ROLES.SUPER_ADMIN);

/**
 * Check if user owns the resource or is admin
 */
const isOwnerOrAdmin = (getUserIdFromRequest) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }

    const resourceUserId = getUserIdFromRequest(req);
    const isOwner = req.user.id === resourceUserId;
    const isAdminUser = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);

    if (!isOwner && !isAdminUser) {
      return next(new AuthorizationError('Access denied'));
    }

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  isAdmin,
  isSuperAdmin,
  isOwnerOrAdmin,
};