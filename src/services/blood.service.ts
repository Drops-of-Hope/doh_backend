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
  // Aggregate counts for inventory stock
  getStockCounts: async (
    inventoryId: string
  ): Promise<{
    totalStock: number; // SAFE or PENDING, not consumed/disposed
    safeUnits: number; // SAFE, not consumed/disposed
    expiredUnits: number; // not DISCARDED, expiryDate <= today, not consumed/disposed
    nearingExpiryUnits: number; // not DISCARDED, expiryDate in next 7 days, not consumed/disposed
  }> => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endWindow = new Date(startOfToday);
    endWindow.setDate(endWindow.getDate() + 7);

    // Total stock: SAFE or PENDING, exclude consumed/disposed
    const [totalStock, safeUnits, expiredUnits, nearingExpiryUnits] =
      await Promise.all([
        prisma.blood.count({
          where: {
            inventoryId,
            status: { in: [TestStatus.SAFE, TestStatus.PENDING] },
            consumed: false,
            disposed: false,
          },
        }),
        prisma.blood.count({
          where: {
            inventoryId,
            status: TestStatus.SAFE,
            consumed: false,
            disposed: false,
          },
        }),
        prisma.blood.count({
          where: {
            inventoryId,
            status: { not: TestStatus.DISCARDED },
            consumed: false,
            disposed: false,
            expiryDate: { lte: startOfToday },
          },
        }),
        prisma.blood.count({
          where: {
            inventoryId,
            status: { not: TestStatus.DISCARDED },
            consumed: false,
            disposed: false,
            expiryDate: {
              gt: startOfToday, // not expired today
              lte: endWindow, // within next 7 days
            },
          },
        }),
      ]);

    return { totalStock, safeUnits, expiredUnits, nearingExpiryUnits };
  },
  // Group SAFE, not consumed units by ABO blood group with counts and items
  listUnitsByBloodGroup: async (
    inventoryId: string
  ): Promise<{
    data: Array<{
      blood_group: BloodGroup;
      count: number;
      available_units: number;
      items: unknown[];
    }>;
    totalAvailableUnits: number;
    totalCount: number;
  }> => {
    const where = {
      inventoryId,
      status: TestStatus.SAFE,
      consumed: false,
    } satisfies Prisma.BloodWhereInput;

    const records = await prisma.blood.findMany({
      where,
      include: {
        bloodTests: {
          orderBy: { testDateTime: "desc" },
          take: 1, // use the latest test to infer ABO
        },
        bloodDonation: {
          include: {
            user: true,
            bloodDonationForm: true,
          },
        },
      },
    });

    // Define precise record type for this query
    type BloodRecord = Prisma.BloodGetPayload<{
      include: {
        bloodTests: true;
        bloodDonation: {
          include: {
            user: true;
            bloodDonationForm: true;
          };
        };
      };
    }>;

    type WithAvailableUnits = { available_units?: number | null };

    // Helper to get ABO group from latest test if any
    function getGroup(r: BloodRecord): BloodGroup | null {
      const t =
        Array.isArray(r?.bloodTests) && r.bloodTests.length > 0
          ? r.bloodTests[0]
          : null;
      return (t?.ABOTest as BloodGroup | undefined) ?? null;
    }

    // Compute available units the same way as other methods
    function recordUnits(r: BloodRecord): number {
      const maybeUnits = (r as unknown as WithAvailableUnits).available_units;
      if (maybeUnits === undefined || maybeUnits === null) return 1;
      const n = Number(maybeUnits);
      return Number.isFinite(n) ? n : 0;
    }

    // Grouping
    const map = new Map<
      BloodGroup,
      { items: BloodRecord[]; count: number; available_units: number }
    >();
    for (const r of records) {
      const g = getGroup(r);
      if (!g) continue; // skip records without a determined ABO group
      const units = recordUnits(r);
      const entry = map.get(g) ?? { items: [], count: 0, available_units: 0 };
      entry.items.push(r);
      entry.count += 1;
      entry.available_units += units;
      map.set(g, entry);
    }

    const data = Array.from(map.entries()).map(([blood_group, v]) => ({
      blood_group,
      count: v.count,
      available_units: v.available_units,
      items: v.items,
    }));

    // Sort by a conventional ABO order
    const order: BloodGroup[] = [
      BloodGroup.O_NEGATIVE,
      BloodGroup.O_POSITIVE,
      BloodGroup.A_NEGATIVE,
      BloodGroup.A_POSITIVE,
      BloodGroup.B_NEGATIVE,
      BloodGroup.B_POSITIVE,
      BloodGroup.AB_NEGATIVE,
      BloodGroup.AB_POSITIVE,
    ];
    data.sort(
      (a, b) => order.indexOf(a.blood_group) - order.indexOf(b.blood_group)
    );

    const totalAvailableUnits = data.reduce((s, g) => s + g.available_units, 0);
    const totalCount = records.length;

    return { data, totalAvailableUnits, totalCount };
  },
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
