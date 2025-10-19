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

  getByAppointmentId: (appointmentId: string) =>
    prisma.healthVital.findMany({
      where: {
        appointmentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            scheduled: true,
          },
        },
      },
      orderBy: {
        dateTime: 'desc',
      },
    }),
};