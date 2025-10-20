import { prisma } from "../config/db.js";
import {
  RequestStatus,
  UrgencyLevel,
  BloodGroup,
  TransitStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";

const RequestRepository = {
  create: async (data: {
    bloodGroup: string;
    unitsRequired: number;
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
        id: randomUUID(),
        bloodGroup: data.bloodGroup as BloodGroup,
        unitsRequired: data.unitsRequired,
        urgencyLevel: data.urgencyLevel as UrgencyLevel,
        requestReason: data.requestReason,
        requestDeliveryDate: new Date(
          data.requestDeliveryDate as string | Date
        ),
        requestDeliveryTime: data.requestDeliveryTime,
        medicalEstablishmentId: data.medicalEstablishmentId,
        requestingBloodBankId: data.requestingBloodBankId,
        additionalNotes: data.additionalNotes || undefined,
        status: data.status as RequestStatus | undefined,
        updatedAt: new Date(),
      },
      include: {
        MedicalEstablishment: true,
        BloodBank: true,
      },
    });
  },
  findPendingByRecipient: async (medicalEstablishmentId: string) => {
    return prisma.request.findMany({
      where: {
        medicalEstablishmentId,
        status: RequestStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      include: {
        MedicalEstablishment: true,
        BloodBank: true,
      },
    });
  },
  findPendingByRequester: async (bloodBankId: string) => {
    return prisma.request.findMany({
      where: {
        requestingBloodBankId: bloodBankId,
        status: RequestStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      include: {
        MedicalEstablishment: true,
        BloodBank: true,
      },
    });
  },
  findPendingByRequesterByMedicalEstablishmentId: async (
    medicalEstablishmentId: string
  ) => {
    return prisma.request.findMany({
      where: {
        BloodBank: {
          medicalEstablishmentId,
        },
        status: RequestStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      include: {
        MedicalEstablishment: true,
        BloodBank: true,
      },
    });
  },
  getSummary: async (medicalEstablishmentId: string) => {
    // Incoming: requests where this med establishment is the recipient
    const incoming = await prisma.request.count({
      where: { medicalEstablishmentId },
    });

    // Outgoing: requests initiated by a blood bank that belongs to this med establishment
    const outgoing = await prisma.request.count({
      where: {
        BloodBank: {
          medicalEstablishmentId,
        },
      },
    });

    // In-transit: any blood transit involving this med establishment either as receiver hospital
    // or as the originating blood bank tied to this med establishment
    const inTransit = await prisma.bloodTransit.count({
      where: {
        transitStatus: TransitStatus.IN_TRANSIT,
        OR: [
          { receiverHospital: { medicalEstablishmentId } },
          { bloodBank: { medicalEstablishmentId } },
        ],
      },
    });

    const total = incoming + outgoing;

    return { total, incoming, outgoing, inTransit } as const;
  },
};

export default RequestRepository;
