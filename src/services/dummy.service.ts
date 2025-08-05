import { DummyRepository } from '../repositories/dummy.repository.js';

export const DummyService = {
  createDummy: DummyRepository.create,
  getAllDummies: DummyRepository.findAll,
  getDummyById: DummyRepository.findById,
  updateDummy: DummyRepository.update,
  deleteDummy: DummyRepository.delete,
};
