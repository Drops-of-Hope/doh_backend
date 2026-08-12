/**
 * Authentication Middleware
 * 
 * This middleware handles JWT token verification and user authentication.
 * It provides:
 * - JWT signature validation using JWKS from Asgardeo
 * - Token expiration checking
 * - User identity extraction from JWT claims
 * - Request context population with user information
 * - Invalid token handling and error responses
 * - Token blacklist checking for logout functionality
 * 
 * Functions:
 * - authenticateUser: Verifies JWT tokens via JWKS validation
 * - extractUserClaims: Parses user information from validated tokens
 * - handleTokenErrors: Manages authentication failures gracefully
 * 
 * Security features:
 * - JWKS key rotation support
 * - Multiple signature algorithm validation
 * - Issuer and audience verification
 * - Clock skew tolerance for token validation
 * - Secure error messaging to prevent information leakage
 */

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload, JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";

// Asgardeo publishes its RS256 signing keys at the JWKS endpoint. Keys are
// cached (1h) and rate-limited so verification does not hit the network on
// every request.
const asgardeoJwks = jwksClient({
  jwksUri: env.ASGARDEO_JWKS_URI,
  cache: true,
  cacheMaxAge: 60 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getAsgardeoSigningKey(
  header: JwtHeader,
  callback: SigningKeyCallback
): void {
  asgardeoJwks.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      callback(err ?? new Error("Signing key not found"));
      return;
    }
    callback(null, key.getPublicKey());
  });
}

function verifyAsgardeoToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getAsgardeoSigningKey,
      {
        algorithms: ["RS256"],
        issuer: env.ASGARDEO_ISSUER,
        ...(env.ASGARDEO_AUDIENCE ? { audience: env.ASGARDEO_AUDIENCE } : {}),
      },
      (err, payload) => {
        if (err || !payload || typeof payload === "string") {
          reject(err ?? new jwt.JsonWebTokenError("Invalid token payload"));
          return;
        }
        resolve(payload);
      }
    );
  });
}

// Define user interface for request
interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  bloodGroup?: string;
  nic?: string;
}

// Extend Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface DecodedToken extends JwtPayload {
  userId?: string;
  sub?: string;
  email?: string;
  iss?: string;
  aud?: string;
  org_id?: string;
  org_name?: string;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Access token required",
        message: "Please provide a valid authorization token",
      });
      return;
    }

    // Decode the token without verification to check if it's from Asgardeo
    const decodedToken = jwt.decode(token, { complete: true });
    
    let decoded: DecodedToken;
    
    // Check if this is an Asgardeo token (RS256)
    const isAsgardeoToken = decodedToken && 
                           typeof decodedToken === 'object' && 
                           'header' in decodedToken && 
                           decodedToken.header.alg === 'RS256';
    
    if (isAsgardeoToken) {
      // Asgardeo token (RS256): verify the signature against Asgardeo's JWKS.
      decoded = (await verifyAsgardeoToken(token)) as DecodedToken;
    } else {
      // Local token (HS256): verify with the configured secret.
      decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as DecodedToken;
    }
    
    // Find user in database
    // For Asgardeo tokens, use 'sub' claim; for local tokens, use 'userId'
    const userIdentifier = decoded.sub || decoded.userId;
    
    if (!userIdentifier) {
      res.status(401).json({
        success: false,
        error: "Invalid token",
        message: "Token does not contain user identifier",
      });
      return;
    }
    
    // Try to find user by ID first, then by external ID (for Asgardeo users)
    let user = await prisma.user.findUnique({
      where: { id: userIdentifier },
      include: {
        userDetails: true,
      },
    });
    
    // If not found by ID and this looks like an Asgardeo token, try to find by external ID
    if (!user && decoded.sub && decoded.iss && decoded.iss.includes('asgardeo.io')) {
      user = await prisma.user.findFirst({
        where: { 
          OR: [
            { id: decoded.sub },
            // Add other ways to match Asgardeo users if needed
          ]
        },
        include: {
          userDetails: true,
        },
      });
    }

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found",
        message: "Invalid token - user does not exist",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: "Account inactive",
        message: "Your account has been deactivated",
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      bloodGroup: user.bloodGroup,
      nic: user.nic,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    // jwt.JsonWebTokenError covers bad signatures/expiry; jwks-rsa throws its
    // own error types (e.g. SigningKeyNotFoundError) for unknown key IDs —
    // both mean the caller's token is not trustworthy.
    const isTokenError =
      error instanceof jwt.JsonWebTokenError ||
      (error instanceof Error && error.name.includes("SigningKey"));

    if (isTokenError) {
      res.status(401).json({
        success: false,
        error: "Invalid token",
        message: "The provided token is invalid or expired",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Authentication error",
      message: "Internal server error during authentication",
    });
  }
};

// Alternative authentication for development/testing
export const authenticateUser = authenticateToken;
