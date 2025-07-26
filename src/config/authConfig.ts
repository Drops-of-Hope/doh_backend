/**
 * Authentication Configuration (Asgardeo OIDC/JWKS)
 * 
 * This file configures OAuth 2.0 / OpenID Connect integration with Asgardeo.
 * It handles:
 * - JWKS (JSON Web Key Set) endpoint configuration for token verification
 * - OAuth 2.0 client credentials and endpoints
 * - Token validation parameters and algorithms
 * - OIDC discovery document parsing
 * - Public key caching for JWT signature verification
 * - Token refresh and validation workflows
 * 
 * Asgardeo Integration Features:
 * - Automatic JWKS key rotation handling
 * - Multiple signature algorithm support (RS256, ES256, etc.)
 * - Token issuer and audience validation
 * - User claims extraction and mapping
 * - Role-based access control (RBAC) claim parsing
 */
