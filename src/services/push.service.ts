import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

// Minimal Expo push service without external SDK to keep deps light
// If you prefer, we can switch to 'expo-server-sdk' later.

const prisma = new PrismaClient();

export type PushData = {
  type: string; // e.g., 'CAMPAIGN_ATTENDANCE'
  [key: string]: unknown;
};

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: PushData;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
};

function isExpoPushToken(token: string): boolean {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

export const PushService = {
  // Store a push token for a user (de-duplicate by token)
  async registerToken(userId: string, token: string, platform?: string) {
    if (!isExpoPushToken(token)) {
      throw new Error('Invalid Expo push token');
    }

    // Upsert via raw SQL to avoid depending on generated Prisma CRUD (works once table exists)
  const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DevicePushToken" (id, "userId", token, platform, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (token)
       DO UPDATE SET "userId" = EXCLUDED."userId", platform = EXCLUDED.platform, "updatedAt" = NOW()`,
      id,
      userId,
      token,
      platform ?? null
    );

    return { success: true } as const;
  },

  async deleteToken(userId: string, token: string) {
    try {
      // Ensure token belongs to the user then delete
      const existing = await prisma.$queryRawUnsafe<Array<{ userId: string }>>(
        'SELECT "userId" FROM "DevicePushToken" WHERE token = $1',
        token
      );
      if (!existing?.[0] || existing[0].userId !== userId) return { success: true };
      await prisma.$executeRawUnsafe('DELETE FROM "DevicePushToken" WHERE token = $1', token);
      return { success: true };
    } catch {
      return { success: false };
    }
  },

  async getUserTokens(userId: string): Promise<string[]> {
    const rows = await prisma.$queryRawUnsafe<{ token: string }[]>
      ('SELECT token FROM "DevicePushToken" WHERE "userId" = $1', userId);
    return (rows || []).map((r) => r.token);
  },

  async sendToTokens(messages: PushMessage[]) {
    if (messages.length === 0) return { success: true } as const;

    const validMessages = messages.filter(m => isExpoPushToken(m.to));
    if (validMessages.length === 0) return { success: true } as const;

    // Expo recommends sending up to ~100 per request; chunk if needed
    const chunkSize = 90;
    const chunks: PushMessage[][] = [];
    for (let i = 0; i < validMessages.length; i += chunkSize) {
      chunks.push(validMessages.slice(i, i + chunkSize));
    }

    const results: Array<{ ok: boolean; data?: unknown; error?: unknown }> = [];

    for (const chunk of chunks) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        const json = await response.json();
        results.push({ ok: true, data: json });
      } catch (error) {
        results.push({ ok: false, error });
      }
    }

    return { success: true, results } as const;
  },

  async sendToUser(userId: string, payload: { title: string; body: string; data?: PushData }) {
    const tokens = await this.getUserTokens(userId);
    if (tokens.length === 0) return { success: true, sent: 0 } as const;

    const messages: PushMessage[] = tokens.map(t => ({
      to: t,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      priority: 'high',
      sound: 'default',
    }));

    const result = await this.sendToTokens(messages);
    return { success: true, sent: tokens.length, result } as const;
  },
};
