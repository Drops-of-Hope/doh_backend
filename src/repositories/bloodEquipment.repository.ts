import { prisma } from '../config/db.js';
import { CreateBloodEquipmentInput, UpdateBloodEquipmentInput } from '../types/index.js';

export const BloodEquipmentRepository = {
  create: (data: CreateBloodEquipmentInput) =>
    prisma.equipment.create({
      data: {
        type: data.type,
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        model: data.model,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        locatedMedEstId: data.locatedMedEstId,
        status: data.status,
      },
      include: {
        medicalEstablishment: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    }),

  getAll: () =>
    prisma.equipment.findMany({
      include: {
        medicalEstablishment: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        calibrationLogs: {
          select: {
            id: true,
            calibrationDate: true,
            result: true,
          },
          orderBy: {
            calibrationDate: 'desc',
          },
          take: 5,
        },
        maintenanceLogs: {
          select: {
            id: true,
            maintenanceDate: true,
            type: true,
          },
          orderBy: {
            maintenanceDate: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    }),

  getById: (id: string) =>
    prisma.equipment.findUnique({
      where: { id },
      include: {
        medicalEstablishment: {
          select: {
            id: true,
            name: true,
            address: true,
            region: true,
            email: true,
          },
        },
        calibrationLogs: {
          orderBy: {
            calibrationDate: 'desc',
          },
        },
        calibrationSchedules: true,
        maintenanceLogs: {
          orderBy: {
            maintenanceDate: 'desc',
          },
        },
        assignments: {
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
              },
            },
          },
        },
      },
    }),

  update: (id: string, data: UpdateBloodEquipmentInput) =>
    prisma.equipment.update({
      where: { id },
      data: {
        type: data.type,
        serialNumber: data.serialNumber,
        manufacturer: data.manufacturer,
        model: data.model,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        locatedMedEstId: data.locatedMedEstId,
        status: data.status,
      },
      include: {
        medicalEstablishment: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    }),

  delete: (id: string) =>
    prisma.equipment.delete({
      where: { id },
    }),
};
