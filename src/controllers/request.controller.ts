import { Request, Response } from "express";
import RequestService from "../services/request.service.js";
import { BadRequestError } from "../services/request.service.js";
export const RequestController = {
  createRequest: async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = req.body;

      const created = await RequestService.createRequest(payload);

      res.status(201).json({ message: "Request created", data: created });
    } catch (error) {
      console.error("Error creating Request:", error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ message: error.message });
      } else if (error instanceof Error) {
        res.status(500).json({ message: "Internal server error" });
      } else {
        // error is unknown, attempt to stringify
        const msg = typeof error === "string" ? error : JSON.stringify(error);
        res.status(500).json({ message: msg });
      }
    }
  },
  getPendingByRecipient: async (req: Request, res: Response): Promise<void> => {
    try {
      const { medicalEstablishmentId } = req.query as Record<
        string,
        string | undefined
      >;
      if (!medicalEstablishmentId) {
        res.status(400).json({ message: "medicalEstablishmentId is required" });
        return;
      }
      const data = await RequestService.getPendingByRecipient(
        medicalEstablishmentId
      );
      res.status(200).json({ message: "Success", data });
    } catch (error) {
      console.error("Error fetching pending requests by recipient:", error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  },
  getPendingByRequester: async (req: Request, res: Response): Promise<void> => {
    try {
      const { medicalEstablishmentId } = req.query as Record<
        string,
        string | undefined
      >;
      if (!medicalEstablishmentId) {
        res.status(400).json({ message: "medicalEstablishmentId is required" });
        return;
      }
      const data =
        await RequestService.getPendingByRequesterByMedicalEstablishmentId(
          medicalEstablishmentId
        );
      res.status(200).json({ message: "Success", data });
    } catch (error) {
      console.error("Error fetching pending requests by requester:", error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  },
  getSummary: async (req: Request, res: Response): Promise<void> => {
    try {
      const { medicalEstablishmentId } = req.query as Record<
        string,
        string | undefined
      >;
      if (!medicalEstablishmentId) {
        res.status(400).json({ message: "medicalEstablishmentId is required" });
        return;
      }
      const data = await RequestService.getSummary(medicalEstablishmentId);
      res.status(200).json({ message: "Success", data });
    } catch (error) {
      console.error("Error fetching request summary:", error);
      if (error instanceof BadRequestError) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  },
};

export default RequestController;
