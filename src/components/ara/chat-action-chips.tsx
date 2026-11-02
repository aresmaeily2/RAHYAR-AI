'use client'

// ─── چیپ‌های اکشن چت — نمایش نتایج عملیات دستیار ────────────

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Brain, CalendarCheck2, Check, Copy, ListTree, Mail, Star, Sunrise, Timer, Trash2, Wallet } from 'lucide-react'
import { useI18n } from '@/i18n/store'
import type { ChatMessageT, FinanceSummaryView } from '@/lib/types'

/** کارت خلاصهٔ مالی — اعداد واقعی از DB، در واحد نمایش کاربر */
function FinanceChip({ s }: { s: FinanceSummaryView }) {
  const { t, lang } = useI18n()
  const unit = s.currency === 'toman' ? (lang === 'fa' ? 'تومان' : 'toman') : (lang === 'fa' ? 'ریال' : 'rial')
  const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString(lang === 'en' ? 'en-US' : 'fa-IR')
  const rangeLabel = lang === 'fa' ? ({ today: 'امروز', week: 'این هفته', month: 'این ماه' } as const)[s.range] : ({ today: 'today', week: 'this week', month: 'this month' } as const)[s.range]
  const catLabel = (c: string) =>
    lang === 'fa'
      ? ({ food: 'خوراک', transport: 'حمل‌ونقل', shopping: 'خرید', bills: 'قبوض', health: 'سلامت', education: 'آموزش', fun: 'سرگرمی', family: 'خانواده', charity: 'خیریه', other: 'سایر', salary: 'حقوق', freelance: 'فریلنس', gift: 'هدیه', interest: 'سود', sale: 'فروش' } as Record<string, string>)[c] ?? c
      : c
  return (
    <div className="rounded-xl chip-accent px-3 py-2 text-xs">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-primary">
        <Wallet className="h-3.5 w-3.5" />
        {t('خلاصه مالی')} — {rangeLabel}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
        <span>{t('هزینه')}: <b className="text-foreground">{fmt(s.expense)}</b> {unit}</span>
        {s.income > 0 && <span>{t('درآمد')}: <b className="text-foreground">{fmt(s.income)}</b> {unit}</span>}
        <span>{t('تعداد تراکنش')}: {fmt(s.count)}</span>
      </div>
      {s.topCats.length > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground/80">
          {s.topCats.map((c) => `${catLabel(c.category)}: ${fmt(c.total)} ${unit}`).join(lang === 'fa' ? '، ' : ', ')}
        </p>
      )}
    </div>
  )
}

/** کارت پیش‌نویس پیام — هرگز ارسال نمی‌شود؛ فقط نمایش + کپی */
function DraftChip({ draft }: { draft: { recipient: string | null; body: string; channel: string } }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  return (
    <div className="rounded-xl bg-secondary px-3 py-2 text-xs">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-muted-foreground">
        <Mail className="h-3.5 w-3.5" />
        {t('پیش‌نویس پیام')}
        <span className="rounded-full chip-warn px-2 py-0.5 text-[10px]">{t('ارسال نشده — فقط پیش‌نویس')}</span>
      </div>
      {draft.recipient && <p className="mb-0.5 text-muted-foreground">{t('مقصد')}: {draft.recipient}</p>}
      <p className="whitespace-pre-wrap leading-6 text-foreground">{draft.body}</p>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(draft.body).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          })
        }}
        className="mt-1.5 flex items-center gap-1 rounded-lg bg-background px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <Copy className="h-3 w-3" />
        {copied ? t('کپی شد') : t('کپی متن')}
      </button>
    </div>
  )
}

