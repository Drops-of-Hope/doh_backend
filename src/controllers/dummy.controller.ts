import { Request, Response } from 'express';
import { DummyService } from '../services/dummy.service.js';

export const DummyController = {
  create: async (req: Request, res: Response) => {
    const { dummyName } = req.body;
    const created = await DummyService.createDummy({ dummyName }); 
    res.status(201).json(created);
  },

  findAll: async (_req: Request, res: Response) => {
    const all = await DummyService.getAllDummies();
    res.json(all);
  },

  findOne: async (req: Request, res: Response) => {
    const id = +req.params.id;
    const dummy = await DummyService.getDummyById(id);

    if (dummy) {
      res.json(dummy);
    } else {
      res.status(404).json({ message: 'Not found' });
    }
  },
  
  update: async (req: Request, res: Response) => {
    const id = +req.params.id;
    const { dummyName } = req.body;
    const updated = await DummyService.updateDummy({ id, dummyName });
    res.json(updated);
  },

  delete: async (req: Request, res: Response) => {
    const id = +req.params.id;
    await DummyService.deleteDummy(id);
    res.status(204).send();
  },
};
