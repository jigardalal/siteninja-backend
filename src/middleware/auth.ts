import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { unauthorizedResponse, forbiddenResponse } from '@/utils/apiResponse';

/**
 * Authentication Middleware
 *
 * Provides reusable functions for protecting API routes
 * Supports role-based access control and tenant isolation
 */

/**
 * Require Authentication
 *
 * Validates that the user is authenticated and optionally has specific roles
 *
 * @param request - The Next.js request object
 * @param requiredRoles - Optional array of roles that are allowed access
 * @returns The JWT token if authorized, or an error response
 *
 * @example
 * ```typescript
 * const authResult = await requireAuth(request, ['admin', 'super_admin']);
 * if (authResult instanceof NextResponse) {
 *   return authResult; // Return error response
 * }
 * // User is authenticated and has required role
 * const { role, tenantId } = authResult;
 * ```
 */
export async function requireAuth(
  request: NextRequest,
  requiredRoles?: string[]
) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return unauthorizedResponse('Authentication required');
  }

  // Check if user has required role
  if (requiredRoles && requiredRoles.length > 0) {
    if (!token.role || !requiredRoles.includes(token.role as string)) {
      return forbiddenResponse('Insufficient permissions');
    }
  }

  return token;
}

/**
 * Require Tenant Access
 *
 * Validates that the user has access to the specified tenant
 * Super admins can access all tenants
 * Regular users can only access their own tenant
 *
 * @param request - The Next.js request object
 * @param tenantId - The tenant ID to check access for
 * @returns The JWT token if authorized, or an error response
 *
 * @example
 * ```typescript
 * const authResult = await requireTenantAccess(request, params.tenantId);
 * if (authResult instanceof NextResponse) {
 *   return authResult; // Return error response
 * }
 * // User has access to this tenant
 * ```
 */
export async function requireTenantAccess(
  request: NextRequest,
  tenantId: string
) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return unauthorizedResponse('Authentication required');
  }

  // Super admin can access all tenants
  if (token.role === 'super_admin') {
    return token;
  }

  // Check if user belongs to this tenant
  if (token.tenantId !== tenantId) {
    return forbiddenResponse('Access denied to this tenant');
  }

  return token;
}

/**
 * Require Specific Role
 *
 * Validates that the user has a specific role
 *
 * @param request - The Next.js request object
 * @param role - The required role
 * @returns The JWT token if authorized, or an error response
 *
 * @example
 * ```typescript
 * const authResult = await requireRole(request, 'super_admin');
 * if (authResult instanceof NextResponse) {
 *   return authResult; // Return error response
 * }
 * // User is super admin
 * ```
 */
export async function requireRole(
  request: NextRequest,
  role: string
) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return unauthorizedResponse('Authentication required');
  }

  if (token.role !== role) {
    return forbiddenResponse(`${role} role required`);
  }

  return token;
}

/**
 * Get Current User
 *
 * Returns the current user from the JWT token without requiring authentication
 * Useful for endpoints that need to know who the user is but don't require auth
 *
 * @param request - The Next.js request object
 * @returns The JWT token or null if not authenticated
 *
 * @example
 * ```typescript
 * const user = await getCurrentUser(request);
 * if (user) {
 *   // User is logged in
 *   console.log('User ID:', user.id);
 * }
 * ```
 */
export async function getCurrentUser(request: NextRequest) {
  return await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
}

/**
 * Check if User is Admin
 *
 * Helper function to check if the current user is an admin or super_admin
 *
 * @param request - The Next.js request object
 * @returns True if user is admin or super_admin
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token || !token.role) {
    return false;
  }

  return ['admin', 'super_admin'].includes(token.role as string);
}

/**
 * Check if User is Super Admin
 *
 * Helper function to check if the current user is a super_admin
 *
 * @param request - The Next.js request object
 * @returns True if user is super_admin
 */
export async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return token?.role === 'super_admin';
}
