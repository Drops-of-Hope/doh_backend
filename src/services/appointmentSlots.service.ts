import { AppointmentSlotsRepository } from '../repositories/appointmentSlots.repository';
import { CreateAppointmentSlotsInput, AppointmentSlot } from '../types';

export const AppointmentSlotsService = {
  createAppointmentSlots: async ({ startTime, endTime, appointmentDuration, restTime = 0, medicalEstablishmentId }: CreateAppointmentSlotsInput) => {
    //to convert time string to minutes since midnight
    const timeToMinutes = (timeString: string): number => {
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    //to convert minutes since midnight back to time string
    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };
    
    // Generate appointment slots
    const slots: Omit<AppointmentSlot, 'id'>[] = [];
    const totalSlotDuration = appointmentDuration + restTime;
    
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    let currentMinutes = startMinutes;
    let tokenNumber = 1;
    
    // Generate slots until we can't fit another appointment
    while (currentMinutes + appointmentDuration <= endMinutes) {
      const slotStartTime = minutesToTime(currentMinutes);
      const slotEndTime = minutesToTime(currentMinutes + appointmentDuration);
      
      slots.push({
        startTime: slotStartTime,
        endTime: slotEndTime,
        tokenNumber: tokenNumber,
        isAvailable: true,
        medicalEstablishmentId: medicalEstablishmentId
      });
      
      // Move to next slot (appointment duration + rest time)
      currentMinutes += totalSlotDuration;
      tokenNumber++; // Increment token number for next slot
    }
    
    // Check if any slots were generated
    if (slots.length === 0) {
      throw new Error('No appointment slots could be generated for the given time range');
    }

    return AppointmentSlotsRepository.createMany(slots);
  },

  getSlotsByMedicalEstablishment: async (medicalEstablishmentId: string) => {
    return AppointmentSlotsRepository.getByMedicalEstablishmentId(medicalEstablishmentId);
  },
  
};