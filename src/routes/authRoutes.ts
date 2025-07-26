/**
 * Authentication Routes
 * 
 * This file defines all authentication-related API routes and endpoints.
 * It configures:
 * - OAuth 2.0 login and callback routes
 * - Token validation and refresh endpoints
 * - User profile management routes
 * - Session management endpoints
 * - Password reset and recovery flows (if applicable)
 * - Account verification routes
 * 
 * Route definitions:
 * - POST /auth/login - Initiate OAuth login with Asgardeo
 * - GET /auth/callback - Handle OAuth callback and token exchange
 * - POST /auth/refresh - Refresh expired access tokens
 * - GET /auth/profile - Retrieve authenticated user profile
 * - PUT /auth/profile - Update user profile information
 * - POST /auth/logout - Terminate user session and invalidate tokens
 * 
 * Middleware integration:
 * - Authentication middleware for protected routes
 * - Input validation middleware for request data
 * - Rate limiting for security-sensitive endpoints
 * - CORS configuration for cross-origin requests
 * - Error handling for authentication failures
 */
