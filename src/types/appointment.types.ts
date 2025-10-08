import { Appointment, MedicalEstablishment, AppointmentSlot, Prisma } from '@prisma/client';

export type AppointmentWithRelations = Appointment & {
  medicalEstablishment: MedicalEstablishment;
  slot: AppointmentSlot;
};

export type AppointmentQueryResult = Prisma.AppointmentGetPayload<{
  include: {
    medicalEstablishment: true;
    slot: true;
  };
}>;

export interface AppointmentWhereClause {
  donorId: string;
  appointmentDate?: { gte: Date };
  scheduled?: "PENDING" | "COMPLETED" | "CANCELLED";
}

export interface AppointmentUpdateData {
  slotId?: string;
  appointmentDate?: Date;
}

export interface AppointmentCreateData {
  donorId: string;
  slotId: string;
  appointmentDate: Date;
  medicalEstablishmentId: string;
  scheduled: "PENDING" | "COMPLETED" | "CANCELLED";
}