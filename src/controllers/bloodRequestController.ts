/**
 * Blood Request Controller
 * 
 * This controller manages blood request and inventory operations.
 * It handles:
 * - Blood request creation and processing
 * - Inventory management and tracking
 * - Blood compatibility matching
 * - Emergency request prioritization
 * - Inter-facility blood transfers
 * - Blood testing result management
 * - Expiry date monitoring and alerts
 * 
 * Endpoints provided:
 * - POST /blood-requests - Create new blood request
 * - GET /blood-requests/:id - Get request details
 * - PUT /blood-requests/:id/status - Update request status
 * - GET /inventory/available - Check available blood units
 * - GET /inventory/expiring - Get units near expiry
 * - POST /blood-transfers - Initiate inter-facility transfer
 * - PUT /blood-tests/:id/results - Update test results
 * 
 * Features:
 * - Real-time inventory tracking
 * - Automated compatibility checking
 * - Priority-based request queuing
 * - Audit trail for all blood movements
 * - Integration with testing laboratory systems
 * - Automated notifications for critical requests
 */
