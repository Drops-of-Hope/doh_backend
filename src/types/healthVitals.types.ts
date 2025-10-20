export interface HealthVital {
  id: string;
  userId: string;
  appointmentId?: string;
  weight: string; // Stored encrypted
  bp: string; // Stored encrypted
  cvsPulse: string; // Stored encrypted
  dateTime: Date;
}

export interface HealthVitalDecrypted {
  id: string;
  userId: string;
  appointmentId?: string;
  weight: number; // Decrypted value
  bp: number; // Decrypted value
  cvsPulse: number; // Decrypted value
  dateTime: Date;
}

export interface CreateHealthVitalInput {
  userId: string;
  appointmentId?: string;
  weight: number;
  bp: number;
  cvsPulse: number;
}
