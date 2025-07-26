/**
 * Global Error Handler Middleware
 * 
 * This middleware provides centralized error handling for the application.
 * It manages:
 * - Standardized error response formatting
 * - Error logging and monitoring integration
 * - Security-conscious error message filtering
 * - HTTP status code mapping
 * - Development vs production error detail levels
 * - Error categorization and classification
 * 
 * Error types handled:
 * - Authentication and authorization errors
 * - Database connection and query errors
 * - Validation and input errors
 * - Third-party service integration errors
 * - Unexpected application errors
 * - Rate limiting and quota exceeded errors
 * 
 * Features:
 * - Structured error logging with context
 * - Error correlation IDs for tracking
 * - Sensitive information filtering in production
 * - Custom error types and status code mapping
 * - Integration with monitoring services (e.g., Sentry)
 * - Graceful degradation for service unavailability
 */
