# جایگزینی بخش generateDailyPlan با نسخه دوزبانه — با انکرهای مطمئن
import re

path = '/home/z/my-project/src/lib/server-ai.ts'
src = open(path, encoding='utf-8').read()

start = src.index('export async function generateDailyPlan')
end = src.index('// ─── اجرای اکشن‌های چت')
old_section = src[start:end]

new_section = '''export async function generateDailyPlan(tasks: TaskT[], userId: string, lang: AppLang = 'fa'): Promise<DailyPlan> {
  const p = tehranParts()
  const sys =
    lang === 'en'
      ? `You are "Rahyar", a smart personal assistant. Build a logical, human daily plan for today for the user.
Current Tehran time: ${p.timeStr}. Today: ${tehranIsoDate()}.
Rules:
- Max 7 time blocks from now until 22:00 (no blocks before now).
- Priority to urgent and near tasks; leave logical gaps and one break/breathing block between them.
- For each block give a short reason (why).
- Return only JSON without fence:
{"summary":"one motivating sentence","focus":"most important task today","blocks":[{"time":"e.g. 10:00-11:30","title":"...","why":"...","taskId":"optional"}],"tip":"one short productivity tip"}`
      : `تو «رهیار» هستی؛ دستیار شخصی هوشمند. برای کاربر یک برنامه امروز منطقی و انسانی بچین.
ساعت فعلی تهران: ${p.timeStr}. امروز: ${tehranIsoDate()}.
قواعد:
- حداکثر ۷ بلاک زمانی از الان تا ۲۲ شب (بلاک‌های قبل از الان را نگذار).
- اولویت با کارهای فوری و نزدیک؛ بین بلاک‌ها فاصله منطقی و یک زمان استراحت/تنفس بگذار.
- برای هر بلاک دلیل کوتاه (why) بیاور.
- فقط JSON بدون fence:
{"summary":"یک جمله خلاصه انگیزشی","focus":"مهم‌ترین کار امروز","blocks":[{"time":"مثل ۱۰:۰۰–۱۱:۳۰","title":"...","why":"...","taskId":"اختیاری"}],"tip":"یک نکته کوتاه بهره‌وری"}`
  const parsed = await gatewayRunJson<DailyPlan>({
    route: '/api/plan',
    task: 'plan',
    userId,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: activeTasksList(tasks) },
    ],
  })
  if (!parsed || !Array.isArray(parsed.blocks)) {
    throw new Error('bad plan')
  }
  return {
    summary: (parsed.summary || pick(lang, 'برنامه امروز آماده است.', "Today's plan is ready.")).slice(0, 200),
    focus: (parsed.focus || '').slice(0, 120),
    blocks: parsed.blocks.slice(0, 8),
    tip: parsed.tip || '',
  }
}

'''

src = src[:start] + new_section + src[end:]
open(path, 'w', encoding='utf-8').write(src)
print('generateDailyPlan replaced OK')
