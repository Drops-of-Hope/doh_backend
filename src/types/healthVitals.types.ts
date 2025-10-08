export interface HealthVital {
  id: string;
  userId: string;
  appointmentId?: string;
  weight: number;
  bp: number;
  cvsPulse: number;
  dateTime: Date;
}

export interface CreateHealthVitalInput {
  userId: string;
  appointmentId?: string;
  weight: number;
  bp: number;
  cvsPulse: number;
}