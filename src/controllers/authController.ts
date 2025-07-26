/**
 * Authentication Controller
 * 
 * This controller handles authentication-related HTTP requests and responses.
 * It manages:
 * - User login and logout endpoints
 * - Token validation and refresh operations
 * - User profile retrieval and updates
 * - OAuth callback handling for Asgardeo integration
 * - Session management and security
 * - User metadata extraction from JWT claims
 * 
 * Endpoints provided:
 * - POST /auth/login - Initiate OAuth login flow
 * - POST /auth/logout - Terminate user session
 * - GET /auth/profile - Retrieve authenticated user profile
 * - POST /auth/refresh - Refresh access tokens
 * - GET /auth/callback - Handle OAuth callback from Asgardeo
 * 
 * Security features:
 * - CSRF protection
 * - Rate limiting on authentication endpoints
 * - Secure cookie handling for tokens
 * - Input validation and sanitization
 */
