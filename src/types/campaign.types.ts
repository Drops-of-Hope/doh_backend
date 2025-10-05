import { Campaign, MedicalEstablishment, Prisma } from '@prisma/client';

export type CampaignWithRelations = Campaign & {
  medicalEstablishment: MedicalEstablishment;
  organizer: {
    name: string;
    email?: string;
  };
  _count: {
    participations: number;
  };
};

export type CampaignQueryResult = Prisma.CampaignGetPayload<{
  include: {
    medicalEstablishment: true;
    organizer: {
      select: {
        name: true;
        email: true;
      };
    };
    _count: {
      select: {
        participations: true;
      };
    };
  };
}>;

export interface CampaignWhereClause {
  isActive?: boolean;
  startTime?: { gte: Date };
  isApproved?: boolean;
  expectedDonors?: { gte: number };
}

export interface CampaignUpcomingWhereClause {
  isActive: boolean;
  startTime: { gte: Date };
  isApproved: boolean;
  expectedDonors?: { gte: number };
}