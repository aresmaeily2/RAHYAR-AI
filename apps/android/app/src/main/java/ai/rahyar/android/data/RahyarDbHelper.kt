package ai.rahyar.android.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import ai.rahyar.android.core.FinanceAccount
import ai.rahyar.android.core.FinanceLedger
import ai.rahyar.android.core.FinanceTx

data class TaskItem(
    val id: String,
    val title: String,
    val dueDate: String,
    val status: String, // todo | done
    val notes: String = "",
)

data class ReminderItem(
    val id: Int,
    val title: String,
    val triggerAtMillis: Long,
    val enabled: Boolean,
)

data class AuditItem(
    val id: Long,
    val commandText: String,
    val provider: String,
    val tier: String,
    val decision: String,
    val resultText: String,
    val createdAt: Long,
)

class RahyarDbHelper(context: Context) : SQLiteOpenHelper(context, DB_NAME, null, DB_VERSION) {
    companion object {
        const val DB_NAME = "rahyar_native.db"
        const val DB_VERSION = 1
    }

    override fun onConfigure(db: SQLiteDatabase) {
        super.onConfigure(db)
        db.enableWriteAheadLogging()
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                due_date TEXT NOT NULL,
                status TEXT NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                updated_at INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                trigger_at_millis INTEGER NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS finance_accounts (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                currency TEXT NOT NULL,
                opening_minor INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS finance_txs (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                to_account_id TEXT,
                kind TEXT NOT NULL,
                amount_minor INTEGER NOT NULL,
                currency TEXT NOT NULL,
                category TEXT NOT NULL,
                note TEXT NOT NULL,
                occurred_date TEXT NOT NULL,
                confirmed_by_user INTEGER NOT NULL,
                dedup_hash TEXT NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS agent_audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command_text TEXT NOT NULL,
                provider TEXT NOT NULL,
                tier TEXT NOT NULL,
                decision TEXT NOT NULL,
                result_text TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS app_prefs (
                pref_key TEXT PRIMARY KEY,
                pref_val TEXT NOT NULL
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Non-destructive forward-only schema evolution
    }

    // --- Prefs ---
    fun getPref(key: String, defaultVal: String): String {
        readableDatabase.rawQuery("SELECT pref_val FROM app_prefs WHERE pref_key = ?", arrayOf(key)).use { c ->
            return if (c.moveToFirst()) c.getString(0) else defaultVal
        }
    }

    fun setPref(key: String, value: String) {
        val cv = ContentValues().apply {
            put("pref_key", key)
            put("pref_val", value)
        }
        writableDatabase.insertWithOnConflict("app_prefs", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
    }

    // --- Tasks ---
    fun listTasks(): List<TaskItem> {
        val out = mutableListOf<TaskItem>()
        readableDatabase.rawQuery("SELECT id, title, due_date, status, notes FROM tasks ORDER BY updated_at DESC", null).use { c ->
            while (c.moveToNext()) {
                out.add(TaskItem(c.getString(0), c.getString(1), c.getString(2), c.getString(3), c.getString(4)))
            }
        }
        return out
    }

    fun upsertTask(item: TaskItem) {
        val cv = ContentValues().apply {
            put("id", item.id)
            put("title", item.title)
            put("due_date", item.dueDate)
            put("status", item.status)
            put("notes", item.notes)
            put("updated_at", System.currentTimeMillis())
        }
        writableDatabase.insertWithOnConflict("tasks", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun deleteTask(id: String) {
        writableDatabase.delete("tasks", "id = ?", arrayOf(id))
    }

    // --- Reminders ---
    fun listReminders(): List<ReminderItem> {
        val out = mutableListOf<ReminderItem>()
        readableDatabase.rawQuery("SELECT id, title, trigger_at_millis, enabled FROM reminders ORDER BY trigger_at_millis ASC", null).use { c ->
            while (c.moveToNext()) {
                out.add(ReminderItem(c.getInt(0), c.getString(1), c.getLong(2), c.getInt(3) == 1))
            }
        }
        return out
    }

    fun insertReminder(title: String, triggerAtMillis: Long): ReminderItem {
        val cv = ContentValues().apply {
            put("title", title)
            put("trigger_at_millis", triggerAtMillis)
            put("enabled", 1)
        }
        val rowId = writableDatabase.insert("reminders", null, cv).toInt()
        return ReminderItem(rowId, title, triggerAtMillis, true)
    }

    fun deleteReminder(id: Int) {
        writableDatabase.delete("reminders", "id = ?", arrayOf(id.toString()))
    }

    // --- Finance ---
    fun listAccounts(): List<FinanceAccount> {
        val out = mutableListOf<FinanceAccount>()
        readableDatabase.rawQuery("SELECT id, name, currency, opening_minor FROM finance_accounts ORDER BY id ASC", null).use { c ->
            while (c.moveToNext()) {
                out.add(FinanceAccount(c.getString(0), c.getString(1), c.getString(2), c.getLong(3)))
            }
        }
        return out
    }

    fun upsertAccount(acc: FinanceAccount) {
        val cv = ContentValues().apply {
            put("id", acc.id)
            put("name", acc.name)
            put("currency", acc.currency)
            put("opening_minor", acc.openingMinor)
        }
        writableDatabase.insertWithOnConflict("finance_accounts", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun listTxs(): List<FinanceTx> {
        val out = mutableListOf<FinanceTx>()
        readableDatabase.rawQuery(
            "SELECT id, account_id, to_account_id, kind, amount_minor, currency, category, note, occurred_date, confirmed_by_user FROM finance_txs ORDER BY occurred_date DESC, id DESC",
            null
        ).use { c ->
            while (c.moveToNext()) {
                out.add(
                    FinanceTx(
                        id = c.getString(0),
                        accountId = c.getString(1),
                        toAccountId = if (c.isNull(2)) null else c.getString(2),
                        kind = c.getString(3),
                        amountMinor = c.getLong(4),
                        currency = c.getString(5),
                        category = c.getString(6),
                        note = c.getString(7),
                        occurredDate = c.getString(8),
                        confirmedByUser = c.getInt(9) == 1,
                    )
                )
            }
        }
        return out
    }

    fun hasDedupHash(hash: String): Boolean {
        readableDatabase.rawQuery("SELECT 1 FROM finance_txs WHERE dedup_hash = ? LIMIT 1", arrayOf(hash)).use { c ->
            return c.moveToFirst()
        }
    }

    fun insertTx(tx: FinanceTx): Boolean {
        val hash = FinanceLedger.dedupHash(tx.accountId, tx.kind, tx.amountMinor, tx.currency, tx.occurredDate, tx.note)
        val cv = ContentValues().apply {
            put("id", tx.id)
            put("account_id", tx.accountId)
            put("to_account_id", tx.toAccountId)
            put("kind", tx.kind)
            put("amount_minor", tx.amountMinor)
            put("currency", tx.currency)
            put("category", tx.category)
            put("note", tx.note)
            put("occurred_date", tx.occurredDate)
            put("confirmed_by_user", if (tx.confirmedByUser) 1 else 0)
            put("dedup_hash", hash)
        }
        writableDatabase.insertWithOnConflict("finance_txs", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
        return true
    }

    fun confirmTx(id: String) {
        val cv = ContentValues().apply { put("confirmed_by_user", 1) }
        writableDatabase.update("finance_txs", cv, "id = ?", arrayOf(id))
    }

    fun deleteTx(id: String) {
        writableDatabase.delete("finance_txs", "id = ?", arrayOf(id))
    }

    // --- Agent Audit ---
    fun appendAudit(commandText: String, provider: String, tier: String, decision: String, resultText: String) {
        val cv = ContentValues().apply {
            put("command_text", commandText)
            put("provider", provider)
            put("tier", tier)
            put("decision", decision)
            put("result_text", resultText)
            put("created_at", System.currentTimeMillis())
        }
        writableDatabase.insert("agent_audit", null, cv)
    }

    fun listAudits(): List<AuditItem> {
        val out = mutableListOf<AuditItem>()
        readableDatabase.rawQuery("SELECT id, command_text, provider, tier, decision, result_text, created_at FROM agent_audit ORDER BY id DESC LIMIT 30", null).use { c ->
            while (c.moveToNext()) {
                out.add(AuditItem(c.getLong(0), c.getString(1), c.getString(2), c.getString(3), c.getString(4), c.getString(5), c.getLong(6)))
            }
        }
        return out
    }

    fun clearAllUserData() {
        writableDatabase.beginTransaction()
        try {
            writableDatabase.delete("tasks", null, null)
            writableDatabase.delete("reminders", null, null)
            writableDatabase.delete("finance_accounts", null, null)
            writableDatabase.delete("finance_txs", null, null)
            writableDatabase.delete("agent_audit", null, null)
            writableDatabase.setTransactionSuccessful()
        } finally {
            writableDatabase.endTransaction()
        }
    }
}
