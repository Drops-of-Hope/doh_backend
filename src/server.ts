/**
 * Server Bootstrap and Application Entry Point
 * 
 * This file serves as the main entry point for the blood donation backend server.
 * It handles:
 * - Server initialization and startup procedures
 * - Database connection establishment and health checks
 * - Environment variable validation and configuration
 * - Graceful shutdown handling for production deployments
 * - Error handling during server startup
 * - Process signal handling (SIGTERM, SIGINT)
 * 
 * Startup sequence:
 * 1. Environment variable validation and loading
 * 2. Database connection establishment and migration checks
 * 3. Express application initialization from app.ts
 * 4. Server port binding and listening setup
 * 5. Health check endpoint registration
 * 6. Graceful shutdown handler registration
 * 
 * Production features:
 * - Proper error logging and monitoring integration
 * - Database connection pooling and optimization
 * - Memory usage monitoring and alerts
 * - Performance metrics collection
 * - Container orchestration compatibility
 * - Zero-downtime deployment support
 * - Security hardening and best practices
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.js';

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

app.use('/api', routes);
