import { z } from 'zod';
import { eventSchema } from './protocol.js';

export const relayPacketSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('event'), event: eventSchema }),
  z.object({ kind: z.literal('clear') }),
  z.object({ kind: z.literal('profile'), platform: z.literal('youtube'),
    id: z.string().max(256), user: z.object({
      displayName: z.string().max(256).optional(), username: z.string().max(256).optional()
    }) }),
  z.object({ kind: z.literal('combo'), key: z.string().max(512),
    event: eventSchema, complete: z.boolean() })
]);
