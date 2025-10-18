import { EquipmentType } from '@prisma/client';

export interface BloodEquipment {
  id: string;
  type: EquipmentType;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  purchaseDate?: Date;
  warrantyExpiry?: Date;
  locatedMedEstId: string;
  status: string;
}

export interface CreateBloodEquipmentInput {
  type: EquipmentType;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  locatedMedEstId: string;
  status: string;
}

export interface UpdateBloodEquipmentInput {
  type?: EquipmentType;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  locatedMedEstId?: string;
  status?: string;
}
