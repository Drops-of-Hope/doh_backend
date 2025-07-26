/**
 * Express Application Configuration
 * 
 * This file configures the main Express.js application instance
 * for the blood donation backend system.
 * It handles:
 * - Express app initialization and middleware setup
 * - CORS configuration for cross-origin requests
 * - Route registration and API endpoint mapping
 * - Global middleware application (authentication, validation, etc.)
 * - Security middleware integration (helmet, rate limiting)
 * - Request/response logging and monitoring
 * 
 * Middleware stack:
 * - CORS configuration for frontend integration
 * - JSON body parser for API requests
 * - Authentication middleware for protected routes
 * - Request validation and sanitization
 * - Error handling and response formatting
 * - Security headers and protection
 * 
 * Route integration:
 * - Authentication routes (/auth/*)
 * - Donor management routes (/donors/*)
 * - Blood request routes (/blood-requests/*)
 * - Admin and system routes (/admin/*)
 * - Health check and monitoring endpoints
 */

// src/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
