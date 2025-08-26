export type AppointmentStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'; // Matches Prisma schema

export interface Appointment {
  id: string;
  donorId: string;
  bdfId?: string;
  slotId: string;
  scheduled: AppointmentStatus;
  appointmentDate: Date;
  medicalEstablishmentId: string;
}

export interface CreateAppointmentsInput {
  donorId: string;
  slotId: string;
  appointmentDate: Date;
  medicalEstablishmentId: string;
}
