import { Request, Response } from "express";
import { DonationFormService } from "../services/donationForm.service.js";

export const DonationFormController = {

  //Get donation forms by Appointment ID
  findByAppointmentId: async (req: Request, res: Response) => {
    const { appointmentId } = req.params;
    const forms = await DonationFormService.getDonationFormsByAppointmentId(appointmentId);

    if (forms.length > 0) {
      res.json(forms);
    } else {
      res.status(404).json({ message: "No donation forms found for this appointment" });
    }
  },
};
