import { prisma } from "../config/db.js";
import { CreateHealthVitalInput } from "../types/index.js";
import {
  encryptHealthVitalData,
  decryptHealthVitalData,
} from "../utils/cryptoUtil.js";

export const HealthVitalsRepository = {
  create: async ({
    userId,
    appointmentId,
    weight,
    bp,
    cvsPulse,
  }: CreateHealthVitalInput) => {
    // Encrypt sensitive data before storing
    const encryptedData = await encryptHealthVitalData({
      weight,
      bp,
      cvsPulse,
    });

    const healthVital = await prisma.healthVital.create({
      data: {
        userId,
        appointmentId,
        weight: encryptedData.weight as any,
        bp: encryptedData.bp as any,
        cvsPulse: encryptedData.cvsPulse as any,
      },
    });

    // Return the created record with decrypted values
    const decryptedData = await decryptHealthVitalData({
      weight: healthVital.weight as unknown as string,
      bp: healthVital.bp as unknown as string,
      cvsPulse: healthVital.cvsPulse as unknown as string,
    });

    return {
      ...healthVital,
      weight: decryptedData.weight,
      bp: decryptedData.bp,
      cvsPulse: decryptedData.cvsPulse,
    };
  },

  getByAppointmentId: async (appointmentId: string) => {
    const healthVitals = await prisma.healthVital.findMany({
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
        dateTime: "desc",
      },
    });

    // Decrypt sensitive data before returning
    const decryptedHealthVitals = await Promise.all(
      healthVitals.map(async (vital) => {
        const decryptedData = await decryptHealthVitalData({
          weight: vital.weight as unknown as string,
          bp: vital.bp as unknown as string,
          cvsPulse: vital.cvsPulse as unknown as string,
        });

        return {
          ...vital,
          weight: decryptedData.weight,
          bp: decryptedData.bp,
          cvsPulse: decryptedData.cvsPulse,
        };
      })
    );

    return decryptedHealthVitals;
  },

  getByUserId: async (userId: string) => {
    const healthVitals = await prisma.healthVital.findMany({
      where: {
        userId,
      },
      include: {
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            scheduled: true,
          },
        },
      },
      orderBy: {
        dateTime: "desc",
      },
    });

    // Decrypt sensitive data before returning
    const decryptedHealthVitals = await Promise.all(
      healthVitals.map(async (vital) => {
        const decryptedData = await decryptHealthVitalData({
          weight: vital.weight as unknown as string,
          bp: vital.bp as unknown as string,
          cvsPulse: vital.cvsPulse as unknown as string,
        });

        return {
          ...vital,
          weight: decryptedData.weight,
          bp: decryptedData.bp,
          cvsPulse: decryptedData.cvsPulse,
        };
      })
    );

    return decryptedHealthVitals;
  },
};
