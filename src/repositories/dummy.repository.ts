import { prisma } from '../config/db.js';
import { CreateDummyInput, UpdateDummyInput } from '../types/index.js';

export const DummyRepository = {
  create: ({ dummyName }: CreateDummyInput) =>
    prisma.dummy.create({ data: { dummyName } }),

  findAll: () => prisma.dummy.findMany(),

  findById: (id: number) =>
    prisma.dummy.findUnique({ where: { id } }),

  update: ({ id, dummyName }: UpdateDummyInput) =>
    prisma.dummy.update({ where: { id }, data: { dummyName } }),

  delete: (id: number) =>
    prisma.dummy.delete({ where: { id } }),
};
