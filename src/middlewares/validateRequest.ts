/**
 * Request Validation Middleware
 * 
 * This middleware provides comprehensive input validation and sanitization
 * for all API endpoints in the blood donation system.
 * It handles:
 * - Request body validation using schema-based validation
 * - Query parameter validation and type conversion
 * - Request header validation and security checks
 * - File upload validation for document submissions
 * - Data sanitization to prevent injection attacks
 * - Custom validation rules for medical data
 * 
 * Validation features:
 * - JSON schema validation for complex nested objects
 * - Regular expression patterns for medical identifiers
 * - Date and time validation with timezone handling
 * - Email and phone number format validation
 * - Medical record number and NIC validation
 * - Blood type and medical data validation
 * 
 * Security measures:
 * - XSS prevention through input sanitization
 * - SQL injection prevention
 * - File type and size validation for uploads
 * - Rate limiting based on validation failures
 * - Audit logging for suspicious validation patterns
 * 
 * Integration:
 * - Works with Joi, Yup, or custom validation schemas
 * - Automatic error response formatting
 * - Integration with OpenAPI/Swagger documentation
 * - Custom error messages for better user experience
 */
