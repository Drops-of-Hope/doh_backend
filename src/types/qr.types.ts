export interface QRScanResultType {
  scanId: string;
  scanType: string;
  scannedUser: {
    id: string;
    name: string;
    bloodGroup: string;
  };
  timestamp: Date;
  participationUpdated?: boolean;
  participationId?: string;
}

export interface QRDataContent {
  userId?: string;
  scannedUserId?: string;
  participationId?: string;
  name?: string;
  bloodGroup?: string;
  nic?: string;
  timestamp?: string;
  version?: string;
}

export interface GenerateQRRequest {
  userId?: string; // Optional - defaults to authenticated user
  campaignId?: string;
  expiresIn?: number; // Minutes
  includeProfile?: boolean;
}

export interface GenerateQRResponse {
  qrCode: string; // Base64 encoded QR image
  qrData: string; // Raw QR data
  expiresAt: Date;
  user: {
    id: string;
    name: string;
    bloodGroup: string;
    nic: string;
    email: string;
    totalDonations: number;
    donationBadge: string;
    profileImageUrl?: string;
  };
}

export interface ScanQRRequest {
  qrData: string;
  campaignId?: string;
  scannerId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ScanQRResponse {
  success: boolean;
  scannedUser: {
    id: string;
    name: string;
    bloodGroup: string;
    nic: string;
    email: string;
    totalDonations: number;
    donationBadge: string;
    profileImageUrl?: string;
    eligibleToDonate: boolean;
    nextEligibleDate?: Date;
  };
  participation?: {
    id: string;
    campaignId: string;
    status: string;
    registrationDate: Date;
    attendanceMarked: boolean;
    qrCodeScanned: boolean;
  };
  warnings?: string[];
  eligibilityChecks?: {
    eligible: boolean;
    reasons?: string[];
    nextEligibleDate?: Date;
  };
}

export interface MarkAttendanceQRRequest {
  userId: string;
  campaignId: string;
  notes?: string;
}