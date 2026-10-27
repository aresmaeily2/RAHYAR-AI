// ─── اسکیمای اعتبارسنجی اکشن‌های خروجی مدل زبانی ─────────────
// ممیزی ۳۶۰ درجه (یافتهٔ مهم — مهندسی هوش مصنوعی / OWASP LLM05):
// خروجی JSON مدل پیش از رسیدن به دیتابیس با گارد سختگیرانه اعتبارسنجی
// نمی‌شد؛ هر رکورد اکنون باید از Discriminated Union عبور کند وگرنه
// اجرا نمی‌شود و به‌عنوان اقدام ناموفق ثبت می‌گردد.
//
// نکته: این اسکیما عیناً بر پایهٔ قرارداد واقعی اکشن‌ها در
// src/lib/server-ai.ts (executeChatActions) نوشته شده — نه حدس بیرونی.
// محدودیت‌ها هم‌عرض گاردهای موجود است (LLM10: سقف طول/تعداد)، نه سخت‌تر
// از آن‌ها، تا خروجی مشروع مدل رد نشود.
import { z } from 'zod'

/** HH:mm با ساعت ۱–۲ رقمی (مدل گاهی «9:30» می‌فرستد — قابل‌پذیرش است) */
const timePattern = /^([01]?\d|2[0-3]):([0-5]\d)$/

const shortText = z.string().max(200)
const midText = z.string().max(2000)
const tagText = z.string().max(40)
const priorityEnum = z.union([z.literal(1), z.literal(2), z.literal(3)])

export const AssistantActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('add_task'),
    title: shortText,
    notes: midText.optional(),
    tag: tagText.optional(),
    priority: priorityEnum.optional(),
    // dueDate می‌تواند «امروز/فردا/پس‌فردا» یا نام روز هفته یا YYYY-MM-DD باشد —
    // حل قطعی در resolveActionDueDate انجام می‌شود؛ اینجا فقط مهار طول
    dueDate: shortText.optional(),
    dueTime: z.string().regex(timePattern).optional(),
    repeat: z.union([z.literal('daily'), z.literal('weekly')]).optional(),
  }),
  z
    .object({
      type: z.literal('complete_task'),
      taskId: z.string().max(64).optional(),
      title: shortText.optional(),
    })
    .refine((v) => !!v.taskId || !!v.title, {
      message: 'complete_task نیاز به taskId یا title دارد',
    }),
  z
    .object({
      type: z.literal('delete_task'),
      taskId: z.string().max(64).optional(),
      title: shortText.optional(),
    })
    .refine((v) => !!v.taskId || !!v.title, {
      message: 'delete_task نیاز به taskId یا title دارد',
    }),
  z.object({
    type: z.literal('update_task'),
    taskId: z.string().max(64),
    title: shortText.optional(),
    notes: midText.optional(),
    tag: tagText.optional(),
    priority: priorityEnum.optional(),
    dueDate: shortText.optional(),
    dueTime: z.string().regex(timePattern).optional(),
  }),
  z.object({
    type: z.literal('star_task'),
    taskId: z.string().max(64),
    starred: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('snooze_task'),
    taskId: z.string().max(64),
  }),
  z.object({
    type: z.literal('plan_day'),
  }),
  z.object({
    type: z.literal('remember'),
    fact: z.string().min(1).max(300),
  }),
  z.object({
    type: z.literal('forget'),
    fact: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal('add_reminder'),
    message: z.string().min(1).max(300),
    // مدل «YYYY-MM-DDTHH:mm» (به وقت تهران) می‌فرستد؛ ISO کامل هم پذیرفته است —
    // اعتبار زمانی واقعی (گذشته/خیلی دور) در خود اجرا سنجیده می‌شود
    remindAt: z.string().min(10).max(40),
  }),
  z.object({
    type: z.literal('breakdown_task'),
    taskId: z.string().max(64),
  }),
])

export type AssistantAction = z.infer<typeof AssistantActionSchema>

/** پوشش پاسخ مدل: reply + actions (≤۸) + followups (≤۴) — قرارداد پرامپت چت */
export const LlmChatReplySchema = z.object({
  reply: z.string().min(1).max(4000),
  actions: z.array(AssistantActionSchema).max(8).optional().default([]),
  followups: z.array(z.string().min(1).max(80)).max(4).optional().default([]),
})

export interface ValidatedActions {
  /** اکشن‌های معتبر — آمادهٔ اجرا در executeChatActions */
  valid: AssistantAction[]
  /** تعداد ردشده‌ها برای ثبت فراداده */
  rejected: number
}

/**
 * پالایش اکشن‌های خام مدل — تنها دروازهٔ ورود اکشن به اجرا.
 * ورودی غیرآرایه‌ای بی‌خطر است (خالی برمی‌گردد)؛ سقف ۸ اکشن (دفاع LLM10).
 * خروجی: فقط اکشن‌های معتبر — با فیلدهای پالودهٔ Zod (حذف فیلدهای ناشناس).
 */
export function validateChatActions(raw: unknown): ValidatedActions {
  if (!Array.isArray(raw)) return { valid: [], rejected: 0 }
  const capped = raw.slice(0, 8)
  const valid: AssistantAction[] = []
  let rejected = 0
  for (const item of capped) {
    const parsed = AssistantActionSchema.safeParse(item)
    if (parsed.success) {
      valid.push(parsed.data)
    } else {
      rejected++
    }
  }
  return { valid, rejected }
}
