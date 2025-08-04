export interface AppointmentSlot {
  id?: string;
  startTime: string; 
  endTime: string;  
  donorsPerSlot: number;
  isAvailable: boolean;
  medicalEstablishmentId: string;
}

export interface CreateAppointmentSlotsInput {
  startTime: string;       
  endTime: string;    
  donorsPerSlot?: number;     
  appointmentDuration: number; 
  restTime?: number;      
  medicalEstablishmentId: string;
}