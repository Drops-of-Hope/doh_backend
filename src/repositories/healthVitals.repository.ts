import { prisma } from '../config/db.js';
import { CreateHealthVitalInput } from '../types/index.js';

export const HealthVitalsRepository = {
  create: ({ userId, appointmentId, weight, bp, cvsPulse }: CreateHealthVitalInput) =>
    prisma.healthVital.create({
      data: {
        userId,
        appointmentId,
        weight,
        bp,
        cvsPulse,
      },
    }),
};