import { prisma } from "../config/db.js";
import type { Prisma } from "@prisma/client";

export const BloodTransitService = {
  getTransitRequests: async (opts: { bloodBankId?: string; hospitalId?: string }) => {
    const { bloodBankId, hospitalId } = opts;

  const transitWhere: Prisma.BloodTransitWhereInput = {};
    if (bloodBankId) transitWhere.bloodBankId = bloodBankId;
    if (hospitalId) transitWhere.receiverHospitalId = hospitalId;

    const transits = await prisma.bloodTransit.findMany({
      where: transitWhere,
      include: {
        blood: {
          include: {
            bloodDonation: true,
          },
        },
        bloodRequest: true,
        bloodBank: true,
        receiverHospital: true,
      },
      orderBy: { dispatchDateTime: "desc" },
    });

    const requests = bloodBankId
      ? await prisma.bloodRequest.findMany({
          where: { bloodBankId },
          include: { blood: true },
          orderBy: { requestedDateTime: "desc" },
        })
      : [];

    return { transits, requests };
  },
};

export default BloodTransitService;
