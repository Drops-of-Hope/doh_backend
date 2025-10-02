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