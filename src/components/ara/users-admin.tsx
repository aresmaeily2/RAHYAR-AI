'use client'

// ─── مدیریت کاربران — بخش مالک (مأموریت چندکاربره) ──────────
// ایجاد کاربر، رمز اولیه یک‌بارمصرف، بازنشانی، غیرفعال‌سازی،
// ابطال نشست، حذف، خروجی/ورودی CSV. فقط برای نقش OWNER رندر می‌شود.
// رمزهای اولیه فقط یک‌بار و در همین نشست نمایش داده می‌شوند.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Ban, Copy, Download, KeyRound, Loader2, RefreshCw, Trash2, Upload, UserPlus, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/store'
import { EASE_STANDARD } from './motion'
import { Collapse } from './collapse'

interface UserRow {
  id: string
  username: string
  displayName: string
  role: string
  disabled: boolean
  mustChangePassword: boolean
  activeSessions: number
  createdAt: string
}

export function UsersAdmin() {
  const { t } = useI18n()
  const [isOwner, setIsOwner] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [nUsername, setNUsername] = useState('')
  const [nDisplayName, setNDisplayName] = useState('')
  const [nPassword, setNPassword] = useState('')
  const [genPw, setGenPw] = useState(true)
  const [initialPw, setInitialPw] = useState<{ user: string; pw: string } | null>(null)
  const [bulkPw, setBulkPw] = useState<{ user: string; pw: string }[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await fetch('/api/auth/session').then((r) => r.json())
      const owner = s?.user?.role === 'OWNER'
      setIsOwner(owner)
      if (!owner) return
      const d = await fetch('/api/users').then((r) => r.json())
      setUsers(Array.isArray(d?.users) ? d.users : [])
    } catch {
      /* بی‌صدا — نمایش کارت بدون داده */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createUser() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: nUsername.trim(),
          displayName: nDisplayName.trim() || nUsername.trim(),
          ...(genPw ? { generatePassword: true } : { password: nPassword }),
        }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(t(d?.error) || t('ایجاد کاربر انجام نشد'))
        return
      }
      setInitialPw({ user: d.user.username, pw: d.initialPassword })
      toast.success(t('کاربر ساخته شد — رمز اولیه را کپی کن'))
      setAddOpen(false)
      setNUsername('')
      setNDisplayName('')
      setNPassword('')
      load()
    } finally {
      setBusy(false)
    }
  }

  async function patch(id: string, body: Record<string, unknown>, okMsg: string) {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(t(d?.error) || t('انجام نشد'))
        return
      }
      if (d?.initialPassword) setInitialPw({ user: d.user.username, pw: d.initialPassword })
      toast.success(t(okMsg))
      load()
    } finally {
      setBusy(false)
    }
  }

  async function remove(u: UserRow) {
    if (busy) return
    if (!window.confirm(t('حذف کاربر همه داده‌های او را پاک می‌کند. مطمئنی؟') + ` (${u.username})`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(t(d?.error) || t('حذف انجام نشد'))
        return
      }
      toast.success(t('کاربر حذف شد'))
      load()
    } finally {
      setBusy(false)
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch('/api/users/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'rahyar-users.csv'
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      toast.error(t('خروجی CSV انجام نشد'))
    }
  }

  async function importCsv(file: File) {
    if (busy) return
    setBusy(true)
    try {
      const csv = await file.text()
      const res = await fetch('/api/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const d = await res.json()
      if (!res.ok) {
        toast.error(t(d?.error) || t('ورود گروهی انجام نشد'))
        return
      }
      if (d.created?.length) {
        setBulkPw(d.created.map((c: { username: string; initialPassword: string }) => ({ user: c.username, pw: c.initialPassword })))
      }
      toast.success(
        t('ورود گروهی') + `: ${d.created?.length ?? 0} ✓, ${d.skipped?.length ?? 0} ⏭, ${d.errors?.length ?? 0} ⚠`,
      )
      load()
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="glass-card flex items-center gap-2 rounded-2xl p-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('مدیریت کاربران')}
      </div>
    )
  }
  if (!isOwner) return null

  return (
    <motion.section
      className="glass-card space-y-3 rounded-2xl p-4"
      aria-labelledby="users-admin-title"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-32px' }}
      transition={{ duration: 0.34, ease: EASE_STANDARD }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="users-admin-title" className="flex items-center gap-2 text-sm font-bold">
          <Users className="h-4 w-4 text-primary" /> {t('مدیریت کاربران')}
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
            {t('فقط مالک')}
          </span>
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={exportCsv}
            className="ara-press flex items-center gap-1 rounded-lg border bg-background/50 px-2 py-1 text-[10.5px] hover:bg-secondary"
            title={t('خروجی CSV')}
          >
            <Download className="h-3 w-3" /> CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="ara-press flex items-center gap-1 rounded-lg border bg-background/50 px-2 py-1 text-[10.5px] hover:bg-secondary"
            title={t('ورود گروهی از CSV')}
          >
            <Upload className="h-3 w-3" /> CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importCsv(f)
            }}
          />
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="ara-press flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[10.5px] font-bold text-primary-foreground"
          >
            <UserPlus className="h-3 w-3" /> {t('کاربر جدید')}
          </button>
        </div>
      </div>

      <Collapse open={addOpen}>
        <div className="space-y-2 rounded-xl border bg-background/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              dir="ltr"
              placeholder={t('نام کاربری (لاتین)')}
              value={nUsername}
              onChange={(e) => setNUsername(e.target.value)}
              className="rounded-lg border bg-background/60 px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <input
              placeholder={t('نام نمایشی')}
              value={nDisplayName}
              onChange={(e) => setNDisplayName(e.target.value)}
              className="rounded-lg border bg-background/60 px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={genPw} onChange={(e) => setGenPw(e.target.checked)} className="accent-primary" />
            {t('تولید خودکار رمز اولیه (پیشنهادی)')}
          </label>
          {!genPw && (
            <input
              type="password"
              dir="ltr"
              placeholder={t('رمز اولیه (حداقل ۸ نویسه)')}
              value={nPassword}
              onChange={(e) => setNPassword(e.target.value)}
              className="w-full rounded-lg border bg-background/60 px-3 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          )}
          <button
            onClick={createUser}
            disabled={busy || nUsername.trim().length < 3 || (!genPw && nPassword.length < 8)}
            className="ara-press flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            {t('ایجاد کاربر')}
          </button>
        </div>
      </Collapse>

      {/* نمایش یک‌بارمصرف رمز اولیه */}
      {initialPw && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          <p className="mb-1.5 font-bold">
            {t('رمز اولیه')} — <span dir="ltr">{initialPw.user}</span>
          </p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="flex-1 rounded-lg bg-background/70 px-2.5 py-1.5 font-mono text-[11px]">
              {initialPw.pw}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(initialPw.pw)
                toast.success(t('کپی شد'))
              }}
              className="ara-press rounded-lg border px-2 py-1.5 hover:bg-secondary"
              aria-label={t('کپی رمز')}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {t('این رمز فقط همین یک بار نمایش داده می‌شود؛ کاربر در اولین ورود باید آن را عوض کند.')}
          </p>
          <button onClick={() => setInitialPw(null)} className="mt-1 text-[10px] underline text-muted-foreground">
            {t('دیدم، ببند')}
          </button>
        </div>
      )}

      {/* ورود گروهی — فهرست رمزهای تولیدشده */}
      {bulkPw && bulkPw.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
          <p className="mb-1.5 flex items-center justify-between font-bold">
            {t('رمزهای اولیه تولیدشده')}
            <button
              onClick={() => {
                navigator.clipboard.writeText(bulkPw.map((r) => `${r.user},${r.pw}`).join('\n'))
                toast.success(t('کپی شد'))
              }}
              className="ara-press flex items-center gap-1 rounded-lg border px-2 py-1 hover:bg-secondary"
            >
              <Copy className="h-3 w-3" /> {t('کپی همه')}
            </button>
          </p>
          <div className="max-h-32 overflow-auto rounded-lg bg-background/70 p-2 font-mono text-[10.5px]" dir="ltr">
            {bulkPw.map((r) => (
              <div key={r.user}>
                {r.user},{r.pw}
              </div>
            ))}
          </div>
          <button onClick={() => setBulkPw(null)} className="mt-1 text-[10px] underline text-muted-foreground">
            {t('دیدم، ببند')}
          </button>
        </div>
      )}

      {/* فهرست کاربران */}
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-right text-[11px]">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="px-2.5 py-1.5 font-medium">{t('کاربر')}</th>
              <th className="px-2 py-1.5 font-medium">{t('نقش')}</th>
              <th className="px-2 py-1.5 font-medium">{t('وضعیت')}</th>
              <th className="px-2 py-1.5 font-medium">{t('نشست')}</th>
              <th className="px-2 py-1.5" aria-label={t('عملیات')} />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-2.5 py-1.5">
                  <div className="font-bold" dir="ltr">{u.username}</div>
                  <div className="text-[10px] text-muted-foreground">{u.displayName}</div>
                </td>
                <td className="px-2 py-1.5">{u.role === 'OWNER' ? t('مالک') : t('کاربر')}</td>
                <td className="px-2 py-1.5">
                  {u.disabled ? (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[9.5px] text-destructive">{t('غیرفعال شده')}</span>
                  ) : u.mustChangePassword ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9.5px] text-amber-600">{t('رمز موقت')}</span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9.5px] text-emerald-600">{t('فعال است')}</span>
                  )}
                </td>
                <td className="px-2 py-1.5">{u.activeSessions}</td>
                <td className="px-2 py-1.5">
                  {u.role !== 'OWNER' && (
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => patch(u.id, { generatePassword: true }, 'رمز بازنشانی شد')}
                        className="ara-press rounded-md border p-1 hover:bg-secondary"
                        title={t('بازنشانی رمز')}
                        aria-label={t('بازنشانی رمز')}
                      >
                        <KeyRound className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => patch(u.id, { revokeSessions: true }, 'همه نشست‌ها لغو شد')}
                        className="ara-press rounded-md border p-1 hover:bg-secondary"
                        title={t('لغو نشست‌ها')}
                        aria-label={t('لغو نشست‌ها')}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => patch(u.id, { disabled: !u.disabled }, u.disabled ? 'حساب فعال شد' : 'حساب غیرفعال شد')}
                        className="ara-press rounded-md border p-1 hover:bg-secondary"
                        title={u.disabled ? t('فعال‌سازی') : t('غیرفعال‌سازی')}
                        aria-label={u.disabled ? t('فعال‌سازی') : t('غیرفعال‌سازی')}
                      >
                        <Ban className={`h-3 w-3 ${u.disabled ? 'text-emerald-600' : 'text-amber-600'}`} />
                      </button>
                      <button
                        onClick={() => remove(u)}
                        className="ara-press rounded-md border p-1 hover:bg-destructive/10"
                        title={t('حذف')}
                        aria-label={t('حذف')}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] leading-4 text-muted-foreground">
        {t('همه عملیات حساس در گزارش ممیزی ثبت می‌شود؛ رمزها هرگز در لاگ یا CSV نمی‌آیند.')}
      </p>
    </motion.section>
  )
}
