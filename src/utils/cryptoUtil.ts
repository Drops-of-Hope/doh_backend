/**
 * Cryptographic Utilities (AES-GCM Encryption/Decryption)
 * 
 * This utility module provides secure encryption and decryption functions
 * for protecting sensitive data in the blood donation system.
 * It implements:
 * - AES-GCM encryption for authenticated encryption
 * - Secure key derivation and management
 * - Medical data encryption for privacy compliance
 * - Personal information protection utilities
 * - Cryptographically secure random number generation
 * - Key rotation and lifecycle management
 * 
 * Functions provided:
 * - encrypt: AES-GCM encryption with authentication
 * - decrypt: AES-GCM decryption with integrity verification
 * - generateSecureRandom: Cryptographically secure random generation
 * - deriveKey: PBKDF2-based key derivation from passwords
 * - hashData: Secure hashing for data integrity
 * - compareHash: Constant-time hash comparison
 * 
 * Security features:
 * - FIPS-compliant encryption algorithms
 * - Protection against timing attacks
 * - Secure memory handling for keys
 * - Proper initialization vector (IV) generation
 * - Authentication tag verification
 * - Key stretching and salting for password-derived keys
 */
