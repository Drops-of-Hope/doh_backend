import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const AuthController = {
  // POST /auth/login
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: "Missing credentials",
          message: "Email and password are required",
        });
        return;
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          userDetails: true,
        },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: "Invalid credentials",
          message: "Invalid email or password",
        });
        return;
      }

      // For now, we'll implement a simple password check
      // In production, you should have a password field in the User model
      // and use bcrypt to compare hashed passwords
      
      // Generate JWT token
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          sub: user.id 
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(200).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bloodGroup: user.bloodGroup,
          totalDonations: user.totalDonations,
          totalPoints: user.totalPoints,
          profileImageUrl: user.profileImageUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
          userDetails: user.userDetails ? {
            address: user.userDetails.address,
            city: user.userDetails.city,
            district: user.userDetails.district,
            phoneNumber: user.userDetails.phoneNumber,
            emergencyContact: user.userDetails.emergencyContact,
          } : null,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to process login request",
      });
    }
  },

  // POST /auth/register
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, nic } = req.body;

      if (!email || !password || !name || !nic) {
        res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: "Email, password, name, and NIC are required",
        });
        return;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { nic },
          ],
        },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: "User already exists",
          message: "A user with this email or NIC already exists",
        });
        return;
      }

      // Hash password (for production)
      // const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          nic,
          bloodGroup: "O_POSITIVE", // Default value, should be updated later
        },
      });

      // Generate JWT token
      const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          sub: user.id 
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bloodGroup: user.bloodGroup,
          totalDonations: user.totalDonations,
          totalPoints: user.totalPoints,
          profileImageUrl: user.profileImageUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
          userDetails: null,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to process registration request",
      });
    }
  },

  // GET /auth/callback
  callback: async (req: Request, res: Response): Promise<void> => {
    try {
      // This would handle OAuth callback from Asgardeo
      // For now, we'll return a simple response
      
      const { code, state } = req.query;

      if (!code) {
        res.status(400).json({
          success: false,
          error: "Missing authorization code",
          message: "OAuth callback requires an authorization code",
        });
        return;
      }

      // In production, you would:
      // 1. Exchange code for access token
      // 2. Get user info from OAuth provider
      // 3. Create or update user in database
      // 4. Generate your own JWT token

      res.status(200).json({
        success: true,
        message: "OAuth callback received",
        data: { code, state },
      });
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to process OAuth callback",
      });
    }
  },
};
