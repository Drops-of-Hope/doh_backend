import { Request, Response } from "express";
import RequestService from "../services/request.service";
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
        const msg = typeof error === 'string' ? error : JSON.stringify(error);
        res.status(500).json({ message: msg });
      }
    }
  },
};

export default RequestController;
