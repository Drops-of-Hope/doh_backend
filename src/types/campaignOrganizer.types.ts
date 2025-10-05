export interface OrganizerCampaignRequest {
  organizerId: string;
  page?: number;
  limit?: number;
  status?: string;
}

export interface CreateCampaignRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  targetDonors: number;
  bloodGroups: string[];
  requirements?: string;
  contactInfo: string;
  organizerId: string;
}

export interface CampaignStatsResponse {
  totalRegistrations: number;
  attendanceMarked: number;
  donationsCompleted: number;
  noShows: number;
  byBloodGroup: {
    [key: string]: number;
  };
  byHour: {
    hour: number;
    registrations: number;
    attendance: number;
  }[];
}

export interface MarkAttendanceRequest {
  userId: string;
  scannedAt?: string;
  method: 'QR' | 'MANUAL';
  notes?: string;
  markedBy: string;
}

export interface AttendanceRecord {
  id: string;
  user: {
    id: string;
    name: string;
    bloodGroup: string;
    nic: string;
    email: string;
  };
  registrationDate: Date;
  attendanceMarked: boolean;
  attendanceTime?: Date;
  method?: 'QR' | 'MANUAL';
  donationCompleted: boolean;
  qrCodeScanned: boolean;
  pointsEarned: number;
  feedback?: string;
  feedbackRating?: number;
  notes?: string;
}

export interface UpdateCampaignStatusRequest {
  status: string;
  comment?: string;
}

export interface ManualAttendanceRequest {
  donorId: string;
  method: 'MANUAL';
  markedBy: string;
  notes?: string;
}

export interface CampaignResponse {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  targetDonors: number;
  bloodGroups: string[];
  requirements?: string;
  contactInfo: string;
  status: string;
  organizerId: string;
  organizer: {
    id: string;
    name: string;
    email: string;
  };
  currentRegistrations: number;
  createdAt: Date;
  updatedAt: Date;
}