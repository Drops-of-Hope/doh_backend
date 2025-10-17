import { Request, Response, RequestHandler } from "express";
import { prisma } from "../config/db.js";

export const InventoryController = {
  // GET /inventories/:id/safe-units
  getSafeUnits: (async (req: Request, res: Response) => {
    try {
      const inventoryId = req.params.id;

      if (!inventoryId) {
        res
          .status(400)
          .json({ success: false, message: "Inventory id is required" });
        return;
      }

      const units = await prisma.blood.findMany({
        where: {
          inventoryId,
          consumed: false,
          disposed: false,
        },
        include: {
          bloodDonation: {
            include: {
              user: true,
            },
          },
        },
      });

      // Map to include donorId and donor bloodGroup at top-level for each unit
      const mapped = units.map((u) => ({
        ...u,
        donorId: u.bloodDonation?.userId ?? null,
        donorBloodGroup: u.bloodDonation?.user?.bloodGroup ?? null,
      }));

      res.status(200).json({ success: true, data: mapped });
    } catch (error: unknown) {
      console.error("Error in InventoryController.getSafeUnits:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch safe blood units",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }) as RequestHandler,
};
