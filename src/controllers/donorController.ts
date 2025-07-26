/**
 * Donor Controller
 * 
 * This controller manages donor-related operations and endpoints.
 * It handles:
 * - Donor registration and profile management
 * - Blood donation form submission and validation
 * - Donor eligibility assessment
 * - Donation history tracking
 * - Donor appointment scheduling
 * - Medical questionnaire processing
 * - Donor feedback collection
 * 
 * Endpoints provided:
 * - POST /donors/register - Register new donor
 * - GET /donors/profile/:id - Get donor profile
 * - PUT /donors/profile/:id - Update donor profile
 * - POST /donors/donation-form - Submit pre-donation form
 * - GET /donors/history/:id - Get donation history
 * - POST /donors/appointment - Schedule donation appointment
 * - GET /donors/eligibility/:id - Check donation eligibility
 * 
 * Features:
 * - Data validation and sanitization
 * - Medical history encryption for privacy
 * - Audit logging for sensitive operations
 * - Role-based access control
 * - Integration with medical establishment systems
 */
