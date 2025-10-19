import { prisma } from "../config/db.js";
import RequestRepository from "../repositories/request.repository.js";
import type { Prisma, RequestStatus, UrgencyLevel, BloodGroup } from "@prisma/client";

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequest";
  }
}

export type CreateRequestInput = {
  bloodGroup: BloodGroup | string;
  unitsRequired: Prisma.InputJsonValue;
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

    // If unitsRequired is JSON object, ensure at least one value > 0
    try {
      const unitsRaw = payload.unitsRequired;
      const unitsObj: Record<string, unknown> =
        typeof unitsRaw === "string" ? JSON.parse(unitsRaw as string) : (unitsRaw as Record<string, unknown>);

      const totalUnits = Object.values(unitsObj).reduce((sum: number, v: unknown) => {
        const n = Number(v as unknown);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);

      if (totalUnits <= 0) {
        throw new BadRequestError("At least one unit must be requested");
      }
    } catch {
      throw new BadRequestError("unitsRequired must be a valid JSON object of type->units mapping");
    }

    // Ensure recipient medical establishment exists
    const recipient = await prisma.medicalEstablishment.findUnique({ where: { id: payload.medicalEstablishmentId } });
    if (!recipient) {
      throw new BadRequestError("medicalEstablishmentId (recipient) not found");
    }

    // Requesting medical establishment (the requester) is required
    if (!payload.requestingBloodBankId) {
      throw new BadRequestError("requestingBloodBankId (requester medical establishment) is required");
    }

    // Ensure requesting medical establishment exists
    const requester = await prisma.medicalEstablishment.findUnique({ where: { id: payload.requestingBloodBankId } });
    if (!requester) {
      throw new BadRequestError("requestingBloodBankId (requester) not found");
    }

    // Resolve requestingBloodBankId to an actual BloodBank.id
    // Clients may pass the medicalEstablishmentId of the blood bank; find the BloodBank record if available
    let resolvedBloodBankId: string | undefined = undefined;

    // First try whether the provided id matches an existing BloodBank.id
    const directBank = await prisma.bloodBank.findUnique({ where: { id: payload.requestingBloodBankId } });
    if (directBank) {
      resolvedBloodBankId = directBank.id;
    } else {
      // Otherwise try to find a BloodBank whose medicalEstablishmentId equals the provided id
      const bankByMed = await prisma.bloodBank.findFirst({ where: { medicalEstablishmentId: payload.requestingBloodBankId } });
      if (bankByMed) resolvedBloodBankId = bankByMed.id;
    }

    if (!resolvedBloodBankId) {
      throw new BadRequestError(
        "No BloodBank found for the provided requestingBloodBankId. Provide a valid BloodBank.id or create a BloodBank linked to the MedicalEstablishment."
      );
    }

    // Replace the provided id with the resolved BloodBank id for persistence
    payload.requestingBloodBankId = resolvedBloodBankId;

    // Persist
  const created = await RequestRepository.create(payload as CreateRequestInput);
    return created;
  },
};

export default RequestService;
