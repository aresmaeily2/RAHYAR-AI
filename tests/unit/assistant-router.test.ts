// ─── آزمون مسیریاب نیت قطعی فارسی (بخش ۶ و ۷ دستور) ─────────
// اصل: اگر مدل لازم نیست، مدل فراخوانی نمی‌شود.
import { describe, expect, test } from 'bun:test'
import { detectIntent } from '@/lib/assistant/router'

describe('detectIntent — ثبت کار قطعی', () => {
  test('«بذار فردا ساعت ۹ به خرید بروم» → add_task با پارس کامل', () => {
    const d = detectIntent('بذار فردا ساعت ۹ به خرید بروم')
    expect(d.kind).toBe('add_task')
    if (d.kind === 'add_task') {
      expect(d.parsed.title).toContain('خرید')
      expect(d.parsed.dueDate).toBeDefined()
      expect(d.parsed.dueTime).toBe('09:00')
    }
  })

  test('«اضافه کن: تماس با دکتر فوری» → add_task با اولویت ۱', () => {
    const d = detectIntent('اضافه کن: تماس با دکتر فوری')
    expect(d.kind).toBe('add_task')
    if (d.kind === 'add_task') {
      expect(d.parsed.priority).toBe(1)
      expect(d.parsed.title).toContain('تماس')
    }
  })

  test('یادآوری مسیر مدل است نه ثبت کار قطعی', () => {
    const d = detectIntent('بذار یادم بندازی فردا ساعت ۵ قرص بخورم')
    // فعل یادآوری غالب است — نباید add_task قطعی شود
    expect(d.kind).not.toBe('add_task')
  })

  test('متن خالی/کوتاه → مدل', () => {
    expect(detectIntent('').kind).toBe('model')
    expect(detectIntent('a').kind).toBe('model')
  })
})

describe('detectIntent — گزارش روز و لیست (بدون مدل)', () => {
  test('«گزارش امروز چی شد؟» → daily_report', () => {
    expect(detectIntent('گزارش امروز چی شد؟').kind).toBe('daily_report')
  })
  test('«گزارش روزانه بده» → daily_report', () => {
    expect(detectIntent('گزارش روزانه بده').kind).toBe('daily_report')
  })
  test('«کارهای امروز من چیه؟» → list_today', () => {
    expect(detectIntent('کارهای امروز من چیه؟').kind).toBe('list_today')
  })
  test('«چه کارهایی دارم؟» → list_today', () => {
    expect(detectIntent('چه کارهایی دارم؟').kind).toBe('list_today')
  })
  test('«گزارش امروزم را بنویس و کار اضافه کن» → ابهام → مسیر مدل (گارد امنیتی)', () => {
    // فعل ثبت + درخواست گزارش هم‌زمان — قطعی اجرا نمی‌شود
    expect(detectIntent('گزارش امروزم را بنویس و کار جدید اضافه کن').kind).toBe('model')
  })
})

describe('detectIntent — سؤال عمومی → مدل', () => {
  test('سلام و چت معمولی به مدل می‌رود', () => {
    expect(detectIntent('سلام، حالت چطوره؟').kind).toBe('model')
    expect(detectIntent('برنامه امروزم را بچین').kind).toBe('model')
  })
})
