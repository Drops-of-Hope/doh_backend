import { prisma } from "../config/db.js";
import RequestRepository from "../repositories/request.repository.js";
import type {
  Prisma,
  RequestStatus,
  UrgencyLevel,
  BloodGroup,
} from "@prisma/client";

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequest";
  }
}

export type CreateRequestInput = {
  bloodGroup: BloodGroup | string;
  unitsRequired: Prisma.InputJsonValue | number;
  urgencyLevel: UrgencyLevel | string;
  requestReason: string;
  requestDeliveryDate: string | Date;
  requestDeliveryTime: string;
  medicalEstablishmentId: string;
  requestingBloodBankId: string;
  additionalNotes?: string;
  status?: RequestStatus | string;
};

const RequestService = {
  createRequest: async (payload: CreateRequestInput) => {
    // Basic validation
    if (!payload || !payload.medicalEstablishmentId) {
      throw new BadRequestError("medicalEstablishmentId is required");
    }

    // Ensure unitsRequired is present and has at least one positive unit
    if (!payload.unitsRequired) {
      throw new BadRequestError("unitsRequired is required");
    }

    // Accept unitsRequired as number or JSON. Persist as number in DB.
    try {
      const expectedKey = String(payload.bloodGroup);
      const raw = payload.unitsRequired;

      // Case 1: number provided directly
      if (typeof raw === "number") {
        if (!Number.isFinite(raw) || raw <= 0) {
          throw new BadRequestError("unitsRequired must be a positive number");
        }
        // Keep as number
        payload.unitsRequired = raw;
      } else {
        // Case 2: JSON provided
        const unitsObj: Record<string, unknown> =
          typeof raw === "string"
            ? JSON.parse(raw as string)
            : (raw as Record<string, unknown>);

        const keys = Object.keys(unitsObj);
        if (keys.length !== 1)
          throw new BadRequestError(
            "unitsRequired must contain exactly one blood group entry"
          );

        const key = keys[0];
        if (key !== expectedKey)
          throw new BadRequestError(
            `unitsRequired key must match bloodGroup (${expectedKey})`
          );

        const value = Number(unitsObj[key]);
        if (!Number.isFinite(value) || value <= 0)
          throw new BadRequestError(
            "unitsRequired value must be a positive number"
          );

        // Normalize to number for DB storage
        payload.unitsRequired = value;
      }
    } catch (e) {
      if (e instanceof BadRequestError) throw e;
      throw new BadRequestError(
        "unitsRequired must be a positive number, or a JSON object with a single matching bloodGroup"
      );
    }

    // Ensure recipient medical establishment exists
    const recipient = await prisma.medicalEstablishment.findUnique({
      where: { id: payload.medicalEstablishmentId },
    });
    if (!recipient) {
      throw new BadRequestError("medicalEstablishmentId (recipient) not found");
    }

    // Requester is required (can be a BloodBank.id or the linked MedicalEstablishment.id)
    if (!payload.requestingBloodBankId) {
      throw new BadRequestError(
        "requestingBloodBankId is required (accepts BloodBank.id or its MedicalEstablishment.id)"
      );
    }

    // Resolve requestingBloodBankId to an actual BloodBank.id
    // Clients may pass the medicalEstablishmentId of the blood bank; find the BloodBank record if available
    let resolvedBloodBankId: string | undefined = undefined;

    // First try whether the provided id matches an existing BloodBank.id
    const directBank = await prisma.bloodBank.findUnique({
      where: { id: payload.requestingBloodBankId },
    });
    if (directBank) {
      resolvedBloodBankId = directBank.id;
    } else {
      // Otherwise try to find a BloodBank whose medicalEstablishmentId equals the provided id
      const bankByMed = await prisma.bloodBank.findFirst({
        where: { medicalEstablishmentId: payload.requestingBloodBankId },
      });
      if (bankByMed) resolvedBloodBankId = bankByMed.id;
    }

    if (!resolvedBloodBankId) {
      throw new BadRequestError(
        "No BloodBank found for the provided requestingBloodBankId. Provide a valid BloodBank.id or a MedicalEstablishment.id linked to a BloodBank."
      );
    }

    // Replace the provided id with the resolved BloodBank id for persistence
    payload.requestingBloodBankId = resolvedBloodBankId;

    // Persist with narrowed types for repository
    const repoInput = {
      bloodGroup: String(payload.bloodGroup),
      unitsRequired: payload.unitsRequired as number,
      urgencyLevel: String(payload.urgencyLevel),
      requestReason: payload.requestReason,
      requestDeliveryDate: payload.requestDeliveryDate,
      requestDeliveryTime: payload.requestDeliveryTime,
      medicalEstablishmentId: payload.medicalEstablishmentId,
      requestingBloodBankId: payload.requestingBloodBankId,
      additionalNotes: payload.additionalNotes,
      status: payload.status ? String(payload.status) : undefined,
    } as const;

    const created = await RequestRepository.create(
      repoInput as unknown as {
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
      }
    );
    return created;
  },
  getPendingByRecipient: async (medicalEstablishmentId: string) => {
    // verify recipient exists (optional but consistent)
    const recipient = await prisma.medicalEstablishment.findUnique({
      where: { id: medicalEstablishmentId },
    });
    if (!recipient)
      throw new BadRequestError("medicalEstablishmentId not found");
    return RequestRepository.findPendingByRecipient(medicalEstablishmentId);
  },
  getPendingByRequester: async (bloodBankId: string) => {
    // bloodBankId is BloodBank.id
    const bank = await prisma.bloodBank.findUnique({
      where: { id: bloodBankId },
    });
    if (!bank) throw new BadRequestError("bloodBankId not found");
    return RequestRepository.findPendingByRequester(bloodBankId);
  },
};

export default RequestService;
