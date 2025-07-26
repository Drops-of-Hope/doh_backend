/**
 * Environment Variables Configuration
 * 
 * This file handles environment variable validation and parsing.
 * It provides:
 * - Type-safe environment variable access
 * - Default values for optional environment variables
 * - Environment variable validation on application startup
 * - Centralized configuration management
 * - Support for different environments (development, staging, production)
 * 
 * Environment variables managed:
 * - DATABASE_URL: PostgreSQL/Supabase connection string
 * - JWT_SECRET: Secret key for JWT token verification
 * - ASGARDEO_CLIENT_ID: OAuth client identifier
 * - ASGARDEO_CLIENT_SECRET: OAuth client secret
 * - PORT: Application server port
 * - NODE_ENV: Current environment (dev/staging/prod)
 */
