import { prisma } from "../config/db.js";

export const DonationFormRepository = {
  findByAppointmentId: (appointmentId: string) =>
    prisma.bloodDonationForm.findMany({
      where: {
        appointment: { id: appointmentId },
      },
    }),
};
