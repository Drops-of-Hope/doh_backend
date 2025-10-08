// Types for donation-related responses

export interface DonationRecord {
  id: string;
  date: string; // ISO date string
  location: string;
  type: 'blood' | 'plasma' | 'platelets';
  status: 'completed' | 'pending' | 'cancelled';
  volume: string; // e.g., '450ml'
  campaign?: {
    id: string;
    title: string;
  };
  medicalEstablishment: {
    name: string;
    address: string;
  };
  healthMetrics?: {
    hemoglobin?: number;
    bloodPressure?: string;
    weight?: number;
    pulse?: number;
  };
  points: number;
  notes?: string;
}

export interface DonationStats {
  totalDonations: number;
  totalVolume: number; // in ml
  donorLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  pointsEarned: number;
  currentStreak: number;
  longestStreak: number;
}

export interface DonationHistoryResponse {
  donations: DonationRecord[];
  stats: DonationStats;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DonationEligibilityResponse {
  eligibleToDonate: boolean;
  nextEligibleDate: string | null;
  daysSinceLastDonation: number | null;
  reason?: string;
}

export interface UserAppointment {
  id: string;
  hospital: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  location: string;
  confirmationId: string;
  status: 'upcoming' | 'confirmed' | 'completed' | 'cancelled';
  type: 'blood_donation' | 'platelet_donation' | 'plasma_donation';
  notes?: string;
  medicalEstablishment: {
    id: string;
    name: string;
    address: string;
    contactNumber: string;
  };
  campaign?: {
    id: string;
    title: string;
    location: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserAppointmentsResponse {
  appointments: UserAppointment[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}