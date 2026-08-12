/**
 * Environment Variables Configuration
 *
 * Parses and validates all required environment variables at startup so a
 * misconfigured deployment fails fast instead of running with insecure
 * defaults (e.g. a publicly known JWT secret).
 *
 * dotenv is loaded here (not only in app.ts) because ESM imports are hoisted:
 * any module importing `env` must see populated process.env regardless of
 * import order.
 */

import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in the environment or in a .env file (see .env.example).`
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value : fallback;
}

const ASGARDEO_ORG = optional("ASGARDEO_ORG", "dropsofhope");
const ASGARDEO_BASE_URL = optional(
  "ASGARDEO_BASE_URL",
  `https://api.asgardeo.io/t/${ASGARDEO_ORG}`
);

export const env = {
  NODE_ENV: optional("NODE_ENV", "development"),
  PORT: Number(optional("PORT", "5000")),

  DATABASE_URL: required("DATABASE_URL"),

  /** Secret for locally issued HS256 tokens. No insecure fallback. */
  JWT_SECRET: required("JWT_SECRET"),

  ASGARDEO_ORG,
  ASGARDEO_BASE_URL,
  /** JWKS endpoint used to verify Asgardeo RS256 token signatures. */
  ASGARDEO_JWKS_URI: optional(
    "ASGARDEO_JWKS_URI",
    `${ASGARDEO_BASE_URL}/oauth2/jwks`
  ),
  /** Expected `iss` claim of Asgardeo tokens. */
  ASGARDEO_ISSUER: optional(
    "ASGARDEO_ISSUER",
    `${ASGARDEO_BASE_URL}/oauth2/token`
  ),
  /** Optional expected `aud` claim; enforced only when set. */
  ASGARDEO_AUDIENCE: process.env.ASGARDEO_AUDIENCE || undefined,

  // Used by asgardeo.service.ts for SCIM/admin API calls; validated there at
  // call time so the server can still boot for flows that don't need them.
  ASGARDEO_CLIENT_ID: process.env.ASGARDEO_CLIENT_ID || "",
  ASGARDEO_CLIENT_SECRET: process.env.ASGARDEO_CLIENT_SECRET || "",

  /** Comma-separated list of allowed browser origins for CORS. */
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || "",
} as const;

export default env;
