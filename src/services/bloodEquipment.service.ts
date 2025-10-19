import { BloodEquipmentRepository } from '../repositories/bloodEquipment.repository.js';

export const BloodEquipmentService = {
  create: BloodEquipmentRepository.create,
  getAll: BloodEquipmentRepository.getAll,
  getById: BloodEquipmentRepository.getById,
  update: BloodEquipmentRepository.update,
  delete: BloodEquipmentRepository.delete,
};
