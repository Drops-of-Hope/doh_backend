/**
 * Role-Based Authorization Middleware
 * 
 * This middleware enforces role-based access control (RBAC) for protected endpoints.
 * It manages:
 * - User role extraction from JWT claims
 * - Permission checking against required roles
 * - Hierarchical role validation (admin > staff > user)
 * - Resource-specific access control
 * - Dynamic permission evaluation
 * - Audit logging for authorization decisions
 * 
 * Functions:
 * - authorizeRoles: Checks if user has required roles for endpoint access
 * - checkResourcePermissions: Validates access to specific resources
 * - evaluateHierarchy: Handles role inheritance and hierarchy
 * 
 * Supported roles:
 * - ADMIN: Full system access and management capabilities
 * - STAFF: Medical establishment staff with operational access
 * - USER: Regular donors with limited self-service access
 * 
 * Features:
 * - Flexible role definition and assignment
 * - Context-aware authorization (user can only access own data)
 * - Graceful permission denial with appropriate error messages
 * - Integration with audit logging system
 */
