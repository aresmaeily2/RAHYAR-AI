// /api/download/[file] — دانلود مستقیم فایل‌های تحویلی (APK انتشار)
// امنیت:
//  - فقط نام‌فایل‌های سفید‌لیست‌شده سرو می‌شوند (بدون مسیر، بدون glob)
//  - خواندن فقط از پوشهٔ download پروژه؛ مسیر قابل‌فرار نیست
//  - هدر Content-Disposition: attachment + X-Content-Type-Options
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

// سفید‌لیست دقیق — فقط این نام‌فایل‌ها قابل دانلودند
const WHITELIST: Record<string, string> = {
  'rahyar-user-v2.0.0.apk': 'application/vnd.android.package-archive',
  'rahyar-owner-v2.0.0.apk': 'application/vnd.android.package-archive',
  'rahyar-v2.0.0-sha256.txt': 'text/plain; charset=utf-8',
  'rahyar-v2.0.0-delivery-report.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // کیت امضا فقط به‌صورت رمزنگاری‌شده (AES-256-CBC/PBKDF2) توزیع می‌شود — رمز گشایش فقط در پیام خصوصی به مالک
  'rahyar-release-signing-kit.zip.enc': 'application/octet-stream',
}

const DOWNLOAD_DIR = path.resolve(process.cwd(), 'download')

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params
  const mime = WHITELIST[file]
  if (!mime) {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
  const abs = path.join(DOWNLOAD_DIR, file)
  // دفاع دوگانه: نام نباید از سفید‌لیست خارج شود و فایل باید موجود باشد
  if (path.dirname(abs) !== DOWNLOAD_DIR || !fs.existsSync(abs)) {
    return Response.json({ error: 'not found' }, { status: 404 })
  }
  const stat = fs.statSync(abs)
  if (!stat.isFile()) return Response.json({ error: 'not found' }, { status: 404 })
  const buf = fs.readFileSync(abs)
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${file}"`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    },
  })
}
