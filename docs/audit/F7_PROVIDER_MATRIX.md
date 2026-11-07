# F7_PROVIDER_MATRIX — ماتریس واقعی ۱۰ Provider + تفکیک خطا

- **چرخه:** F7 · **تاریخ:** 2026-11-07 · **HEAD پایه:** `5630814`


تاریخ آزمون: 2026-11-07 · سرور: :3001 با DB تازه · لاگ: `artifacts/logs/f7/web-ai.log` و `web-ai2.log`
مسیر آزمون: POST `/api/settings/ai/test` با نشست OWNER — همان مسیر UI.

| Provider | نتیجهٔ واقعی F7 | مدل | تأخیر | وضعیت RTM | تفکیک خطا |
|---|---|---|---|---|---|
| local_rules | ✅ پاسخ واقعی: «موتور قواعد محلی فعال است» | local_rules | 0ms | VERIFIED | — |
| ZAI | ✅ **پاسخ واقعی مدل** به «ping» | glm-4-plus | 13511ms | VERIFIED | — |
| OpenAI | «کلید API ثبت نشده است» | gpt-4o-mini | — | BLOCKED | نبود کلید (401 پیش از شبکه) |
| Claude | «کلید API ثبت نشده است» | claude-3-5-haiku | — | BLOCKED | نبود کلید |
| Gemini | «کلید API ثبت نشده است» | gemini-1.5-flash | — | BLOCKED | نبود کلید |
| DeepSeek | «کلید API ثبت نشده است» (بازآزمون پس از پنجرهٔ نرخ) | deepseek-chat | — | BLOCKED | نبود کلید |
| OpenRouter | «کلید API ثبت نشده است» | openrouter/auto | — | BLOCKED | نبود کلید |
| Ollama | «اتصال به سرویس ناموفق بود» | llama3.1 | 4ms | BLOCKED | موتور محلی نصب نیست (سندباکس) |
| LM Studio | «اتصال به سرویس ناموفق بود» | local-model | 2ms | BLOCKED | موتور محلی نصب نیست |
| OpenAI-compatible | «اول آدرس Endpoint سازگار را وارد کن» | — | — | BLOCKED | اعتبارسنجی ورودی |

**قواعد رعایت‌شده:** هیچ ۴۰۱/۴۰۳/۴۲۹/۴۰۰ موفقیت شمرده نشد؛ هر BLOCKED دلیل فنی صریح دارد؛ کلید در چت/گزارش درخواست نمی‌شود (مسیر امن PUT `/api/settings/ai`).

## خطای زمان‌بندی (rate-limit) — اثبات مستقل

- storm `/api/settings/ai/test`: 5×200 سپس 429 (`finance.log` §1)؛ بازآزمون‌های فاصله‌دار پاسخ پاک دادند
- storm ورود اشتباه پس از ری‌استارت: 9×401 سپس 429 (`sec-deep.log` §2) — محدودیت پس از ری‌استارت زنده است

## امنیت کلید — canary مستقل (فیکس F5 بازآزمون شد)

کلید canary `sk-F7-CANARY-7710` از مسیر امن PUT ذخیره شد؛ سپس ۴ مسیر جست‌وجو شد:

| مسیر | نتیجه |
|---|---|
| GET `/api/settings/ai` (masking) | `hasKey=true, mask=••••7710`، **بدون مقدار کامل** |
| GET `/api/data/export` | ۰ مورد canary (فیلتر `ai_key:*`) |
| پیام خطای test-route | ۰ مورد canary |
| لاگ سرور | ۰ مورد canary |

نتیجه: **نشت `ai_key:*` در هیچ‌یک از ۴ مسیر مشاهده نشد** — نسخهٔ فیکس‌شده روی HEAD F7 تأیید مستقل گرفت.

## هزینهٔ هر سرویس (بند مأموریت)

| سرویس | مدل قیمت‌گذاری | وضعیت استفاده در F7 |
|---|---|---|
| ZAI (glm-4-plus) | پولی (توکن‌محور) — در محیط سندباکس از مسیر SDK میزبان | ۲ فراخوانی آزمون؛ **هیچ هزینه‌ای به مالک تحمیل نشد** |
| OpenAI/Claude/Gemini/DeepSeek/OpenRouter | پولی | استفاده‌نشده (بی‌کلید) |
| Ollama/LM Studio | رایگان/خودمیزبان | نصب نبود |
| local_rules | رایگان | آزمون شد |
