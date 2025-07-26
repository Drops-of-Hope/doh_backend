/**
 * Authentication Middleware
 * 
 * This middleware handles JWT token verification and user authentication.
 * It provides:
 * - JWT signature validation using JWKS from Asgardeo
 * - Token expiration checking
 * - User identity extraction from JWT claims
 * - Request context population with user information
 * - Invalid token handling and error responses
 * - Token blacklist checking for logout functionality
 * 
 * Functions:
 * - authenticateUser: Verifies JWT tokens via JWKS validation
 * - extractUserClaims: Parses user information from validated tokens
 * - handleTokenErrors: Manages authentication failures gracefully
 * 
 * Security features:
 * - JWKS key rotation support
 * - Multiple signature algorithm validation
 * - Issuer and audience verification
 * - Clock skew tolerance for token validation
 * - Secure error messaging to prevent information leakage
 */
