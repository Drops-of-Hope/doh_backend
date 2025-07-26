/**
 * Blood Request Routes
 * 
 * This file defines all blood request and inventory management API endpoints.
 * It handles:
 * - Blood request creation and management routes
 * - Inventory checking and monitoring endpoints
 * - Blood transfer and logistics routes
 * - Testing result management endpoints
 * - Emergency request processing routes
 * - Analytics and reporting endpoints
 * 
 * Route definitions:
 * - POST /blood-requests - Create new blood request
 * - GET /blood-requests/:id - Get specific request details
 * - PUT /blood-requests/:id/status - Update request status
 * - GET /blood-requests/pending - List pending requests
 * - GET /inventory/available - Check available blood units
 * - GET /inventory/search - Search inventory by criteria
 * - GET /inventory/expiring - Get units near expiry
 * - POST /blood-transfers - Initiate inter-facility transfer
 * - PUT /blood-transfers/:id/status - Update transfer status
 * - PUT /blood-tests/:id/results - Update test results
 * - GET /analytics/requests - Blood request analytics
 * - GET /analytics/inventory - Inventory level analytics
 * 
 * Access control:
 * - Medical staff access for inventory management
 * - Admin access for system-wide operations
 * - Facility-specific data isolation
 * - Emergency override capabilities for critical requests
 * - Audit logging for regulatory compliance
 */
