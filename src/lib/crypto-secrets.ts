// ─── رمزنگاری پاکتی اسرار کاربر با پشتیبانی چرخش کلید (SEC-06: AES-256-GCM) ──
// قالب نسخه ۲ (با شناسه کلید جهت چرخش بدون قطعی):
//   enc:v2:<keyId>:<iv_base64>:<authTag_base64>:<ciphertext_base64>
// قالب نسخه ۱ (سازگاری برگشتی):
//   enc:v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
//
// مدیریت کلید در محیط سرور:
//   - RAHYAR_DATA_KEY: کلید اصلی فعال (حداقل ۳۲ کاراکتر در production؛ ذخیره در Secret Manager/فایل 0600)
//   - RAHYAR_DATA_KEY_ID: شناسه کلید فعال (پیش‌فرض "k1")
//   - RAHYAR_DATA_KEY_PREV: کلید قبلی هنگام چرخش (اختیاری)
//   - RAHYAR_DATA_KEY_RING: نگاشت JSON کلیدهای چندنسخه‌ای {"k1":"...","k2":"..."} (اختیاری)
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const PREFIX_V2 = 'enc:v2:'
const PREFIX_V1 = 'enc:v1:'
const IV_BYTES = 12
const MIN_PROD_KEY_LEN = 32
const DEV_FALLBACK_SEED = 'rahyar-dev-ephemeral-key-do-not-use-in-prod'

export interface SecretKeyConfig {
  activeKeyId?: string
  activeKey?: string
  previousKey?: string
  keyRing?: Record<string, string>
}

function sha256Key(raw: string): Buffer {
  return createHash('sha256').update(raw, 'utf8').digest()
}

function parseEnvKeyRing(): Record<string, string> {
  const raw = process.env.RAHYAR_DATA_KEY_RING
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.length > 0) out[k] = v
      }
      return out
    }
  } catch {
    throw new Error('RAHYAR_DATA_KEY_RING must be valid JSON object mapping keyId -> secret')
  }
  return {}
}

function resolveActiveKey(cfg?: SecretKeyConfig | string): { keyId: string; keyBuf: Buffer } {
  const isProd = process.env.NODE_ENV === 'production'
  if (typeof cfg === 'string') {
    if (isProd && cfg.length < MIN_PROD_KEY_LEN) {
      throw new Error(`RAHYAR_DATA_KEY must be at least ${MIN_PROD_KEY_LEN} characters in production`)
    }
    return { keyId: 'k1', keyBuf: sha256Key(cfg) }
  }
  const keyId = (cfg?.activeKeyId ?? process.env.RAHYAR_DATA_KEY_ID ?? 'k1').replace(/[^a-zA-Z0-9_-]/g, '') || 'k1'
  const ring = { ...parseEnvKeyRing(), ...(cfg?.keyRing ?? {}) }
  const raw = cfg?.activeKey ?? ring[keyId] ?? process.env.RAHYAR_DATA_KEY ?? ''
  if (!raw) {
    if (isProd) {
      throw new Error('RAHYAR_DATA_KEY is required in production to encrypt/decrypt secrets')
    }
    return { keyId, keyBuf: sha256Key(DEV_FALLBACK_SEED) }
  }
  if (isProd && raw.length < MIN_PROD_KEY_LEN) {
    throw new Error(`RAHYAR_DATA_KEY must be at least ${MIN_PROD_KEY_LEN} characters in production`)
  }
  return { keyId, keyBuf: sha256Key(raw) }
}

function resolveCandidateKeys(targetKeyId: string | null, cfg?: SecretKeyConfig | string): Buffer[] {
  const candidates: Buffer[] = []
  const seen = new Set<string>()
  const pushRaw = (raw?: string) => {
    if (!raw || seen.has(raw)) return
    seen.add(raw)
    candidates.push(sha256Key(raw))
  }

  if (typeof cfg === 'string') {
    pushRaw(cfg)
    return candidates
  }

  const ring = { ...parseEnvKeyRing(), ...(cfg?.keyRing ?? {}) }
  if (targetKeyId && ring[targetKeyId]) {
    pushRaw(ring[targetKeyId])
  }
  const active = resolveActiveKey(cfg)
  if (!targetKeyId || targetKeyId === active.keyId) {
    candidates.push(active.keyBuf)
  }
  pushRaw(cfg?.previousKey ?? process.env.RAHYAR_DATA_KEY_PREV)
  for (const v of Object.values(ring)) pushRaw(v)
  if (!candidates.length) candidates.push(active.keyBuf)
  return candidates
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(PREFIX_V2) || value.startsWith(PREFIX_V1)
}

export function getSecretKeyId(stored: string): string | null {
  if (stored.startsWith(PREFIX_V2)) {
    const parts = stored.slice(PREFIX_V2.length).split(':')
    return parts.length === 4 ? parts[0] : null
  }
  if (stored.startsWith(PREFIX_V1)) return 'v1-legacy'
  return null
}

export function encryptSecret(plaintext: string, cfg?: SecretKeyConfig | string): string {
  if (!plaintext) return ''
  if (isEncryptedSecret(plaintext)) return plaintext
  const { keyId, keyBuf } = resolveActiveKey(cfg)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', keyBuf, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX_V2}${keyId}:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

export function decryptSecret(stored: string, cfg?: SecretKeyConfig | string): string {
  if (!stored) return ''
  // سازگاری برگشتی با کلیدهای متنی قدیمی (پیش از مهاجرت به رمزنگاری)
  if (!isEncryptedSecret(stored)) return stored

  let keyId: string | null = null
  let ivB64: string
  let tagB64: string
  let ctB64: string

  if (stored.startsWith(PREFIX_V2)) {
    const parts = stored.slice(PREFIX_V2.length).split(':')
    if (parts.length !== 4) throw new Error('Malformed enc:v2 secret envelope')
    ;[keyId, ivB64, tagB64, ctB64] = parts
  } else {
    const parts = stored.slice(PREFIX_V1.length).split(':')
    if (parts.length !== 3) throw new Error('Malformed enc:v1 secret envelope')
    ;[ivB64, tagB64, ctB64] = parts
  }

  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const keys = resolveCandidateKeys(keyId, cfg)

  for (const keyBuf of keys) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', keyBuf, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
    } catch {
      // تلاش با کلید بعدی در حلقه چرخش (Key Rotation Ring)
    }
  }
  throw new Error(`Secret decryption failed (wrong/missing key or tampered ciphertext; keyId=${keyId ?? 'v1'})`)
}

/** چرخش امن کلید: رمزگشایی با کلید قدیم (یا plaintext قدیمی) و رمزنگاری مجدد با کلید فعال جدید */
export function rotateSecret(stored: string, cfg?: SecretKeyConfig | string): { changed: boolean; value: string } {
  if (!stored) return { changed: false, value: '' }
  const active = resolveActiveKey(cfg)
  const currentKeyId = getSecretKeyId(stored)
  if (stored.startsWith(PREFIX_V2) && currentKeyId === active.keyId) {
    // اطمینان از خوانایی با کلید فعال
    decryptSecret(stored, cfg)
    return { changed: false, value: stored }
  }
  const plain = decryptSecret(stored, cfg)
  return { changed: true, value: encryptSecret(plain, cfg) }
}
