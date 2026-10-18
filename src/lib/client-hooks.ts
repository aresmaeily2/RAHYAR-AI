'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

/** تشخیص mount بدون setState در effect (الگوی React 19) */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

/** مقدار فقط-کلاینت با جلوگیری از hydration mismatch */
export function useClientValue<T>(get: () => T, initial: T): T {
  return useSyncExternalStore(
    emptySubscribe,
    get,
    () => initial,
  )
}
