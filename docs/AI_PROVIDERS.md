# معماری AIProvider — نسخه ۱٫۰ رهیار AI

## هدف
هیچ هزینه‌ای بابت هوش مصنوعی؛ توسعه آینده فقط با افزودن Provider؛ بدون وابستگی اختصاصی به هیچ شرکت؛ هیچ API داخل کد Hardcode نشده.

## قرارداد

```
src/lib/ai/providers/
├── types.ts              قرارداد AIProvider + خطاها + اعتبارسنجی URL
├── local-rules.ts        موتور قواعد محلی (پیش‌فرض رایگان؛ بدون مدل/کلید/هزینه)
├── local-rules.ts        موتور قواعد محلی (بدون مدل، بدون هزینه، آفلاین)
├── openai-compatible.ts  هر Endpoint سازگار با OpenAI (کلید کاربر)
└── registry.ts           ثبت‌کننده + resolveEngine(userId) + وضعیت ماسک‌شده
```

```ts
export interface AIProvider {
  readonly id: AiEngineId          // local_rules | openai_compatible
  readonly label: string
  readonly consumesQuota: boolean  // فقط مدل‌های سهمیه‌دار سهمیه می‌سوزانند
  isConfigured(ctx): boolean | Promise<boolean>
  chat(messages, ctx): Promise<{ text: string; model: string }>
  stream?(messages, ctx): Promise<ReadableStream<Uint8Array>>  // SSE سازگار با OpenAI
}
```

Providerهای آینده (OpenAI، Claude، Gemini، DeepSeek، Ollama، LM Studio، OpenRouter، …)
فقط یک فایل با همین رابط + یک خط در `REGISTRY` می‌خواهند.

## موتورهای فعال نسخه ۱٫۰

| موتور | شناسه | هزینه | اینترنت | مصرف سهمیه |
|---|---|---|---|---|
| موتور قواعد محلی | `local_rules` | صفر | نه | نه |
| Endpoint سازگار با OpenAI | `openai_compatible` | کلید خود کاربر | بله | نه (سهمیه پلتفرم نمی‌سوزد) |
| موتور قواعد محلی (پیش‌فرض) | `local_rules` | صفر | خیر | خیر (بدون سهمیه — همیشه فعال) |

**انتخاب موتور**: تنظیمات ← هوش مصنوعی؛ ذخیره در `Setting.ai_engine` (هر کاربر).

## Gateway — تنها نقطه فراخوانی مدل
`src/lib/ai/gateway.ts` اکنون موتور فعال کاربر را از registry می‌خواند:
- ترتیب گاردها: کلید قطع (فقط برای Providerهای مدل) → سقف ورودی → سهمیه (فقط Providerهای سهمیه‌دار) → اجرا (۱ تلاش مجدد گذرا) → ثبت مصرف با `provider/model` واقعی
- خطاهای تازه: `GatewayLocalOnlyError` (موتور محلی، این قابلیت نیاز به مدل دارد) و `GatewayConfigError` (پیام مشخص Endpoint، بدون افشای کلید)
- استریم: `gatewayRunStream()` اکنون `{ stream, providerId }` برمی‌گرداند؛ قالب SSE همان سازگار با OpenAI است

## نکات امنیتی
- کلید Endpoint فقط در DB محلی ذخیره و هرگز به کلاینت برنمی‌گردد (فقط ماسک `••••abcd`)
- URL فقط http/https؛ بدون userinfo؛ مهلت ۳۰ ثانیه؛ سقف ورودی/خروجی
- تست اتصال: `POST /api/settings/ai/test` — درخواست کوچک ping، بدون ذخیره‌سازی

## Local Rules Engine — چه چیزهایی بدون مدل اجرا می‌شود
مدیریت کارها، یادآوری، حافظه، جستجو، دسته‌بندی، Rule Engine نیت‌ها، تقویم، تحلیل مالی، پارسر SMS، برنامه‌ساز قطعی (`assistant/rule-plan.ts`)، تطبیق فازی عنوان (`assistant/match.ts`).
برای قابلیت‌های مدل‌محور در حالت محلی: پاسخ صادقانه و راهنمای تنظیم Endpoint — بدون جعل هوشمندی.
