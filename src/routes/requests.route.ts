import { Router } from "express";
import { RequestController } from "../controllers/request.controller.js";

const router = Router();

// POST /
router.post("/", RequestController.createRequest);

// GET /pending/by-recipient?medicalEstablishmentId=...
router.get("/pending/by-recipient", RequestController.getPendingByRecipient);

// GET /pending/by-requester?bloodBankId=...
router.get("/pending/by-requester", RequestController.getPendingByRequester);

// GET /summary?medicalEstablishmentId=...
router.get("/summary", RequestController.getSummary);

export default router;

