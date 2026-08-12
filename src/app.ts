import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import routes from "./routes/index.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// Behind a load balancer / reverse proxy the client IP arrives in
// X-Forwarded-For; trust exactly one hop so rate limiting keys on the real
// client address.
app.set("trust proxy", 1);

// CORS: the native mobile app sends no Origin header and is unaffected.
// Browser cross-origin requests are only allowed from origins explicitly
// whitelisted via CORS_ALLOWED_ORIGINS (comma-separated); default is none.
const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  })
);

app.use(express.json());

// Health check for load balancers / uptime monitoring (no auth, no rate limit)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// Restrictive limit on auth routes (credential stuffing protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests",
    message: "Too many authentication attempts, please try again later",
  },
});
app.use("/api/auth", authLimiter);

// Relaxed general limit on the rest of the API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests",
    message: "Rate limit exceeded, please slow down",
  },
});
app.use("/api", apiLimiter);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Centralized error handler — must be registered after all routes.
app.use(errorHandler);

export default app;