export function ActionChips({ message }: { message: ChatMessageT }) {
  const { t, lang } = useI18n()
  if (message.actions.length === 0) return null
  return (
    <div className="mt-1.5 space-y-1.5">
      {message.actions.map((a, i) => {
        if (a.type === 'add_task' && a.ok && a.task) {
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="flex items-center gap-2 rounded-xl chip-accent px-3 py-2 text-xs"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="flex-1 font-medium">{a.task.title}</span>
              <span className="text-[10px] text-muted-foreground">{t('ثبت شد')}</span>
            </motion.div>
          )
        }
        if (a.type === 'complete_task' && a.ok && a.task) {
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground"
            >
              <Check className="h-3.5 w-3.5 text-primary" />
              <span className="line-through">{a.task.title}</span>
              <span className="ms-auto text-[10px] text-primary">{t('انجام شد')}</span>
            </div>
          )
        }
        if (a.type === 'delete_task' && a.ok) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              {t('کار حذف شد')}
            </div>
          )
        }
        if (a.type === 'star_task' && a.ok && a.task) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl chip-warn px-3 py-2 text-xs">
              <Star className={`h-3.5 w-3.5 ${a.task.starred ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
              <span className="flex-1">{a.task.title}</span>
              <span className="text-[10px] text-muted-foreground">{a.task.starred ? t('ستاره‌دار شد') : t('ستاره برداشته شد')}</span>
            </div>
          )
        }
        if (a.type === 'snooze_task' && a.ok && a.task) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1">{a.task.title}</span>
              <span className="text-[10px] text-muted-foreground">{t('به فردا موکول شد')}</span>
            </div>
          )
        }
        if (a.type === 'plan_day' && a.ok && a.plan) {
          return (
            <div key={i} className="rounded-xl chip-accent px-3 py-2 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-primary">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                {t('برنامه امروز چیده شد')}
              </div>
              <p className="leading-6 text-muted-foreground">{a.plan.summary}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                <Sunrise className="h-3 w-3" />
                {t('در نمای «برنامه» با تایم‌لاین کامل ببین')}
              </p>
            </div>
          )
        }
        if (a.type === 'remember' && a.ok && a.fact) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl chip-accent px-3 py-2 text-xs">
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span className="flex-1">{a.fact}</span>
              <span className="text-[10px] text-muted-foreground">{t('حفظ شد')}</span>
            </div>
          )
        }
        if (a.type === 'forget' && a.ok) {
          return (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <Brain className="h-3.5 w-3.5" />
              {t('فراموش کردم؛ از حافظه‌ام پاک شد')}
            </div>
          )
        }
        if (a.type === 'add_reminder' && a.ok && a.reminder) {
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl chip-warn px-3 py-2 text-xs"
            >
              <Bell className="h-3.5 w-3.5 text-warning" />
              <span className="flex-1">{a.reminder.message}</span>
              <span className="text-[10px] text-muted-foreground" dir="ltr">
                {new Date(a.reminder.remindAt).toLocaleString(lang === 'en' ? 'en-US' : 'fa-IR', {
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )
        }
        if (a.type === 'breakdown_task' && a.ok && a.task) {
          return (
            <div key={i} className="rounded-xl chip-accent px-3 py-2 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-primary">
                <ListTree className="h-3.5 w-3.5" />
                {a.task.title}
              </div>
              <ul className="space-y-1 pr-4 text-muted-foreground">
                {a.task.subtasks.map((s) => (
                  <li key={s.id} className="list-disc">
                    {s.title}
                  </li>
                ))}
              </ul>
            </div>
          )
        }
        if (a.type === 'finance_summary' && a.ok && a.summary) {
          return <FinanceChip key={i} s={a.summary} />
        }
        if (a.type === 'draft_message' && a.ok && a.draft) {
          return <DraftChip key={i} draft={a.draft} />
        }
        // F2-AG (سناریو ۹): چیپ تأیید عملیات حساس — دکمه‌های سریع «بله / انصراف»
        if ((a.type === 'delete_task' || a.type === 'forget') && a.pending) {
          return (
            <div key={i} className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-center gap-1.5 font-medium">
                <Trash2 className="h-3.5 w-3.5" />
                {t('نیاز به تأیید شما')}
              </div>
              <p className="mt-0.5 text-muted-foreground">{a.note}</p>
            </div>
          )
        }
        // F2-AG (سناریو ۷/۸/۱۰): خطاهای قبلاً نامرئی (اکشن نامعتبر، duplicate، خطای اجرا) حالا دیده می‌شوند
        if (a.type === 'unknown') {
          return (
            <div key={i} className="rounded-xl chip-danger px-3 py-2 text-xs">
              {a.note}
            </div>
          )
        }
        if (
          (a.type === 'update_task' ||
            a.type === 'add_task' ||
            a.type === 'complete_task' ||
            a.type === 'breakdown_task' ||
            a.type === 'star_task' ||
            a.type === 'snooze_task' ||
            a.type === 'plan_day' ||
            a.type === 'remember' ||
            a.type === 'forget' ||
            a.type === 'delete_task' ||
            a.type === 'finance_summary' ||
            a.type === 'draft_message') &&
          !a.ok
        ) {
          return (
            <div key={i} className="rounded-xl chip-danger px-3 py-2 text-xs">
              {a.note || t('انجام نشد')}
            </div>
          )
        }
        return null
      })}
    </div>
  )
}
