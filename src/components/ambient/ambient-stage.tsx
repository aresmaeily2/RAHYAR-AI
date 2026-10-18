'use client'

// ─── AmbientStage — تنها نقطه رندر لایه تجربه محیطی ─────────────
// ترکیب ۶ لایه پس‌زمینه زنده + صحنه SVG + ذرات. تمام صفحات فقط
// با سوار کردن این کامپوننت «صحنه» می‌گیرند؛ هیچ صفحه‌ای افکت
// مستقل ندارد. Engine همین‌جا یک‌بار راه‌اندازی می‌شود.

import { useEffect } from 'react'
import { ambient } from '@/lib/ambient/engine'
import { useAppearance } from '@/lib/appearance-store'
import { NatureScene } from './nature-scene'
import { AmbientParticles } from './particles'

export function AmbientStage() {
  const theme = useAppearance((s) => s.theme)
  const hydrate = useAppearance((s) => s.hydrate)

  useEffect(() => {
    // اطمینان از اعمال تم/اکسنت حتی در صفحاتی که اپ‌شل ندارند (ورود)
    hydrate()
    ambient.init()
  }, [hydrate])

  return (
    <div className="amb-stage" aria-hidden="true">
      {/* لایه ۱ + ۳ — مش گرادیان تم و دو نور شناور (ara-ambient موجود) */}
      <div className="ara-ambient" />

      {/* لایه ۵ — تصویر طبیعت واقعی، بسیار محو و کم‌اثر
          img خام عمدی است: فایل ~۳KB وب‌پی است و ران‌تایم next/image
          (~۷۰KB) نمی‌ارزد — تصمیم ثبت‌شده در گزارش پرفورمنس */}
      <div className="amb-layer amb-nature">
        <img src={`/ambient/${theme}.webp`} alt="" draggable={false} className="amb-nature-img" />
      </div>

      {/* لایه ۴ — مه و ابر بسیار محو */}
      <div className="amb-layer amb-mist">
        <i />
        <i />
        <i />
      </div>

      {/* لایه ۶ — نور محیطی وابسته به زمان روز */}
      <div className="amb-layer amb-aura" />

      {/* لایه طبیعت تزئینی — SVG ایستای لبه‌ها */}
      <NatureScene theme={theme} />

      {/* ذرات شخصیت تم — بسیار کم و بسیار آرام */}
      <AmbientParticles theme={theme} />

      {/* لایه ۲ — گرین نویز ثابت (بافت فیلم) */}
      <svg className="amb-layer amb-noise" aria-hidden="true">
        <filter id="amb-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#amb-noise)" />
      </svg>
    </div>
  )
}
