/**
 * TypeScript Type Definitions
 * 
 * This file contains custom TypeScript interfaces and types
 * used throughout the blood donation backend application.
 * It defines:
 * - User authentication and authorization types
 * - API request and response interfaces
 * - Database model extensions and custom types
 * - JWT claims and token payload structures
 * - Error handling and validation types
 * - Configuration and environment variable types
 * 
 * Type categories:
 * 
 * Authentication Types:
 * - UserClaims: JWT token claims structure from Asgardeo
 * - AuthenticatedUser: User information after authentication
 * - UserRole: Role-based access control enum extensions
 * - TokenPayload: JWT payload structure and validation
 * 
 * API Types:
 * - ApiResponse<T>: Standardized API response wrapper
 * - PaginatedResponse<T>: Paginated data response structure
 * - ValidationError: Input validation error details
 * - ErrorResponse: Error response format standardization
 * 
 * Business Logic Types:
 * - DonorEligibility: Donor eligibility assessment results
 * - BloodCompatibility: Blood type compatibility matrix
 * - InventoryLevel: Blood inventory level tracking
 * - RequestPriority: Blood request priority classification
 */
