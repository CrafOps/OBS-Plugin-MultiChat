import type { PlatformState } from '../types/protocol.js';

export interface LiveConnector {
  readonly state: PlatformState;
  connect(username: string): Promise<void>;
  stop(): void;
}
