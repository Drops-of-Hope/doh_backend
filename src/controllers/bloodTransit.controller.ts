import { Request, Response } from "express";
import BloodTransitService from "../services/bloodTransit.service.js";

export const BloodTransitController = {
  getTransitRequests: async (req: Request, res: Response): Promise<void> => {
    try {
      const { bloodBankId, hospitalId } = req.query as Record<string, string | undefined>;

      if (!bloodBankId && !hospitalId) {
        res.status(400).json({ message: "bloodBankId or hospitalId query parameter is required" });
        return;
      }

      const data = await BloodTransitService.getTransitRequests({ bloodBankId, hospitalId });

      res.status(200).json({ message: "Success", data });
    } catch (error) {
      console.error("Error fetching transit requests:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  createTransit: async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body ?? {};
      // Support both legacy and form-style field names
      const bloodId: string | undefined = body.bloodId ?? body.blood_id;
      const receiverHospitalId: string | undefined = body.receiverHospitalId ?? body.receiver_hospital_id;
      const bloodBankId: string | undefined = body.bloodBankId ?? body.blood_bank_id;
      const bloodRequestId: string | undefined = body.bloodRequestId ?? body.blood_request_id;
      const transitStatus: string | undefined = body.transitStatus ?? body.transit_status;

      // Form fields
      const driverName: string | undefined = body.driverName ?? body.driver_name;
      const driverPhone: string | undefined = body.driverPhone ?? body.driver_phone;
      const vehicleNumber: string | undefined = body.vehicleNumber ?? body.vehicle_number;
      const vehicleType: string | undefined = body.vehicleType ?? body.vehicle_type; // optional
      const estimatedDeparture: string | undefined = body.estimatedDeparture ?? body.estimated_departure;
      const estimatedArrival: string | undefined = body.estimatedArrival ?? body.estimated_arrival;
      const emergencyContactNumber: string | undefined = body.emergencyContactNumber ?? body.emergency_contact_number;
      const specialInstructions: string | undefined = body.specialInstructions ?? body.special_instructions;

      // Required IDs
      if (!bloodId || typeof bloodId !== "string") {
        res.status(400).json({ message: "bloodId is required and must be a string" });
        return;
      }
      if (!receiverHospitalId || typeof receiverHospitalId !== "string") {
        res.status(400).json({ message: "receiverHospitalId is required and must be a string" });
        return;
      }

      // Required form fields
      if (!driverName || typeof driverName !== "string") {
        res.status(400).json({ message: "driverName is required and must be a string" });
        return;
      }
      if (!driverPhone || typeof driverPhone !== "string") {
        res.status(400).json({ message: "driverPhone is required and must be a string" });
        return;
      }
      if (!vehicleNumber || typeof vehicleNumber !== "string") {
        res.status(400).json({ message: "vehicleNumber is required and must be a string" });
        return;
      }
      if (!estimatedDeparture || typeof estimatedDeparture !== "string") {
        res.status(400).json({ message: "estimatedDeparture is required and must be a string" });
        return;
      }
      if (!estimatedArrival || typeof estimatedArrival !== "string") {
        res.status(400).json({ message: "estimatedArrival is required and must be a string" });
        return;
      }
      if (!emergencyContactNumber || typeof emergencyContactNumber !== "string") {
        res.status(400).json({ message: "emergencyContactNumber is required and must be a string" });
        return;
      }

      // Parse 12-hour or ISO date strings like "MM/DD/YYYY hh:mm AM/PM" or ISO
      function parseDateTime(input: string): Date {
        const s = String(input).trim();
        // Try ISO
        const iso = new Date(s);
        if (!Number.isNaN(iso.getTime())) return iso;
        // Try mm/dd/yyyy hh:mm AM/PM
        const re = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)$/i;
        const m = s.match(re);
        if (m) {
          const [, mm, dd, yyyy, hh, min, ap] = m;
          const month = parseInt(mm, 10) - 1;
          const day = parseInt(dd, 10);
          const year = parseInt(yyyy, 10);
          let hour = parseInt(hh, 10);
          const minute = parseInt(min, 10);
          const upper = ap.toUpperCase();
          if (upper === "PM" && hour < 12) hour += 12;
          if (upper === "AM" && hour === 12) hour = 0;
          return new Date(year, month, day, hour, minute, 0, 0); // local time
        }
        throw new Error("Invalid date/time format; expected ISO or MM/DD/YYYY hh:mm AM/PM");
      }

      const dispatchDateTime = parseDateTime(estimatedDeparture);
      const deliveryDateTime = parseDateTime(estimatedArrival);

      // Compose deliveryVehicle string to carry vehicle + driver + emergency contact + notes (schema unchanged)
      const deliveryVehicleParts = [
        vehicleType ? String(vehicleType).trim() : null,
        String(vehicleNumber).trim(),
        `Driver: ${String(driverName).trim()} (${String(driverPhone).trim()})`,
        `Emergency: ${String(emergencyContactNumber).trim()}`,
        specialInstructions ? `Notes: ${String(specialInstructions).trim()}` : null,
      ].filter(Boolean) as string[];
      const deliveryVehicle = deliveryVehicleParts.join(" | ");

      const created = await BloodTransitService.createTransit({
        bloodId,
        receiverHospitalId,
        deliveryVehicle,
        dispatchDateTime,
        deliveryDateTime,
        transitStatus,
        bloodBankId,
        bloodRequestId,
      });

      res.status(201).json({ message: "Transit created", data: created });
    } catch (error: unknown) {
      console.error("Error creating blood transit:", error);
      const statusCode =
        typeof (error as { statusCode?: number })?.statusCode === "number"
          ? (error as { statusCode?: number }).statusCode!
          : 400;
      const message = error instanceof Error ? error.message : "Bad request";
      res.status(statusCode).json({ message });
    }
  },
};

export default BloodTransitController;
