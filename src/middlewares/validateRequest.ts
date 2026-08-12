/**
 * Request Validation Middleware
 *
 * Zod-based body validation for mutation endpoints. Start with the
 * safety-critical routes (eligibility update, push token registration,
 * appointment booking); extend with more schemas as endpoints are hardened.
 *
 * On failure, responds 400 with the standard error envelope
 * `{ success: false, error, message, details }`.
 */

import { Request, Response, NextFunction } from "express";
import { z, ZodType } from "zod";

export const validateRequest =
  (schema: ZodType) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Request body is invalid",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    req.body = result.data;
    next();
  };

/** A string that parses to a valid Date. */
const dateString = z.string().refine((value) => !isNaN(Date.parse(value)), {
  message: "Must be a valid date string",
});

/**
 * PUT /api/eligibility/:id — safety-critical: controls when a donor is next
 * allowed to donate. The date must be valid and within a plausible window
 * (not in the past beyond a day, not more than 2 years out).
 */
export const eligibilityUpdateSchema = z.object({
  nextEligible: dateString.refine(
    (value) => {
      const date = new Date(value);
      const now = Date.now();
      const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
      const oneDay = 24 * 60 * 60 * 1000;
      return (
        date.getTime() >= now - oneDay && date.getTime() <= now + twoYears
      );
    },
    { message: "nextEligible must be between now and two years from now" }
  ),
});

/** POST /api/devices/push-token */
export const pushTokenSchema = z.object({
  token: z.string().min(1).max(512),
  platform: z.enum(["ios", "android"]).optional(),
});

/** DELETE /api/devices/push-token */
export const pushTokenDeleteSchema = z.object({
  token: z.string().min(1).max(512),
});

/** POST /api/appointments/create (donor comes from the authenticated user) */
export const appointmentCreateSchema = z.object({
  slotId: z.string().min(1),
  appointmentDate: dateString,
  medicalEstablishmentId: z.string().min(1),
});

export default validateRequest;
