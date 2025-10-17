import { Router } from "express";
import { InventoryController } from "../controllers/inventory.controller";

const router = Router();

// GET safe blood units for a given inventory id
router.get("/:id/safe-units", InventoryController.getSafeUnits);

export default router;
