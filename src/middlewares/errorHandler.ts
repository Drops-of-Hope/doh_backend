/**
 * Centralized Error Handling Middleware
 *
 * Express 4-argument error handler registered after all routes in app.ts.
 * Converts unhandled thrown errors into the standard JSON error envelope
 * `{ success: false, error, message }` instead of Express's default HTML
 * 500 page, and hides internal error details in production.
 */

import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandler = (
  err: HttpError,
  req: Request,
  res: Response,
  // Express identifies an error handler by its arity — `next` must stay even
  // though it is unused.
  _next: NextFunction
): void => {
  const status = err.status ?? err.statusCode ?? 500;

  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);

  if (res.headersSent) {
    return;
  }

  res.status(status).json({
    success: false,
    error: status >= 500 ? "Internal server error" : err.message,
    message:
      status >= 500 && env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
};

export default errorHandler;
