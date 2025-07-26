/**
 * Database Configuration
 * 
 * This file manages the Prisma client instance and database connection configuration.
 * It handles:
 * - Prisma client initialization and singleton pattern
 * - Database connection pooling settings
 * - Environment-specific database configurations
 * - Connection error handling and retry logic
 * - Database connection health checks
 * - Graceful shutdown procedures for database connections
 * 
 * The Prisma client is configured to work with PostgreSQL/Supabase
 * and includes proper connection management for production environments.
 */
