import { BloodGroup, Prisma, TestStatus } from "@prisma/client";
import { prisma } from "../config/db.js";

// Helper to parse common blood group strings (e.g., A+, O-, AB_POSITIVE) to Prisma BloodGroup enum
function toBloodGroupEnum(input: string | undefined | null): BloodGroup | null {
  if (!input) return null;
  const s = String(input).trim().toUpperCase();
  const map: Record<string, BloodGroup> = {
    "A+": BloodGroup.A_POSITIVE,
    "A-": BloodGroup.A_NEGATIVE,
    "B+": BloodGroup.B_POSITIVE,
    "B-": BloodGroup.B_NEGATIVE,
    "AB+": BloodGroup.AB_POSITIVE,
    "AB-": BloodGroup.AB_NEGATIVE,
    "O+": BloodGroup.O_POSITIVE,
    "O-": BloodGroup.O_NEGATIVE,
    A_POSITIVE: BloodGroup.A_POSITIVE,
    A_NEGATIVE: BloodGroup.A_NEGATIVE,
    B_POSITIVE: BloodGroup.B_POSITIVE,
    B_NEGATIVE: BloodGroup.B_NEGATIVE,
    AB_POSITIVE: BloodGroup.AB_POSITIVE,
    AB_NEGATIVE: BloodGroup.AB_NEGATIVE,
    O_POSITIVE: BloodGroup.O_POSITIVE,
    O_NEGATIVE: BloodGroup.O_NEGATIVE,
  };
  return map[s] ?? null;
}

export const BloodService = {
  // Core availability checker
  checkAvailability: async (
    inventoryId: string,
    bloodGroup: string,
    _numberOfUnitsRequested: number
  ): Promise<{ totalAvailableUnits: number; matchingCount: number }> => {
    // Reference unused param to satisfy eslint without changing logic
    void _numberOfUnitsRequested;
    const bgEnum = toBloodGroupEnum(bloodGroup);

    // Build where clause; if blood group is parsable, filter via related blood tests' ABOTest
    const where = {
      inventoryId,
      status: TestStatus.SAFE,
      consumed: false,
      ...(bgEnum
        ? {
            bloodTests: {
              some: {
                ABOTest: bgEnum,
              },
            },
          }
        : {}),
    } satisfies Prisma.BloodWhereInput;

    const records = await prisma.blood.findMany({ where });

    // Sum available_units if present, otherwise assume each record represents 1 unit available
    const totalAvailableUnits = records.reduce((sum, r) => {
      const maybeUnits = (r as unknown as { available_units?: number })
        .available_units;
      if (maybeUnits === undefined || maybeUnits === null) return sum + 1;
      const units = Number(maybeUnits);
      return sum + (Number.isFinite(units) ? units : 0);
    }, 0);

    return { totalAvailableUnits, matchingCount: records.length };
  },
  // List matching units with same filters
  listAvailableUnits: async (
    inventoryId: string,
    bloodGroup: string
  ): Promise<{
    items: unknown[];
    totalAvailableUnits: number;
    count: number;
  }> => {
    const bgEnum = toBloodGroupEnum(bloodGroup);

    const where = {
      inventoryId,
      status: TestStatus.SAFE,
      consumed: false,
      ...(bgEnum
        ? {
            bloodTests: {
              some: {
                ABOTest: bgEnum,
              },
            },
          }
        : {}),
    } satisfies Prisma.BloodWhereInput;

    const records = await prisma.blood.findMany({ where });

    const totalAvailableUnits = records.reduce((sum, r) => {
      const maybeUnits = (r as unknown as { available_units?: number })
        .available_units;
      if (maybeUnits === undefined || maybeUnits === null) return sum + 1;
      const units = Number(maybeUnits);
      return sum + (Number.isFinite(units) ? units : 0);
    }, 0);

    return { items: records, totalAvailableUnits, count: records.length };
  },
  // List units with expiryDate <= today (inclusive)
  listExpiredUnits: async (
    inventoryId: string
  ): Promise<{
    items: unknown[];
    totalAvailableUnits: number;
    count: number;
  }> => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const where = {
      inventoryId,
      status: TestStatus.SAFE,
      consumed: false,
      expiryDate: {
        lte: startOfToday,
      },
    } satisfies Prisma.BloodWhereInput;

    const records = await prisma.blood.findMany({ where });

    const totalAvailableUnits = records.reduce((sum, r) => {
      const maybeUnits = (r as unknown as { available_units?: number })
        .available_units;
      if (maybeUnits === undefined || maybeUnits === null) return sum + 1;
      const units = Number(maybeUnits);
      return sum + (Number.isFinite(units) ? units : 0);
    }, 0);

    return { items: records, totalAvailableUnits, count: records.length };
  },
  // List units expiring in 5 or fewer days from today (but not expired today)
  listNearingExpiryUnits: async (
    inventoryId: string
  ): Promise<{
    items: unknown[];
    totalAvailableUnits: number;
    count: number;
  }> => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const endWindow = new Date(startOfToday);
    endWindow.setDate(endWindow.getDate() + 5);

    const where = {
      inventoryId,
      status: TestStatus.SAFE,
      consumed: false,
      expiryDate: {
        gt: startOfToday, // not expired today
        lte: endWindow, // within 5 days
      },
    } satisfies Prisma.BloodWhereInput;

    const records = await prisma.blood.findMany({ where });

    const totalAvailableUnits = records.reduce((sum, r) => {
      const maybeUnits = (r as unknown as { available_units?: number })
        .available_units;
      if (maybeUnits === undefined || maybeUnits === null) return sum + 1;
      const units = Number(maybeUnits);
      return sum + (Number.isFinite(units) ? units : 0);
    }, 0);

    return { items: records, totalAvailableUnits, count: records.length };
  },
  // List all SAFE and not consumed units for an inventory (no blood group filter)
  listUnitsByInventory: async (
    inventoryId: string
  ): Promise<{
    items: unknown[];
    totalAvailableUnits: number;
    count: number;
  }> => {
    const where = {
      inventoryId,
      status: TestStatus.SAFE,
      consumed: false,
    } satisfies Prisma.BloodWhereInput;

    const records = await prisma.blood.findMany({
      where,
      include: {
        bloodDonation: {
          include: {
            user: true,
            bloodDonationForm: true,
          },
        },
      },
    });

    const totalAvailableUnits = records.reduce((sum, r) => {
      const maybeUnits = (r as unknown as { available_units?: number })
        .available_units;
      if (maybeUnits === undefined || maybeUnits === null) return sum + 1;
      const units = Number(maybeUnits);
      return sum + (Number.isFinite(units) ? units : 0);
    }, 0);

    return { items: records, totalAvailableUnits, count: records.length };
  },
  // Discard a single blood unit by id: set status to DISCARDED and disposed to true
  discardUnit: async (
    bloodId: string
  ): Promise<{ success: boolean; data?: unknown } | null> => {
    try {
      const updated = await prisma.blood.update({
        where: { id: bloodId },
        data: {
          status: TestStatus.DISCARDED,
          disposed: true,
        },
      });
      return { success: true, data: updated };
    } catch (err: unknown) {
      // If record not found, prisma throws error with code P2025
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "P2025"
      ) {
        return null;
      }
      throw err;
    }
  },
};

export default BloodService;
