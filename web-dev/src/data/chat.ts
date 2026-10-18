import type { Language } from './project';

export type ChatMessage = {
  id: string;
  platform: 'youtube' | 'tiktok';
  type: string;
  user: { id: string; username: string; displayName: string; avatarUrl?: string };
  message?: string;
  timestamp: number;
  media?: { imageUrl: string };
  messageParts?: Array<{ type: string; text?: string; url?: string; alt?: string }>;
  monetaryEvent?: { giftName?: string; quantity?: number; amount?: number; currency?: string };
};

export function demoMessages(language: Language = 'en'): ChatMessage[] {
  const now = Date.now();
  return [
    {
      id: 'one',
      platform: 'youtube',
      type: 'message',
      user: { id: '1', displayName: 'Luna', username: 'lunaplays' },
      message: language === 'th' ? 'วันนี้ภาพชัดมากเลย ✨' : 'The stream looks great today ✨',
      timestamp: now - 6000,
    },
    {
      id: 'two',
      platform: 'tiktok',
      type: 'message',
      user: { id: '2', displayName: 'Kai', username: 'kaiverse' },
      message: language === 'th' ? 'สวัสดีจาก TikTok 💜' : 'Hello from TikTok 💜',
      timestamp: now - 4000,
    },
    {
      id: 'three',
      platform: 'tiktok',
      type: 'gift',
      user: { id: '3', displayName: 'Mika', username: 'mikastreams' },
      message: language === 'th' ? 'ส่งของขวัญให้กำลังใจ' : 'Thanks for the stream!',
      monetaryEvent: { giftName: 'Rose', quantity: 10 },
      timestamp: now - 2000,
    },
  ];
}
