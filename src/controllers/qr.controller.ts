import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { QRScanType } from "@prisma/client";
import { QRScanResultType, QRDataContent } from "../types/qr.types.js";
import { PushService } from "../services/push.service.js";
import { SSE } from "../utils/sse.js";

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    bloodGroup?: string;
    nic?: string;
  };
}

export const QRController = {
  // POST /qr/scan
  scanQR: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { qrData, campaignId, scanType } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to scan QR codes",
        });
        return;
      }

      if (!qrData || !scanType) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: "QR data and scan type are required",
        });
        return;
      }

      // Validate scan type
      const validScanTypes = Object.values(QRScanType);
      if (!validScanTypes.includes(scanType)) {
        res.status(400).json({
          success: false,
          error: "Invalid scan type",
          message: "Please provide a valid scan type",
        });
        return;
      }

      // Parse QR data (assuming it contains user ID or campaign info)
      let scannedUserId: string;
      let campaignParticipationId: string | undefined;

      try {
        const qrContent: QRDataContent = JSON.parse(qrData);
        scannedUserId = qrContent.userId || qrContent.scannedUserId || "";
        campaignParticipationId = qrContent.participationId;
      } catch {
        // If not JSON, assume it's a simple user ID
        scannedUserId = qrData;
      }

      if (!scannedUserId) {
        res.status(400).json({
          success: false,
          error: "Invalid QR data",
          message: "QR code does not contain valid user information",
        });
        return;
      }

      // Verify scanned user exists
      const scannedUser = await prisma.user.findUnique({
        where: { id: scannedUserId },
      });

      if (!scannedUser) {
        res.status(404).json({
          success: false,
          error: "User not found",
          message: "The scanned user does not exist",
        });
        return;
      }

      // Create QR scan record
      const qrScan = await prisma.qRScan.create({
        data: {
          scannerId: userId,
          scannedUserId,
          campaignId: campaignId || null,
          campaignParticipationId: campaignParticipationId || null,
          scanType,
          metadata: {
            qrData,
            scanLocation: "mobile_app",
          },
        },
      });

      // Handle different scan types
      const scanResult: QRScanResultType = {
        scanId: qrScan.id,
        scanType,
        scannedUser: {
          id: scannedUser.id,
          name: scannedUser.name,
          bloodGroup: scannedUser.bloodGroup,
        },
        timestamp: qrScan.scanDateTime,
      };

      if (scanType === "CAMPAIGN_ATTENDANCE" && campaignId) {
        // Update campaign participation with auto-register and donor count increment
        let participation = await prisma.campaignParticipation.findFirst({
          where: {
            userId: scannedUserId,
            campaignId,
          },
        });

        if (!participation) {
          // Auto-register walk-in and mark attendance
          participation = await prisma.campaignParticipation.create({
            data: {
              userId: scannedUserId,
              campaignId,
              qrCodeScanned: true,
              scannedAt: new Date(),
              scannedById: userId,
              attendanceMarked: true,
              status: 'ATTENDED',
              pointsEarned: 5,
            },
          });

          // First-time attendee -> increment donors (best effort)
          try {
            await prisma.campaign.update({
              where: { id: campaignId },
              data: { actualDonors: { increment: 1 } },
            });
          } catch {
            // ignore
          }
        } else {
          const wasMarked = participation.attendanceMarked;
          await prisma.campaignParticipation.update({
            where: { id: participation.id },
            data: {
              qrCodeScanned: true,
              scannedAt: new Date(),
              scannedById: userId,
              attendanceMarked: true,
              status: 'ATTENDED',
              // Only award base points if marking for first time
              pointsEarned: wasMarked ? participation.pointsEarned : 5,
            },
          });

          if (!wasMarked) {
            try {
              await prisma.campaign.update({
                where: { id: campaignId },
                data: { actualDonors: { increment: 1 } },
              });
            } catch {
              // ignore
            }
          }
        }

        scanResult.participationUpdated = true;
        scanResult.participationId = participation.id;

        // Immediately create a DONATION_ELIGIBLE notification for the scanned donor
        try {
          await prisma.notification.create({
            data: {
              userId: scannedUserId,
              type: "DONATION_ELIGIBLE",
              title: "QR scanned",
              message:
                "Your attendance has been verified. You can now proceed with the donation form.",
              isRead: false,
              metadata: {
                campaignId,
                scannedAt: new Date().toISOString(),
              },
            },
          });
        } catch (e) {
          console.error(
            "Failed to create DONATION_ELIGIBLE notification (scanQR flow):",
            e
          );
        }
      }

      // Create activity for scanned user
      await prisma.activity.create({
        data: {
          userId: scannedUserId,
          type: "QR_SCANNED",
          title: "QR Code Scanned",
          description: `Your QR code was scanned for ${scanType.toLowerCase().replace("_", " ")}`,
          metadata: {
            scanId: qrScan.id,
            scannerId: userId,
            scanType,
          },
        },
      });

      res.status(200).json({
        success: true,
        scanResult,
      });
    } catch (error) {
      console.error("QR scan error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to process QR scan",
      });
    }
  },

  // GET /qr/generate
  generateQR: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to generate QR code",
        });
        return;
      }

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          userDetails: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: "User not found",
          message: "User not found in database",
        });
        return;
      }

      // Generate QR code data
      const qrData = {
        userId: user.id,
        name: user.name,
        bloodGroup: user.bloodGroup,
        nic: user.nic,
        timestamp: new Date().toISOString(),
        version: "1.0",
      };

      // Create QR code string
      const qrCodeString = JSON.stringify(qrData);
      
      // Set expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      res.status(200).json({
        data: {
          qrCode: qrCodeString,
          expiresAt: expiresAt.toISOString(),
          userInfo: {
            id: user.id,
            name: user.name,
            bloodGroup: user.bloodGroup,
            totalDonations: user.totalDonations,
          },
        },
      });
    } catch (error) {
      console.error("QR generation error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to generate QR code",
      });
    }
  },

  // POST /qr/mark-attendance
  markAttendanceQR: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { qrData, campaignId } = req.body;
      const scannerId = req.user?.id;

      if (!scannerId) {
        res.status(401).json({
          success: false,
          error: "User not authenticated",
          message: "Please login to mark attendance",
        });
        return;
      }

      if (!qrData || !campaignId) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: "QR data and campaign ID are required",
        });
        return;
      }

      // Parse QR data to get user ID
      let scannedUserId: string;
      try {
        const qrContent: Partial<{ userId: string; uid: string; scannedUserId: string }> = JSON.parse(qrData);
        scannedUserId = qrContent.userId || qrContent.uid || qrContent.scannedUserId || "";
      } catch {
        // If not JSON, assume it's a simple user ID
        scannedUserId = qrData;
      }

      if (!scannedUserId) {
        res.status(400).json({
          success: false,
          error: "Invalid QR data",
          message: "QR code does not contain valid user information",
        });
        return;
      }

      // Find the campaign participation
      let participation = await prisma.campaignParticipation.findFirst({
        where: {
          campaignId,
          userId: scannedUserId,
        },
        include: {
          user: {
            select: {
              name: true,
              bloodGroup: true,
              nic: true,
            },
          },
          campaign: {
            select: {
              title: true,
            },
          },
        },
      });

      if (!participation) {
        // Auto-register for live campaign walk-in and proceed to mark attendance
        participation = await prisma.campaignParticipation.create({
          data: {
            campaignId,
            userId: scannedUserId,
            attendanceMarked: true,
            qrCodeScanned: true,
            scannedAt: new Date(),
            scannedById: scannerId,
            status: 'ATTENDED',
            pointsEarned: 5,
          },
          include: {
            user: {
              select: {
                name: true,
                bloodGroup: true,
                nic: true,
              },
            },
            campaign: {
              select: { title: true },
            },
          },
        });

        // Increment actual donors for new attendee
        try {
          await prisma.campaign.update({ where: { id: campaignId }, data: { actualDonors: { increment: 1 } } });
        } catch {
          // ignore
        }

        // Best-effort activity log
        try {
          await prisma.activity.create({
            data: {
              userId: scannedUserId,
              type: 'CAMPAIGN_JOINED',
              title: 'Joined Campaign (On-site)',
              description: participation.campaign ? `Registered on-site for campaign: ${participation.campaign.title}` : 'Registered on-site for campaign',
              metadata: { campaignId },
            },
          });
        } catch {
          // ignore
        }
      }

      // Mark attendance via QR scan
      const wasMarked = participation.attendanceMarked;
      const [updatedParticipation] = await Promise.all([
        prisma.campaignParticipation.update({
          where: { id: participation.id },
          data: {
            qrCodeScanned: true,
            scannedAt: new Date(),
            scannedById: scannerId,
            attendanceMarked: true,
            status: 'ATTENDED',
          },
        }),
        prisma.qRScan.create({
          data: {
            scannerId,
            scannedUserId,
            campaignId,
            campaignParticipationId: participation.id,
            scanType: 'CAMPAIGN_ATTENDANCE',
            metadata: {
              qrData,
              attendanceMarked: true,
              scanLocation: "campaign_site",
            },
          },
        }),
      ]);

      if (!wasMarked) {
        try {
          await prisma.campaign.update({ where: { id: campaignId }, data: { actualDonors: { increment: 1 } } });
        } catch {
          // ignore
        }
      }

      // Immediately create a DONATION_ELIGIBLE notification for the scanned donor
      try {
        await prisma.notification.create({
          data: {
            userId: scannedUserId,
            type: "DONATION_ELIGIBLE",
            title: "QR scanned",
            message:
              "Your attendance has been verified. You can now proceed with the donation form.",
            isRead: false,
            metadata: {
              campaignId,
              scannedAt: new Date().toISOString(),
            },
          },
        });
      } catch (e) {
        console.error("Failed to create DONATION_ELIGIBLE notification (QR flow):", e);
      }

      // Side effects: push notification + SSE to donor
      const scannedAt = updatedParticipation.scannedAt || new Date();
      try {
        await PushService.sendToUser(scannedUserId, {
          title: "Attendance Marked",
          body: "Your attendance was recorded successfully.",
          data: {
            type: "CAMPAIGN_ATTENDANCE",
            campaignId,
            participationId: updatedParticipation.id,
            scannedAt,
          },
        });
      } catch (e) {
        console.warn('Push send error (ignored):', e);
      }
      try {
        SSE.sendToUser(scannedUserId, 'attendance', {
          campaignId,
          participationId: updatedParticipation.id,
          status: 'ATTENDED',
          scannedAt,
        });
      } catch (e) {
        console.warn('SSE emit error (ignored):', e);
      }

      res.status(200).json({
        success: true,
        message: "Attendance marked",
        participation: {
          id: updatedParticipation.id,
          campaignId,
          userId: scannedUserId,
          status: updatedParticipation.status,
          attendanceMarked: true,
          donationCompleted: updatedParticipation.donationCompleted,
          pointsEarned: updatedParticipation.pointsEarned,
          scannedAt,
        },
      });
    } catch (error) {
      console.error("Mark attendance QR error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to mark attendance via QR",
      });
    }
  },
};
