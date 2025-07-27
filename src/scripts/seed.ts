/**
 * Database Seeding Script
 * 
 * This script populates the database with initial data for development,
 * testing, and production environments.
 * It handles:
 * - Initial user account creation with proper roles
 * - Medical establishment and facility setup
 * - Blood bank and hospital registration
 * - Equipment inventory initialization
 * - Reference data population (districts, blood types, etc.)
 * - Test donor accounts for development
 * 
 * Seed data categories:
 * 
 * Core Reference Data:
 * - Blood group types and compatibility matrix
 * - District and regional information
 * - Medical establishment types and categories
 * - Equipment types and specifications
 * 
 * User and Authentication Data:
 * - Admin user accounts with proper roles
 * - Medical staff accounts for different facilities
 * - Test donor accounts for development/staging
 * - Role and permission assignments
 * 
 * Facility and Infrastructure Data:
 * - Blood banks and medical centers
 * - Hospital network registration
 * - Equipment inventory and calibration schedules
 * - Regional distribution and logistics setup
 * 
 * Features:
 * - Environment-specific seeding (dev/staging/prod)
 * - Idempotent operations to prevent duplicate data
 * - Data validation and integrity checks
 * - Progress logging and error handling
 * - Rollback capabilities for failed seeds
 */
