// GET /api/connections — کاتالوگ اتصال‌ها + وضعیت واقعی هرکدام
// هیچ توکن یا داده بیرونی اینجا وجود ندارد؛ فقط توصیف شفاف برای صفحه رضایت.
import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorizedResponse, AuthRequiredError } from '@/lib/auth'
import { sameOriginOk, forbiddenOrigin } from '@/lib/security'
import { CONNECTIONS } from '@/lib/connections/catalog'

export async function GET(req: NextRequest) {
  if (!sameOriginOk(req)) return forbiddenOrigin()
  try {
    await requireUser(req)
    return NextResponse.json({
      connections: CONNECTIONS.map((c) => ({
        ...c,
        // وضعیت فعال‌سازی در نسخه فعلی: همه غیرفعال و نیازمند پیکربندی مالک
        status: c.status,
      })),
      note: 'هیچ اتصال بیرونی در این نسخه فعال نیست؛ فعال‌سازی هر اتصال نیازمند حساب و مجوز مالک و پیکربندی رسمی ارائه‌دهنده است.',
    })
  } catch (e) {
    if (e instanceof AuthRequiredError) return unauthorizedResponse()
    console.error('GET /api/connections', e)
    return NextResponse.json({ error: 'خطا در دریافت اتصال‌ها' }, { status: 500 })
  }
}
