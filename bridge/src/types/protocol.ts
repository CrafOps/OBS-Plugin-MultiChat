import { z } from 'zod';

export const eventSchema = z.object({
  id: z.string().min(1).max(256),
  platform: z.enum(['youtube', 'tiktok']),
  type: z.enum(['message', 'gift', 'superchat', 'membership', 'follow', 'like', 'join', 'system']),
  user: z.object({
    id: z.string().max(256),
    username: z.string().max(256),
    displayName: z.string().max(256),
    avatarUrl: z.string().url().optional(),
    badges: z.array(z.string().max(80)).max(10).optional()
  }),
  message: z.string().max(4000).optional(),
  timestamp: z.number().finite().nonnegative(),
  monetaryEvent: z.object({
    amount: z.number().finite().optional(),
    currency: z.string().max(16).optional(),
    giftName: z.string().max(256).optional(),
    quantity: z.number().finite().nonnegative().optional()
  }).optional()
});

export type ChatEvent = z.infer<typeof eventSchema>;
export type PlatformState = {
  status: 'disconnected' | 'connecting' | 'connected' | 'offline' | 'error';
  detail: string;
  account?: string;
  title?: string;
  canReply: boolean;
};

export const settingsSchema = z.object({
  tiktokUsername: z.string().regex(/^[\w.]{0,64}$/).default(''),
  tiktokEnabled: z.boolean().default(false),
  autoDetect: z.boolean().default(true),
  autoReconnect: z.boolean().default(true),
  messageLimit: z.number().int().min(50).max(2000).default(500),
  fontSize: z.number().int().min(10).max(28).default(13),
  overlayLimit: z.number().int().min(1).max(50).default(8),
  overlaySeconds: z.number().int().min(5).max(300).default(25),
  blockedWords: z.array(z.string().min(1).max(80)).max(100).default([]),
  enabledTypes: z.array(eventSchema.shape.type).default(['message', 'gift', 'superchat', 'membership']),
  youtubeBroadcastId: z.string().max(128).default('')
});
export type Settings = z.infer<typeof settingsSchema>;
