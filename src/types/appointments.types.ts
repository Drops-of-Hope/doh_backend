export type AppointmentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'; // Updated to match schema

export interface Appointment {
  id: string;
  donorId: string;
  bdfId?: string;
  slotId: string;
  scheduled: AppointmentStatus;
  appointmentDate: Date;
}

export interface CreateAppointmentsInput {
  donorId: string;
  slotId: string;
  appointmentDate: Date;
}
