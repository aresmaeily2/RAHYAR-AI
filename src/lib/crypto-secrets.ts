// ─── رمزنگاری پاکتی اسرار کاربر (SEC-06: AES-256-GCM) ─────────
// کلیدهای API ذخیره‌شده در جدول Setting هرگز نباید به‌صورت Plaintext ذخیره شوند.
// قالب ذخیره: enc:v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const PREFIX = 'enc:v1:'
const IV_BYTES = 12
const DEV_FALLBACK_SEED = 'rahyar-dev-ephemeral-key-do-not-use-in-prod'

function deriveKey(overrideSecret?: string): Buffer {
  const raw = overrideSecret ?? process.env.RAHYAR_DATA_KEY ?? ''
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RAHYAR_DATA_KEY is required in production to encrypt/decrypt secrets')
    }
    return createHash('sha256').update(DEV_FALLBACK_SEED).digest()
  }
  return createHash('sha256').update(raw, 'utf8').digest()
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(PREFIX)
}

export function encryptSecret(plaintext: string, overrideSecret?: string): string {
  if (!plaintext) return ''
  if (isEncryptedSecret(plaintext)) return plaintext
  const key = deriveKey(overrideSecret)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

export function decryptSecret(stored: string, overrideSecret?: string): string {
  if (!stored) return ''
  // سازگاری برگشتی با کلیدهای قدیمی ذخیره‌شده پیش از مهاجرت
  if (!isEncryptedSecret(stored)) return stored
  const parts = stored.slice(PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('Malformed encrypted secret envelope')
  const [ivB64, tagB64, ctB64] = parts
  const key = deriveKey(overrideSecret)
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
