import { requireOptionalNativeModule } from 'expo-modules-core';
import type { Offer } from '../../src/domain/model';
export type LiveStatus = { active: boolean; requesting: boolean; overlayAllowed: boolean; message: string; offer: Offer | null; reviewOffer: Offer | null; reviewAgeSeconds: number | null; latencyMs: number };
type OcrModule = {
  recognize(uri: string): Promise<string>;
  getLiveStatus(): LiveStatus;
  openOverlaySettings(): Promise<void>;
  startLive(minPerKm: number, maxMinutes: number): Promise<void>;
  stopLive(): Promise<void>;
};
// Opcional para no romper Expo Go ni iOS/web cuando el módulo no esté compilado.
export default requireOptionalNativeModule<OcrModule>('MargenOcr');
