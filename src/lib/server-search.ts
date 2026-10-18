// ─── جستجوی زنده وب — الگوی Perplexity با مهار امنیتی ────────
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import { safeUrl, globalSearchLimit } from '@/lib/security'
import { aiKillSwitchOn } from '@/lib/ai/gateway'
import type { SourceT } from '@/lib/types'

/**
 * تشخیص قطعی نیاز به اطلاعات روز.
 * فقط پیام‌هایی که به داده زنده وب نیاز دارند جستجو می‌شوند
 * تا تأخیر و هزینه بیهوده نشود.
 */
const SEARCH_TRIGGERS = [
  // اخبار و رویداد
  'اخبار', 'اخبار امروز', 'تازه‌ترین', 'آخرین اخبار', 'خبر', 'چه خبر',
  // قیمت و بازار
  'قیمت', 'نرخ دلار', 'قیمت طلا', 'قیمت سکه', 'ارز', 'بیت‌کوین', 'کریپتو',
  // آب‌وهوا
  'آب و هوا', 'هواشناسی', 'هوا امروز', 'باران', 'دما',
  // دانش روز
  'امروز چند', 'تاریخ امروز', 'جشن', 'تعطیل', 'نتیجه بازی', 'جام', 'فوتبال',
  // صریح
  'جستجو کن', 'سرچ کن', 'در وب', 'در اینترنت', 'گوگل کن',
  // انگلیسی رایج
  'news', 'weather', 'price', 'today',
]

export function shouldSearch(message: string): boolean {
  const m = message.toLowerCase()
  return SEARCH_TRIGGERS.some((t) => m.includes(t))
}

interface RawSearchItem {
  url?: string
  name?: string
  snippet?: string
  host_name?: string
}

export interface WebSearchResult {
  sources: SourceT[]
  context: string
}

/** ثبت مصرف جستجو — فقط فراداده (طول پرس‌وجو/نتیجه، زمان، وضعیت)؛ هیچ متن خصوصی */
async function recordSearchUsage(args: {
  userId: string
  queryChars: number
  outChars: number
  latencyMs: number
  status: string
}): Promise<void> {
  try {
    await db.aiUsage.create({
      data: {
        userId: args.userId,
        route: '/web-search',
        task: 'web_search',
        provider: 'z-ai',
        model: 'web_search',
        inChars: args.queryChars,
        outChars: args.outChars,
        latencyMs: args.latencyMs,
        status: args.status,
        costEst: 0,
      },
    })
  } catch {
    /* ثبت مصرف هرگز مسیر اصلی را نمی‌شکند */
  }
}

/**
 * اجرای جستجو + ساخت زمینه امن برای مدل.
 * همه خروجی‌ها مهار طول می‌شوند و فقط URLهای http/https قبول‌اند (دفاع LLM05).
 * userId برای گیت‌های دروازه (کلید قطع + سقف سراسری + ثبت مصرف) الزامی است.
 */
export async function performWebSearch(userId: string, query: string, limit = 5): Promise<WebSearchResult> {
  const started = Date.now()
  const q = query.slice(0, 300)
  // ۱) کلید قطع اضطراری — جستجوی وب هم قابلیت مدل‌محور است
  if (await aiKillSwitchOn()) return { sources: [], context: '' }
  // ۲) سقف سراسری نمونه — حتی خارج از مدل زبانی
  if (!globalSearchLimit().ok) return { sources: [], context: '' }
  try {
    const zai = await ZAI.create()
    const results = (await zai.functions.invoke('web_search', {
      query: q,
      num: Math.min(limit, 8),
    })) as RawSearchItem[]

    const items = Array.isArray(results) ? results.slice(0, limit) : []
    const sources: SourceT[] = []
    const lines: string[] = []

    for (const item of items) {
      const url = typeof item.url === 'string' ? item.url.trim() : ''
      const title = (item.name ?? '').toString().slice(0, 120)
      const snippet = (item.snippet ?? '').toString().slice(0, 320)
      const host = (item.host_name ?? '').toString().slice(0, 80)
      if (!url || !safeUrl(url) || !title) continue
      sources.push({ title, url, host })
      lines.push(`- «${title}» (${host}): ${snippet}`)
    }

    const context = sources.length === 0 ? '' : lines.join('\n')
    await recordSearchUsage({
      userId,
      queryChars: q.length,
      outChars: context.length,
      latencyMs: Date.now() - started,
      status: 'ok',
    })
    return { sources, context }
  } catch (e) {
    await recordSearchUsage({
      userId,
      queryChars: q.length,
      outChars: 0,
      latencyMs: Date.now() - started,
      status: 'error',
    })
    throw e
  }
}
