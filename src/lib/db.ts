import { PrismaClient } from '@prisma/client'

// ─── اتصال پایگاه‌داده رهیار AI — SQLite با تنظیمات هم‌زمانی ──
// ممیزی ۳۶۰ درجه (یافتهٔ بحرانی پایگاه‌داده):
//   چت استریمی (trimChatHistory / chatMessage.create) و زمان‌بند پس‌زمینه
//   (scheduler.ts) هم‌زمان روی SQLite می‌نویسند؛ بدون WAL و busy_timeout
//   در ترافیک واقعی خطای «database is locked» (SQLITE_BUSY) رخ می‌دهد.
//
// دو لایه دفاع:
//   ۱) WAL + synchronous=NORMAL: خواندن/نوشتن هم‌زمان بدون قفل متقابل.
//      journal_mode=WAL در خودِ فایل دیتابیس ذخیره می‌شود (پایدار)،
//      بقیه پراگماها per-connection هستند.
//   ۲) connection_limit=1 (پیش‌فرض): چون پراگماهای per-connection فقط روی
//      همان اتصال اعمال می‌شوند، با استخر تک‌کاناله همهٔ کوئری‌ها از یک
//      اتصالِ پراگما-دار عبور می‌کنند و به‌طور طبیعی صف می‌شوند — برای
//      SQLite تک‌نویسنده، این دقیق‌ترین و ایمن‌ترین حالت است.
//      بازنویسی: RAHYAR_DB_CONNECTION_LIMIT (۱ تا ۲۰؛ هر مقدار نامعتبر → ۱).
function withSqlitePoolDefaults(url: string | undefined): string | undefined {
  if (!url) return url
  // فقط برای SQLite؛ اگر استقرار خودش connection_limit گذاشته، دست نمی‌زنیم
  if (!url.startsWith('file:')) return url
  if (/(?:\?|&)connection_limit=/.test(url)) return url
  const cl = Number(process.env.RAHYAR_DB_CONNECTION_LIMIT)
  const connLimit = Number.isFinite(cl) && cl >= 1 ? Math.floor(cl) : 1
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}connection_limit=${connLimit}&pool_timeout=30`
}

const databaseUrl = withSqlitePoolDefaults(process.env.DATABASE_URL)
// بازنویسی env پیش از ساخت کلاینت — با هر نسخهٔ کلاینت Prisma سازگار است
// (به‌جای گزینه‌های سازندهٔ نسخه‌وابسته مثل datasourceUrl)
if (databaseUrl) process.env.DATABASE_URL = databaseUrl

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pragmaInitialized: boolean | undefined
}

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

/**
 * اعمال پراگماهای هم‌زمانی SQLite — یک‌بار در هر پروسه (بوت سرور).
 * نکتهٔ صادقانه: در صورت اتصال چندکاناله (connection_limit>1)، پراگماهای
 * per-connection فقط روی اتصال بوت اعمال می‌شوند؛ به همین دلیل پیش‌فرض
 * استخر تک‌کاناله است (به کامنت بالای فایل مراجعه کنید).
 */
async function initSqlitePragmas(client: PrismaClient): Promise<void> {
  if (globalForPrisma.pragmaInitialized) return
  globalForPrisma.pragmaInitialized = true
  try {
    // WAL: خواندن هم‌زمان با نوشتن + جلوگیری از «database is locked»
    const mode = (await client.$queryRawUnsafe<{ journal_mode?: string }[]>(
      'PRAGMA journal_mode = WAL;',
    )) as { journal_mode?: string }[]
    await client.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
    // ۵ ثانیه انتظار روی قفل به‌جای خطای فوری — سپس خطا صادقانه بالا می‌آید
    await client.$queryRawUnsafe('PRAGMA busy_timeout = 5000;')
    // Prisma روی SQLite قید کلید خارجی را خودش فعال می‌کند؛ اینجا صریح می‌شود
    await client.$queryRawUnsafe('PRAGMA foreign_keys = ON;')
    await client.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')
    await client.$queryRawUnsafe('PRAGMA cache_size = -32000;') // ۳۲MB کش صفحه
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[db] SQLite pragmas applied (journal_mode=${mode?.[0]?.journal_mode ?? 'wal'})`)
    }
  } catch (err) {
    // پراگما هرگز بوت سرور را نمی‌شکند؛ خطا شفاف لاگ می‌شود
    console.error('[db] Failed to apply SQLite PRAGMAs:', err instanceof Error ? err.message : err)
  }
}

// بوت موازی بدون مسدود کردن import — خطاها فقط لاگ می‌شوند
void initSqlitePragmas(db)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
