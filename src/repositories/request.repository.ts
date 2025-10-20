import { prisma } from "../config/db.js";
import { randomUUID } from "node:crypto";
import {
  RequestStatus,
  UrgencyLevel,
  BloodGroup,
  TransitStatus,
} from "@prisma/client";

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
        requestDeliveryDate: new Date(data.requestDeliveryDate as string | Date),
        requestDeliveryTime: data.requestDeliveryTime,
        additionalNotes: data.additionalNotes || undefined,
        status: data.status as RequestStatus | undefined,
        updatedAt: new Date(),
        MedicalEstablishment: {
          connect: { id: data.medicalEstablishmentId },
        },
        ...(data.requestingBloodBankId
          ? { BloodBank: { connect: { id: data.requestingBloodBankId } } }
          : {}),
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
          BloodBank: { is: { medicalEstablishmentId } },
          status: RequestStatus.PENDING,
        },
        orderBy: { createdAt: "desc" },
        include: {
          MedicalEstablishment: true,
          BloodBank: true,
        },
      });
    },
    findById: async (id: string) => {
      return prisma.request.findUnique({
        where: { id },
        include: {
          MedicalEstablishment: true,
          BloodBank: {
            include: {
              medicalEstablishment: true,
            },
          },
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
        BloodBank: { is: { medicalEstablishmentId } },
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
