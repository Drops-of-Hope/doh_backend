/**
 * Token Utilities (JWT Processing and JWKS Management)
 * 
 * This utility module handles JWT token processing and JWKS key management
 * for secure authentication with Asgardeo OIDC provider.
 * It provides:
 * - JWT token decoding and validation utilities
 * - JWKS (JSON Web Key Set) caching and retrieval
 * - Token signature verification helpers
 * - Claims extraction and validation functions
 * - Token refresh and expiration handling
 * - Public key rotation management
 * 
 * Functions provided:
 * - decodeJWT: Safe JWT token decoding without verification
 * - verifyJWT: Complete JWT verification with JWKS
 * - extractClaims: User claims extraction from validated tokens
 * - fetchJWKS: JWKS endpoint fetching with caching
 * - getCachedKey: Retrieve cached public keys for verification
 * - refreshJWKS: Force refresh of JWKS cache
 * - validateClaims: Business logic validation of token claims
 * 
 * Security features:
 * - Automatic JWKS key rotation handling
 * - Multiple signature algorithm support (RS256, ES256, etc.)
 * - Token replay attack prevention
 * - Issuer and audience validation
 * - Clock skew tolerance configuration
 * - Secure key caching with TTL expiration
 * - Rate limiting for JWKS endpoint calls
 */
