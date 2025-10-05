export interface DonationFormData {
  userId?: string;
  donorId?: string;
  appointmentId?: string;
  dateTime?: Date | string;
  hasDonatedBefore?: boolean;
  anyDifficulty?: string;
  medicalAdvice?: boolean;
  feelingWell?: boolean;
  anyDiseases?: JSON;
  takingMedicines?: boolean;
  anySurgery?: boolean;
  workingLater?: boolean;
  pregnant?: boolean;
  haveHepatitis?: boolean;
  haveTB?: boolean;
  hadVaccination?: boolean;
  tattoos?: boolean;
  haveImprisonment?: boolean;
  travelledAbroad?: boolean;
  receivedBlood?: boolean;
  chemotherapy?: boolean;
  hadMalaria?: boolean;
  hasDengue?: boolean;
  hadLongFever?: boolean;
  hadtoothExtraction?: boolean;
  bookAspirin?: boolean;
  Acknowledgement?: boolean;
  highRisk?: boolean;
  hadWeightLoss?: boolean;
}

export type CreateDonationFormInput = Omit<DonationFormData, 'dateTime'> & { dateTime?: Date };

export type DonationFormResponse = DonationFormData;
