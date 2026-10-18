'use client'

import { useEffect } from 'react'

/**
 * لایه موج کلیک رهیار (Ripple) — واگذاری رویداد سراسری روی سطوح `.ara-float`.
 *
 * قواعد مأموریت:
 * - فقط کنترل‌های واقعاً تعاملی که کلاس `.ara-float` دارند موج می‌گیرند؛
 *   آیکون‌های تزئینی هرگز.
 * - انیمیشن فقط transform/opacity است (کم‌هزینه، بدون repaint).
 * - با `prefers-reduced-motion: reduce` و سوییچ کم‌مصرف `ara-no-fx`
 *   کاملاً غیرفعال می‌شود.
 * - روی لمس موبایل همان رفتار pointerdown طبیعی کار می‌کند (بدون وابستگی به hover).
 */
export function AraRippleLayer() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const onPointerDown = (e: PointerEvent) => {
      if (reduced.matches) return
      if (document.documentElement.classList.contains('ara-no-fx')) return
      const host = (e.target as HTMLElement | null)?.closest<HTMLElement>('.ara-float')
      if (!host) return

      const rect = host.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height) * 2.2
      const span = document.createElement('span')
      span.className = 'ara-ripple'
      span.setAttribute('aria-hidden', 'true')
      span.style.width = `${size}px`
      span.style.height = `${size}px`
      span.style.left = `${e.clientX - rect.left - size / 2}px`
      span.style.top = `${e.clientY - rect.top - size / 2}px`
      span.addEventListener('animationend', () => span.remove(), { once: true })
      host.appendChild(span)
    }

    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return null
}
