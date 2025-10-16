import { Response } from 'express';

// Simple in-memory SSE hub keyed by userId
const clients = new Map<string, Set<Response>>();

export const SSE = {
  subscribe(userId: string, res: Response) {
    if (!clients.has(userId)) clients.set(userId, new Set());
    clients.get(userId)!.add(res);

    // Remove on close
    reqOnClose(res, () => {
      SSE.unsubscribe(userId, res);
    });
  },

  unsubscribe(userId: string, res: Response) {
    const set = clients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) clients.delete(userId);
    }
  },

  sendToUser(userId: string, event: string, data: unknown) {
    const set = clients.get(userId);
    if (!set) return 0;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let count = 0;
    for (const res of set) {
      try {
        res.write(payload);
        count++;
      } catch {
        // drop broken client
        set.delete(res);
      }
    }
    if (set.size === 0) clients.delete(userId);
    return count;
  },
};

function reqOnClose(res: Response, cb: () => void) {
  // Express Response extends Node's http.ServerResponse which is an EventEmitter
  (res as unknown as NodeJS.EventEmitter).on('close', cb);
}
