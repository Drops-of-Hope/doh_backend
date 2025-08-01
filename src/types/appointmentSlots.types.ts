export interface AppointmentSlot {
  id?: string;
  startTime: string; 
  endTime: string;  
  tokenNumber: number;
  isAvailable: boolean;
  medicalEstablishmentId: string;
}

export interface CreateAppointmentSlotsInput {
  startTime: string;       
  endTime: string;         
  appointmentDuration: number; 
  restTime?: number;      
  medicalEstablishmentId: string;
}