// Define user interface for request
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  bloodGroup?: string;
  nic?: string;
}

// Extend Request interface to include user
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface DecodedToken {
  userId?: string;
  sub?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  nic: string;
}

export interface QRScanRequest {
  qrData: string;
  campaignId?: string;
  scanType: string;
}

export interface QRScanResult {
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

export interface EmergencyResponseRequest {
  responseType: string;
  message?: string;
  contactInfo?: Record<string, unknown>;
}
