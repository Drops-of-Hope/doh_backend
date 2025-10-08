// Campaign detail response types matching frontend requirements

export interface CampaignDetailResponse {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  goalBloodUnits: number;
  currentBloodUnits: number;
  status: 'active' | 'completed' | 'cancelled';
  organizer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    organization: string;
  };
  medicalEstablishment: {
    id: string;
    name: string;
    address: string;
    contactNumber: string;
  };
  requirements: {
    bloodTypes: string[];
    ageRange: {
      min: number;
      max: number;
    };
    minimumWeight: number;
  };
  stats: {
    totalDonors: number;
    totalAttendance: number;
    screenedPassed: number;
    currentDonations: number;
    goalProgress: number; // percentage
  };
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface CampaignListItem {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  expectedDonors: number;
  actualDonors: number;
  status: 'active' | 'completed' | 'cancelled';
  imageUrl?: string;
  isActive: boolean;
  participantCount?: number;
}

export interface CampaignStats {
  totalDonors: number;
  totalAttendance: number;
  screenedPassed: number;
  currentDonations: number;
  goalProgress: number;
}