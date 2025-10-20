import { prisma } from "../config/db.js";
import { Prisma, TransitStatus, TestStatus } from "@prisma/client";

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
  createTransit: async (payload: {
    bloodId: string;
    receiverHospitalId: string;
    deliveryVehicle: string;
    dispatchDateTime?: string | Date;
    deliveryDateTime: string | Date;
    transitStatus?: string; // default IN_TRANSIT
    bloodBankId?: string;
    bloodRequestId?: string;
  }) => {
    // Basic presence checks
    const { bloodId, receiverHospitalId, deliveryVehicle } = payload;
    if (!bloodId || !receiverHospitalId || !deliveryVehicle) {
      throw new Error("bloodId, receiverHospitalId and deliveryVehicle are required");
    }

    // Parse/normalize dates
    const dispatch = payload.dispatchDateTime
      ? new Date(payload.dispatchDateTime)
      : new Date();
    const delivery = new Date(payload.deliveryDateTime);
    if (Number.isNaN(dispatch.getTime())) throw new Error("Invalid dispatchDateTime");
    if (Number.isNaN(delivery.getTime())) throw new Error("Invalid deliveryDateTime");

    // Normalize status (default IN_TRANSIT)
    let status: TransitStatus = TransitStatus.IN_TRANSIT;
    if (payload.transitStatus) {
      const s = String(payload.transitStatus).toUpperCase();
      const map: Record<string, TransitStatus> = {
        IN_TRANSIT: TransitStatus.IN_TRANSIT,
        DELIVERED: TransitStatus.DELIVERED,
        FAILED: TransitStatus.FAILED,
      };
      if (!map[s]) throw new Error("Invalid transitStatus");
      status = map[s];
    }

    // Validate referenced records
    const [blood, hospital] = await Promise.all([
      prisma.blood.findUnique({ where: { id: bloodId } }),
      prisma.hospital.findUnique({ where: { id: receiverHospitalId } }),
    ]);
    if (!blood) throw new Error("bloodId not found");
    if (!hospital) throw new Error("receiverHospitalId not found");
    if (blood.disposed) throw new Error("Blood unit is disposed");
    if (blood.consumed) throw new Error("Blood unit is already consumed");
    // Only allow SAFE blood to transit by default
    if (blood.status !== TestStatus.SAFE) {
      throw new Error("Blood unit must be SAFE to transit");
    }

    if (payload.bloodBankId) {
      const bank = await prisma.bloodBank.findUnique({ where: { id: payload.bloodBankId } });
      if (!bank) throw new Error("bloodBankId not found");
    }
    if (payload.bloodRequestId) {
      const req = await prisma.bloodRequest.findUnique({ where: { id: payload.bloodRequestId } });
      if (!req) throw new Error("bloodRequestId not found");
    }

    // Prevent multiple active transits for same blood unit
    const existingActive = await prisma.bloodTransit.findFirst({
      where: { bloodId, transitStatus: TransitStatus.IN_TRANSIT },
    });
    if (existingActive) {
      class ConflictError extends Error {
        statusCode = 409 as const;
      }
      throw new ConflictError("Blood unit already has an active transit");
    }

    // Create transit
    const created = await prisma.bloodTransit.create({
      data: {
        bloodId,
        receiverHospitalId,
        deliveryVehicle,
        dispatchDateTime: dispatch,
        deliveryDateTime: delivery,
        transitStatus: status,
        ...(payload.bloodBankId ? { bloodBankId: payload.bloodBankId } : {}),
        ...(payload.bloodRequestId ? { bloodRequestId: payload.bloodRequestId } : {}),
      },
      include: {
        blood: true,
        bloodBank: true,
        bloodRequest: true,
        receiverHospital: true,
      },
    });

    return created;
  },
};

export default BloodTransitService;
