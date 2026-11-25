package ai.rahyar.android.core

import java.security.MessageDigest

data class JalaliDate(val jy: Int, val jm: Int, val jd: Int)
data class GregorianDate(val gy: Int, val gm: Int, val gd: Int)
data class CalendarCell(val iso: String, val primary: String, val secondary: String?)

/**
 * الگوریتم مشترک با packages/rahyar-core/src/calendar.ts
 * حالت فارسی: عدد شمسی فارسی بزرگ + عدد میلادی لاتین کوچک
 * حالت انگلیسی: فقط عدد میلادی لاتین (صفر نشت فارسی)
 */
object JalaliCalendar {
    private val leapRem33 = setOf(1, 5, 9, 13, 17, 22, 26, 30)
    private const val EPOCH_JY = 1300
    private val epochJdn = gregorianToJdn(1921, 3, 21)

    fun isJalaliLeap(jy: Int): Boolean = (((jy % 33) + 33) % 33) in leapRem33

    fun jalaliMonthLength(jy: Int, jm: Int): Int = when {
        jm <= 6 -> 31
        jm <= 11 -> 30
        else -> if (isJalaliLeap(jy)) 30 else 29
    }

    fun gregorianToJdn(gy: Int, gm: Int, gd: Int): Int {
        val a = (14 - gm) / 12
        val y = gy + 4800 - a
        val m = gm + 12 * a - 3
        return gd + (153 * m + 2) / 5 + 365 * y + y / 4 - y / 100 + y / 400 - 32045
    }

    fun jdnToGregorian(jdn: Int): GregorianDate {
        val a = jdn + 32044
        val b = (4 * a + 3) / 146097
        val c = a - (146097 * b) / 4
        val d = (4 * c + 3) / 1461
        val e = c - (1461 * d) / 4
        val m = (5 * e + 2) / 153
        val gd = e - (153 * m + 2) / 5 + 1
        val gm = m + 3 - 12 * (m / 10)
        val gy = 100 * b + d - 4800 + (m / 10)
        return GregorianDate(gy, gm, gd)
    }

    fun gregorianToJalali(gy: Int, gm: Int, gd: Int): JalaliDate {
        var diff = gregorianToJdn(gy, gm, gd) - epochJdn
        var jy = EPOCH_JY
        if (diff >= 0) {
            while (true) {
                val yLen = if (isJalaliLeap(jy)) 366 else 365
                if (diff < yLen) break
                diff -= yLen
                jy++
            }
        } else {
            while (diff < 0) {
                jy--
                diff += if (isJalaliLeap(jy)) 366 else 365
            }
        }
        var jm = 1
        while (jm <= 12) {
            val mLen = jalaliMonthLength(jy, jm)
            if (diff < mLen) break
            diff -= mLen
            jm++
        }
        return JalaliDate(jy, jm, diff + 1)
    }

    fun toPersianDigits(n: Int): String = n.toString().map { c ->
        if (c in '0'..'9') ('۰'.code + (c - '0')).toChar() else c
    }.joinToString("")

    fun formatCell(gy: Int, gm: Int, gd: Int, isPersian: Boolean): CalendarCell {
        val iso = "%04d-%02d-%02d".format(gy, gm, gd)
        if (!isPersian) return CalendarCell(iso, gd.toString(), null)
        val j = gregorianToJalali(gy, gm, gd)
        return CalendarCell(iso, toPersianDigits(j.jd), gd.toString())
    }
}

/** Prototype C: دفتر مالی با Long دقیق (Int64 Minor Units — صفر float) + تکرارزدایی و صف تأیید */
data class FinanceAccount(val id: String, val name: String, val currency: String, val openingMinor: Long)
data class FinanceTx(
    val id: String,
    val accountId: String,
    val toAccountId: String?,
    val kind: String, // income | expense | transfer
    val amountMinor: Long,
    val currency: String,
    val category: String,
    val note: String,
    val occurredDate: String,
    val confirmedByUser: Boolean,
)

object FinanceLedger {
    fun computeBalanceMinor(account: FinanceAccount, txs: List<FinanceTx>): Long {
        var bal = account.openingMinor
        for (tx in txs) {
            if (!tx.confirmedByUser) continue
            when (tx.kind) {
                "income" -> if (tx.accountId == account.id) bal += tx.amountMinor
                "expense" -> if (tx.accountId == account.id) bal -= tx.amountMinor
                "transfer" -> {
                    if (tx.accountId == account.id) bal -= tx.amountMinor
                    if (tx.toAccountId == account.id) bal += tx.amountMinor
                }
            }
        }
        return bal
    }

    fun dedupHash(accountId: String, kind: String, amountMinor: Long, currency: String, date: String, note: String): String {
        val raw = "${accountId.lowercase()}|$kind|$amountMinor|$currency|${date.take(10)}|${note.trim().lowercase()}"
        return MessageDigest.getInstance("SHA-256").digest(raw.toByteArray()).joinToString("") { "%02x".format(it) }.take(32)
    }
}

/** Prototype A: کنترل مجوز L0–L3 و Kill-Switch و سقف هزینه روزانه در Android Native */
enum class RiskTier { L0_READ, L1_SAFE_LOCAL, L2_STATE_MUTATION, L3_EXTERNAL_DESTRUCTIVE }

data class AgentPolicy(
    val userKillSwitch: Boolean = false,
    val paidFallbackEnabled: Boolean = false,
    val dailyCapMicroUsd: Long = 200_000L,
    val dailySpentMicroUsd: Long = 0L,
)

object AgentGovernance {
    fun requiresUserApproval(tier: RiskTier): Boolean =
        tier == RiskTier.L2_STATE_MUTATION || tier == RiskTier.L3_EXTERNAL_DESTRUCTIVE

    fun checkAllowed(policy: AgentPolicy, isPaidCloud: Boolean, estCostMicroUsd: Long): String? {
        if (policy.userKillSwitch && isPaidCloud) return "AI_KILL_SWITCH_ACTIVE"
        if (isPaidCloud && estCostMicroUsd > 0 && !policy.paidFallbackEnabled) return "PAID_FALLBACK_BLOCKED"
        if (isPaidCloud && policy.dailySpentMicroUsd + estCostMicroUsd > policy.dailyCapMicroUsd) return "DAILY_COST_CAP_EXCEEDED"
        return null
    }
}
