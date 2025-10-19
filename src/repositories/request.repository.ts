import { prisma } from "../config/db.js";
import type { Prisma, RequestStatus, UrgencyLevel, BloodGroup } from "@prisma/client";

const RequestRepository = {
  create: async (data: {
    bloodGroup: string;
    unitsRequired: Prisma.InputJsonValue;
    urgencyLevel: string;
    requestReason: string;
    requestDeliveryDate: string | Date;
    requestDeliveryTime: string;
    medicalEstablishmentId: string;
    requestingBloodBankId?: string;
    additionalNotes?: string;
    status?: string;
  }) => {
    return await prisma.request.create({
      data: {
        bloodGroup: data.bloodGroup as BloodGroup,
        unitsRequired: data.unitsRequired as Prisma.InputJsonValue,
        urgencyLevel: data.urgencyLevel as UrgencyLevel,
        requestReason: data.requestReason,
        requestDeliveryDate: new Date(data.requestDeliveryDate as string | Date),
        requestDeliveryTime: data.requestDeliveryTime,
        additionalNotes: data.additionalNotes || undefined,
        status: data.status as RequestStatus | undefined,
        medicalEstablishment: {
          connect: { id: data.medicalEstablishmentId },
        },
        ...(data.requestingBloodBankId
          ? { requestingBloodBank: { connect: { id: data.requestingBloodBankId } } }
          : {}),
      },
      include: {
        medicalEstablishment: true,
        requestingBloodBank: true,
      },
    });
  },
};

export default RequestRepository;
