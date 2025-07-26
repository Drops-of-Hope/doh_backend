/**
 * Donor Routes
 * 
 * This file defines all donor-related API endpoints and route configurations.
 * It manages:
 * - Donor registration and profile management routes
 * - Blood donation form submission endpoints
 * - Appointment scheduling and management routes
 * - Donation history and analytics endpoints
 * - Eligibility assessment routes
 * - Feedback and rating collection endpoints
 * 
 * Route definitions:
 * - POST /donors/register - Register new donor account
 * - GET /donors/profile/:id - Get donor profile information
 * - PUT /donors/profile/:id - Update donor profile data
 * - POST /donors/donation-form - Submit pre-donation medical form
 * - GET /donors/forms/:id - Retrieve donation form data
 * - POST /donors/appointments - Schedule donation appointment
 * - GET /donors/appointments/:donorId - Get donor's appointments
 * - GET /donors/history/:id - Retrieve donation history
 * - POST /donors/feedback - Submit donation feedback
 * - GET /donors/eligibility/:id - Check donation eligibility
 * 
 * Security and middleware:
 * - Role-based access control for donor data
 * - Data validation and sanitization
 * - Rate limiting for form submissions
 * - Audit logging for sensitive operations
 * - PII encryption for medical information
 */
