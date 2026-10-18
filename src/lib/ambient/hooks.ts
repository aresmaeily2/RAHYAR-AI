'use client'

// ─── هوک‌های AmbientEngine — تنها پنجره React به حال محیط ───────
// صفحات با این هوک «وضعیت» را می‌خوانند و با فرمان‌های Engine
// «قصد» را اعلام می‌کنند؛ هرگز مستقیماً افکت نمی‌سازند.

import { useSyncExternalStore } from 'react'
import { ambient } from './engine'
import type { AmbientSnapshot } from './types'

/** عکس لحظه‌ای محیط — واکنشی به تغییر زمان/فصل/تمرکز/جلوه/Orb */
export function useAmbient(): AmbientSnapshot {
  return useSyncExternalStore(ambient.subscribe, ambient.getSnapshot, ambient.getSnapshot)
}

export type { AmbientOrbState } from './types'
