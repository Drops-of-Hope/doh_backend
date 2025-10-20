import { Router } from "express";
import { BloodController } from "../controllers/blood.controller.js";

const router = Router();

// POST /api/blood/stock-counts
router.post("/stock-counts", BloodController.getStockCounts);

// POST /api/blood/check-availability
router.post("/check-availability", BloodController.checkAvailability);

// POST /api/blood/check-availability-by-deadline
router.post("/check-availability-by-deadline", BloodController.checkAvailabilityByDeadline);

// POST /api/blood/list-units
router.post("/list-units", BloodController.listAvailableUnits);

// POST /api/blood/expired-units
router.post("/expired-units", BloodController.listExpiredUnits);

// POST /api/blood/nearing-expiry
router.post("/nearing-expiry", BloodController.listNearingExpiryUnits);

// POST /api/blood/by-inventory
router.post("/by-inventory", BloodController.listUnitsByInventory);

// POST /api/blood/by-blood-group
router.post("/by-blood-group", BloodController.listUnitsByBloodGroup);

// GET /api/blood/non-expired?inventory_id=...&blood_group=...
router.get("/non-expired", BloodController.listNonExpiredUnitsByGroup);

// POST /api/blood/discard-unit
router.post("/discard-unit", BloodController.discardUnit);

export default router;
