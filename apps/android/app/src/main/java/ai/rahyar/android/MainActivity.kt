package ai.rahyar.android

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.rahyar.android.core.*
import ai.rahyar.android.data.*
import java.time.YearMonth
import java.util.UUID

object ReminderAlarmScheduler {
    const val CHANNEL_ID = "rahyar_reminders"
    private const val TAG = "RahyArReminder"

    fun ensureChannel(ctx: Context) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "RahyAr Reminders", NotificationManager.IMPORTANCE_HIGH)
        )
    }

    fun canScheduleExact(ctx: Context): Boolean {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) am.canScheduleExactAlarms() else true
    }

    fun hasNotificationPermission(ctx: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else true
    }

    fun schedule(ctx: Context, reminderId: Int, triggerAtMillis: Long, title: String): String {
        ensureChannel(ctx)
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(ctx, ReminderAlarmReceiver::class.java)
            .putExtra("title", title)
            .putExtra("reminder_id", reminderId)
        val pi = PendingIntent.getBroadcast(
            ctx, reminderId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
            Log.i(TAG, "Scheduled inexact fallback reminder #$reminderId at $triggerAtMillis")
            "inexact_fallback"
        } else {
            try {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
                Log.i(TAG, "Scheduled exact reminder #$reminderId at $triggerAtMillis")
                "exact"
            } catch (_: SecurityException) {
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi)
                "inexact_fallback"
            }
        }
    }
}

class ReminderAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        ReminderAlarmScheduler.ensureChannel(context)
        val title = intent.getStringExtra("title") ?: "یادآور رهیار"
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val notif = android.app.Notification.Builder(context, ReminderAlarmScheduler.CHANNEL_ID)
            .setContentTitle("رهیار AI")
            .setContentText(title)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setAutoCancel(true)
            .build()
        try {
            nm.notify((System.currentTimeMillis() % 100000).toInt(), notif)
        } catch (_: SecurityException) {
            Log.w("RahyArReminder", "Notification skipped: POST_NOTIFICATIONS not granted")
        }
    }
}

class BootRescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_TIMEZONE_CHANGED) {
            ReminderAlarmScheduler.ensureChannel(context)
            val db = RahyarDbHelper(context.applicationContext)
            val now = System.currentTimeMillis()
            val reminders = db.listReminders().filter { it.enabled && it.triggerAtMillis > now }
            for (r in reminders) {
                ReminderAlarmScheduler.schedule(context, r.id, r.triggerAtMillis, r.title)
            }
            db.appendAudit(
                commandText = "BOOT_RESCHEDULE",
                provider = "os-receiver",
                tier = "L1_SAFE_LOCAL",
                decision = "EXECUTED",
                resultText = "Rescheduled ${reminders.size} reminders on ${intent.action}"
            )
            Log.i("RahyArBoot", "Rescheduled ${reminders.size} reminders on ${intent.action}")
        }
    }
}

data class PendingAgentProposal(
    val command: String,
    val provider: String,
    val tier: RiskTier,
    val actionType: String, // add_task | add_reminder | finance_report | cloud_query
    val extractedTitle: String,
    val summaryFa: String,
    val summaryEn: String,
)

data class CsvDraftPreview(
    val id: String,
    val date: String,
    val kind: String,
    val amountMinor: Long,
    val currency: String,
    val category: String,
    val note: String,
    val isDuplicate: Boolean,
)

class MainActivity : ComponentActivity() {
    private val navRequest = mutableStateOf<String?>(null)
    private val langRequest = mutableStateOf<String?>(null)
    private val themeRequest = mutableStateOf<String?>(null)
    private val motionRequest = mutableStateOf<String?>(null)
    private val demoSeedRequest = mutableStateOf(false)

    private fun handleIntentExtras(intent: Intent?) {
        intent ?: return
        intent.getStringExtra("start_tab")?.let { navRequest.value = it }
        intent.getStringExtra("set_lang")?.let { langRequest.value = it }
        intent.getStringExtra("set_theme")?.let { themeRequest.value = it }
        intent.getStringExtra("set_reduced_motion")?.let { motionRequest.value = it }
        if (intent.getBooleanExtra("seed_acceptance_data", false)) {
            demoSeedRequest.value = true
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntentExtras(intent)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        handleIntentExtras(intent)
        val db = RahyarDbHelper(applicationContext)

        setContent {
            RahyarApp(
                db = db,
                navRequest = navRequest,
                langRequest = langRequest,
                themeRequest = themeRequest,
                motionRequest = motionRequest,
                demoSeedRequest = demoSeedRequest,
            )
        }
    }
}

@Composable
private fun RahyarApp(
    db: RahyarDbHelper,
    navRequest: MutableState<String?>,
    langRequest: MutableState<String?>,
    themeRequest: MutableState<String?>,
    motionRequest: MutableState<String?>,
    demoSeedRequest: MutableState<Boolean>,
) {
    val ctx = LocalContext.current

    // Persisted Preferences
    var isFa by remember { mutableStateOf(db.getPref("locale", "fa") == "fa") }
    var isDark by remember { mutableStateOf(db.getPref("theme", "dark") == "dark") }
    var reducedMotion by remember { mutableStateOf(db.getPref("reduced_motion", "false") == "true") }
    var killSwitch by remember { mutableStateOf(db.getPref("kill_switch", "false") == "true") }
    var paidFallback by remember { mutableStateOf(db.getPref("paid_fallback", "false") == "true") }
    var selectedProvider by remember { mutableStateOf(db.getPref("provider", "local_tier0")) }
    var selectedTab by remember { mutableStateOf("home") }

    // Persisted Domain State
    var tasks by remember { mutableStateOf(db.listTasks()) }
    var reminders by remember { mutableStateOf(db.listReminders()) }
    var accounts by remember { mutableStateOf(db.listAccounts()) }
    var txs by remember { mutableStateOf(db.listTxs()) }
    var audits by remember { mutableStateOf(db.listAudits()) }
    var statusBanner by remember { mutableStateOf("") }

    fun reloadAll() {
        tasks = db.listTasks()
        reminders = db.listReminders()
        accounts = db.listAccounts()
        txs = db.listTxs()
        audits = db.listAudits()
    }

    // Apply incoming intent directives (for navigation & QA verification)
    LaunchedEffect(navRequest.value, langRequest.value, themeRequest.value, motionRequest.value, demoSeedRequest.value) {
        navRequest.value?.let {
            selectedTab = it
            navRequest.value = null
        }
        langRequest.value?.let {
            isFa = (it == "fa")
            db.setPref("locale", it)
            langRequest.value = null
        }
        themeRequest.value?.let {
            isDark = (it == "dark")
            db.setPref("theme", it)
            themeRequest.value = null
        }
        motionRequest.value?.let {
            reducedMotion = (it == "true")
            db.setPref("reduced_motion", it)
            motionRequest.value = null
        }
        if (demoSeedRequest.value) {
            demoSeedRequest.value = false
            if (db.listAccounts().isEmpty()) {
                db.upsertAccount(FinanceAccount("acc_checking", "حساب جاری آزمایشی", "IRT", 5_000_000L))
                db.upsertAccount(FinanceAccount("acc_savings", "حساب پس‌انداز آزمایشی", "IRT", 2_000_000L))
                db.insertTx(FinanceTx("tx_inc_1", "acc_checking", null, "income", 1_500_000L, "IRT", "salary", "درآمد آزمایشی", "2026-11-25", true))
                db.insertTx(FinanceTx("tx_exp_1", "acc_checking", null, "expense", 400_000L, "IRT", "groceries", "خرید آزمایشی", "2026-11-25", true))
                db.insertTx(FinanceTx("tx_trf_1", "acc_checking", "acc_savings", "transfer", 600_000L, "IRT", "transfer", "انتقال آزمایشی", "2026-11-25", true))
                db.insertTx(FinanceTx("tx_csv_draft", "acc_checking", null, "expense", 250_000L, "IRT", "bills", "قبض برق (در انتظار تأیید)", "2026-11-25", false))
            }
            if (db.listTasks().isEmpty()) {
                db.upsertTask(TaskItem("tsk_qa_1", "بررسی گزارش ماهانه رهیار", "2026-11-26", "todo", "وظیفه آزمایشی QA"))
                db.upsertTask(TaskItem("tsk_qa_2", "تأیید فاکتور آزمایشی", "2026-11-27", "done", ""))
            }
            if (db.listReminders().isEmpty()) {
                val r = db.insertReminder("یادآور آزمایشی پس از ریستارت", System.currentTimeMillis() + 3_600_000L)
                ReminderAlarmScheduler.schedule(ctx, r.id, r.triggerAtMillis, r.title)
            }
            db.appendAudit("وظیفه بررسی گزارش ماهانه اضافه کن", "local_tier0", "L2_STATE_MUTATION", "APPROVED", "Saved task tsk_qa_1 in SQLite")
            reloadAll()
            statusBanner = if (isFa) "داده‌های آزمایشی در SQLite ثبت شد" else "Acceptance test data persisted in SQLite"
        }
    }

    val notifPermLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        statusBanner = if (granted) {
            if (isFa) "مجوز اعلان تأیید شد" else "Notification permission granted"
        } else {
            if (isFa) "مجوز اعلان رد شد" else "Notification permission denied"
        }
    }

    val colorScheme = if (isDark) {
        darkColorScheme(
            primary = Color(0xFF818CF8),
            secondary = Color(0xFF34D399),
            background = Color(0xFF0B0F17),
            surface = Color(0xFF141B29),
            onBackground = Color(0xFFF8FAFC),
            onSurface = Color(0xFFF8FAFC),
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF4F46E5),
            secondary = Color(0xFF059669),
            background = Color(0xFFF8FAFC),
            surface = Color(0xFFFFFFFF),
            onBackground = Color(0xFF0F172A),
            onSurface = Color(0xFF0F172A),
        )
    }

    val dir = if (isFa) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides dir) {
        MaterialTheme(colorScheme = colorScheme) {
            Scaffold(
                topBar = {
                    Surface(tonalElevation = 4.dp, shadowElevation = 2.dp) {
                        Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = if (isFa) "رهیار AI" else "RahyAr AI",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    FilledTonalButton(
                                        onClick = {
                                            isFa = !isFa
                                            db.setPref("locale", if (isFa) "fa" else "en")
                                        },
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        modifier = Modifier.semantics { contentDescription = "btn_toggle_lang" }
                                    ) {
                                        Text(if (isFa) "EN" else "فارسی", fontSize = 12.sp)
                                    }
                                    FilledTonalButton(
                                        onClick = {
                                            isDark = !isDark
                                            db.setPref("theme", if (isDark) "dark" else "light")
                                        },
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        modifier = Modifier.semantics { contentDescription = "btn_toggle_theme" }
                                    ) {
                                        Text(if (isDark) (if (isFa) "روشن" else "Light") else (if (isFa) "تیره" else "Dark"), fontSize = 12.sp)
                                    }
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                            val tabs = listOf(
                                "home" to (if (isFa) "خانه" else "Home"),
                                "calendar" to (if (isFa) "تقویم" else "Calendar"),
                                "tasks" to (if (isFa) "وظایف" else "Tasks"),
                                "finance" to (if (isFa) "مالی" else "Finance"),
                                "agent" to (if (isFa) "دستیار" else "Agent"),
                                "settings" to (if (isFa) "تنظیمات" else "Settings"),
                            )
                            Row(
                                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                tabs.forEach { (id, label) ->
                                    FilterChip(
                                        selected = selectedTab == id,
                                        onClick = { selectedTab = id },
                                        label = { Text(label, maxLines = 1) },
                                        modifier = Modifier.semantics { contentDescription = "tab_$id" }
                                    )
                                }
                            }
                        }
                    }
                }
            ) { pad ->
                Column(
                    Modifier
                        .padding(pad)
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (statusBanner.isNotBlank()) {
                        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)) {
                            Text(
                                statusBanner,
                                Modifier.padding(10.dp),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }

                    when (selectedTab) {
                        "home" -> HomeScreen(isFa, isDark, reducedMotion, killSwitch, tasks, reminders, accounts, txs, onJump = { selectedTab = it })
                        "calendar" -> CalendarScreen(
                            isFa = isFa,
                            tasks = tasks,
                            onQuickAddTask = { title, iso ->
                                db.upsertTask(TaskItem("tsk_${UUID.randomUUID().toString().take(8)}", title, iso, "todo"))
                                reloadAll()
                                statusBanner = if (isFa) "وظیفه برای $iso ثبت شد" else "Task saved for $iso"
                            }
                        )
                        "tasks" -> TasksScreen(
                            isFa = isFa,
                            tasks = tasks,
                            reminders = reminders,
                            hasNotifPerm = ReminderAlarmScheduler.hasNotificationPermission(ctx),
                            canExactAlarm = ReminderAlarmScheduler.canScheduleExact(ctx),
                            onRequestNotif = {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                }
                            },
                            onOpenAlarmSettings = {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                    ctx.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${ctx.packageName}")))
                                }
                            },
                            onAddTask = { title, due ->
                                db.upsertTask(TaskItem("tsk_${UUID.randomUUID().toString().take(8)}", title, due, "todo"))
                                reloadAll()
                                statusBanner = if (isFa) "وظیفه ذخیره شد" else "Task persisted in SQLite"
                            },
                            onToggleTask = { item ->
                                db.upsertTask(item.copy(status = if (item.status == "done") "todo" else "done"))
                                reloadAll()
                            },
                            onEditTask = { item, newTitle ->
                                db.upsertTask(item.copy(title = newTitle))
                                reloadAll()
                            },
                            onDeleteTask = { id ->
                                db.deleteTask(id)
                                reloadAll()
                            },
                            onAddReminder = { title, delayMinutes ->
                                val trigger = System.currentTimeMillis() + delayMinutes * 60_000L
                                val saved = db.insertReminder(title, trigger)
                                val mode = ReminderAlarmScheduler.schedule(ctx, saved.id, saved.triggerAtMillis, saved.title)
                                reloadAll()
                                statusBanner = if (isFa) "یادآور #${saved.id} ثبت شد ($mode)" else "Reminder #${saved.id} scheduled ($mode)"
                            },
                            onDeleteReminder = { id ->
                                db.deleteReminder(id)
                                reloadAll()
                            }
                        )
                        "finance" -> FinanceScreen(
                            isFa = isFa,
                            accounts = accounts,
                            txs = txs,
                            db = db,
                            onDataChanged = { msg ->
                                reloadAll()
                                statusBanner = msg
                            }
                        )
                        "agent" -> AgentScreen(
                            isFa = isFa,
                            killSwitch = killSwitch,
                            paidFallback = paidFallback,
                            selectedProvider = selectedProvider,
                            audits = audits,
                            onToggleKillSwitch = {
                                killSwitch = it
                                db.setPref("kill_switch", it.toString())
                            },
                            onTogglePaid = {
                                paidFallback = it
                                db.setPref("paid_fallback", it.toString())
                            },
                            onSelectProvider = {
                                selectedProvider = it
                                db.setPref("provider", it)
                            },
                            onExecuteApproved = { proposal ->
                                when (proposal.actionType) {
                                    "add_task" -> db.upsertTask(TaskItem("tsk_${UUID.randomUUID().toString().take(8)}", proposal.extractedTitle, "2026-11-26", "todo", "Agent L2"))
                                    "add_reminder" -> {
                                        val r = db.insertReminder(proposal.extractedTitle, System.currentTimeMillis() + 3_600_000L)
                                        ReminderAlarmScheduler.schedule(ctx, r.id, r.triggerAtMillis, r.title)
                                    }
                                }
                                db.appendAudit(proposal.command, proposal.provider, proposal.tier.name, "APPROVED_EXECUTED", proposal.extractedTitle)
                                reloadAll()
                                statusBanner = if (isFa) "فرمان پس از تأیید کاربر اجرا و در SQLite ذخیره شد" else "Approved command executed & persisted"
                            },
                            onRejectProposal = { proposal ->
                                db.appendAudit(proposal.command, proposal.provider, proposal.tier.name, "REJECTED_BY_USER", "No state changed")
                                reloadAll()
                                statusBanner = if (isFa) "پیشنهاد رد شد — هیچ تغییری اعمال نشد" else "Proposal rejected — zero state mutation"
                            },
                            onLogPolicyBlock = { cmd, prov, reason ->
                                db.appendAudit(cmd, prov, "L3_EXTERNAL_DESTRUCTIVE", "BLOCKED", reason)
                                reloadAll()
                                statusBanner = reason
                            }
                        )
                        "settings" -> SettingsScreen(
                            isFa = isFa,
                            isDark = isDark,
                            reducedMotion = reducedMotion,
                            dbPath = ctx.getDatabasePath(RahyarDbHelper.DB_NAME).absolutePath,
                            hasNotifPerm = ReminderAlarmScheduler.hasNotificationPermission(ctx),
                            canExactAlarm = ReminderAlarmScheduler.canScheduleExact(ctx),
                            onSetLang = { fa ->
                                isFa = fa
                                db.setPref("locale", if (fa) "fa" else "en")
                            },
                            onSetTheme = { dark ->
                                isDark = dark
                                db.setPref("theme", if (dark) "dark" else "light")
                            },
                            onSetReducedMotion = { rm ->
                                reducedMotion = rm
                                db.setPref("reduced_motion", rm.toString())
                            },
                            onClearData = {
                                db.clearAllUserData()
                                reloadAll()
                                statusBanner = if (isFa) "داده‌های آزمایشی با موفقیت پاک شدند" else "Local test data cleared"
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeScreen(
    isFa: Boolean,
    isDark: Boolean,
    reducedMotion: Boolean,
    killSwitch: Boolean,
    tasks: List<TaskItem>,
    reminders: List<ReminderItem>,
    accounts: List<FinanceAccount>,
    txs: List<FinanceTx>,
    onJump: (String) -> Unit,
) {
    val today = JalaliCalendar.formatCell(2026, 11, 25, isFa)
    val todayJ = JalaliCalendar.gregorianToJalali(2026, 11, 25)
    val pendingTasks = tasks.count { it.status != "done" }
    val pendingDrafts = txs.count { !it.confirmedByUser }
    val totalConfirmedBalance = accounts.sumOf { FinanceLedger.computeBalanceMinor(it, txs) }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                if (isFa) "داشبورد یکپارچه رهیار (Native Android — SQLite WAL)" else "RahyAr Unified Dashboard (Native Android — SQLite WAL)",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                if (isFa) "امروز: ${JalaliCalendar.toPersianDigits(todayJ.jy)}/${JalaliCalendar.toPersianDigits(todayJ.jm)}/${JalaliCalendar.toPersianDigits(todayJ.jd)} — میلادی: ${today.iso}"
                else "Today: ${today.iso} (Gregorian — Zero Persian Leak)"
            )
            Text(
                if (isFa) "تم: ${if (isDark) "تیره" else "روشن"} | حرکت کاهش‌یافته: ${if (reducedMotion) "فعال" else "غیرفعال"} | Kill-Switch: ${if (killSwitch) "فعال" else "خاموش"}"
                else "Theme: ${if (isDark) "Dark" else "Light"} | Reduced Motion: $reducedMotion | Kill-Switch: ${if (killSwitch) "ON" else "OFF"}",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }

    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Card(Modifier.weight(1f).clickable { onJump("tasks") }) {
            Column(Modifier.padding(12.dp)) {
                Text(if (isFa) "وظایف باز" else "Open Tasks", style = MaterialTheme.typography.labelMedium)
                Text("${if (isFa) JalaliCalendar.toPersianDigits(pendingTasks) else pendingTasks}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                Text(if (isFa) "یادآورها: ${JalaliCalendar.toPersianDigits(reminders.size)}" else "Reminders: ${reminders.size}", style = MaterialTheme.typography.bodySmall)
            }
        }
        Card(Modifier.weight(1f).clickable { onJump("finance") }) {
            Column(Modifier.padding(12.dp)) {
                Text(if (isFa) "مانده تأییدشده" else "Confirmed Balance", style = MaterialTheme.typography.labelMedium)
                Text("$totalConfirmedBalance IRT", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(if (isFa) "صف تأیید CSV: ${JalaliCalendar.toPersianDigits(pendingDrafts)}" else "Pending CSV: $pendingDrafts", style = MaterialTheme.typography.bodySmall)
            }
        }
    }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(if (isFa) "دسترسی سریع" else "Quick Navigation", fontWeight = FontWeight.SemiBold)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { onJump("calendar") }, modifier = Modifier.weight(1f)) { Text(if (isFa) "تقویم" else "Calendar") }
                Button(onClick = { onJump("finance") }, modifier = Modifier.weight(1f)) { Text(if (isFa) "مالی" else "Finance") }
                Button(onClick = { onJump("agent") }, modifier = Modifier.weight(1f)) { Text(if (isFa) "دستیار" else "Agent") }
            }
        }
    }
}

@Composable
private fun CalendarScreen(
    isFa: Boolean,
    tasks: List<TaskItem>,
    onQuickAddTask: (String, String) -> Unit,
) {
    var year by remember { mutableIntStateOf(2026) }
    var month by remember { mutableIntStateOf(11) }
    var selectedDay by remember { mutableIntStateOf(25) }
    var quickTitle by remember { mutableStateOf("") }

    val ym = YearMonth.of(year, month)
    val daysInMonth = ym.lengthOfMonth()
    val safeDay = selectedDay.coerceAtMost(daysInMonth)
    val selectedIso = "%04d-%02d-%02d".format(year, month, safeDay)
    val jSelected = JalaliCalendar.gregorianToJalali(year, month, safeDay)
    val monthNamesEn = listOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                OutlinedButton(onClick = {
                    if (month == 1) { month = 12; year-- } else month--
                }) { Text(if (isFa) "ماه قبل" else "Prev") }

                Text(
                    text = if (isFa) {
                        "شمسی ${JalaliCalendar.toPersianDigits(jSelected.jy)}/${JalaliCalendar.toPersianDigits(jSelected.jm)} (${monthNamesEn[month - 1]} $year)"
                    } else {
                        "${monthNamesEn[month - 1]} $year"
                    },
                    fontWeight = FontWeight.Bold
                )

                OutlinedButton(onClick = {
                    if (month == 12) { month = 1; year++ } else month++
                }) { Text(if (isFa) "ماه بعد" else "Next") }
            }

            // 7-column calendar grid
            val rows = (1..daysInMonth).chunked(7)
            rows.forEach { week ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    week.forEach { d ->
                        val cell = JalaliCalendar.formatCell(year, month, d, isFa)
                        val isSel = d == safeDay
                        val hasTasks = tasks.any { it.dueDate == cell.iso }
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(
                                    if (isSel) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                                    RoundedCornerShape(8.dp)
                                )
                                .border(
                                    width = if (hasTasks) 1.5.dp else 0.5.dp,
                                    color = if (hasTasks) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.outlineVariant,
                                    shape = RoundedCornerShape(8.dp)
                                )
                                .clickable { selectedDay = d }
                                .padding(vertical = 6.dp, horizontal = 2.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(cell.primary, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            if (cell.secondary != null) {
                                Text(cell.secondary, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                    repeat(7 - week.size) { Spacer(Modifier.weight(1f)) }
                }
            }

            HorizontalDivider()
            Text(
                if (isFa) "روز انتخاب‌شده: ${JalaliCalendar.toPersianDigits(jSelected.jy)}/${JalaliCalendar.toPersianDigits(jSelected.jm)}/${JalaliCalendar.toPersianDigits(jSelected.jd)} ($selectedIso)"
                else "Selected Date: $selectedIso",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold
            )

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = quickTitle,
                    onValueChange = { quickTitle = it },
                    label = { Text(if (isFa) "وظیفه برای این روز" else "Task for this date") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                Button(onClick = {
                    if (quickTitle.isNotBlank()) {
                        onQuickAddTask(quickTitle.trim(), selectedIso)
                        quickTitle = ""
                    }
                }) { Text(if (isFa) "ثبت" else "Add") }
            }
        }
    }
}

@Composable
private fun TasksScreen(
    isFa: Boolean,
    tasks: List<TaskItem>,
    reminders: List<ReminderItem>,
    hasNotifPerm: Boolean,
    canExactAlarm: Boolean,
    onRequestNotif: () -> Unit,
    onOpenAlarmSettings: () -> Unit,
    onAddTask: (String, String) -> Unit,
    onToggleTask: (TaskItem) -> Unit,
    onEditTask: (TaskItem, String) -> Unit,
    onDeleteTask: (String) -> Unit,
    onAddReminder: (String, Long) -> Unit,
    onDeleteReminder: (Int) -> Unit,
) {
    var title by remember { mutableStateOf("") }
    var due by remember { mutableStateOf("2026-11-26") }
    var remTitle by remember { mutableStateOf("") }
    var editingId by remember { mutableStateOf<String?>(null) }
    var editBuffer by remember { mutableStateOf("") }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (isFa) "مدیریت وظایف (SQLite پایدار)" else "Tasks Manager (Persistent SQLite)", fontWeight = FontWeight.Bold)
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text(if (isFa) "عنوان وظیفه" else "Task title") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = due,
                    onValueChange = { due = it },
                    label = { Text(if (isFa) "سررسید (ISO)" else "Due Date (ISO)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                Button(onClick = {
                    if (title.isNotBlank()) {
                        onAddTask(title.trim(), due.trim().ifBlank { "2026-11-26" })
                        title = ""
                    }
                }) { Text(if (isFa) "ایجاد وظیفه" else "Create") }
            }

            if (tasks.isEmpty()) {
                Text(if (isFa) "هنوز وظیفه‌ای ثبت نشده است." else "No tasks saved yet.", style = MaterialTheme.typography.bodySmall)
            } else {
                tasks.forEach { t ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                        Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            if (editingId == t.id) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    OutlinedTextField(editBuffer, { editBuffer = it }, Modifier.weight(1f), singleLine = true)
                                    Button(onClick = {
                                        if (editBuffer.isNotBlank()) onEditTask(t, editBuffer.trim())
                                        editingId = null
                                    }) { Text(if (isFa) "ذخیره" else "Save") }
                                }
                            } else {
                                Text("[${t.status.uppercase()}] ${t.title}", fontWeight = FontWeight.SemiBold)
                                Text(if (isFa) "سررسید: ${t.dueDate}" else "Due: ${t.dueDate}", style = MaterialTheme.typography.bodySmall)
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    OutlinedButton(onClick = { onToggleTask(t) }) {
                                        Text(if (t.status == "done") (if (isFa) "بازگشایی" else "Reopen") else (if (isFa) "انجام شد" else "Done"))
                                    }
                                    OutlinedButton(onClick = {
                                        editingId = t.id
                                        editBuffer = t.title
                                    }) { Text(if (isFa) "ویرایش" else "Edit") }
                                    OutlinedButton(onClick = { onDeleteTask(t.id) }) { Text(if (isFa) "حذف" else "Delete") }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (isFa) "یادآورها و BootRescheduleReceiver" else "OS Reminders & BootRescheduleReceiver", fontWeight = FontWeight.Bold)
            Text(
                if (isFa) "مجوز اعلان: ${if (hasNotifPerm) "دارد" else "نیاز به تأیید"} | هشدار دقیق: ${if (canExactAlarm) "فعال" else "Fallback ایمن"}"
                else "Notifications: ${if (hasNotifPerm) "Granted" else "Not Granted"} | Exact Alarm: ${if (canExactAlarm) "Allowed" else "Safe Fallback"}",
                style = MaterialTheme.typography.bodySmall
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!hasNotifPerm) OutlinedButton(onClick = onRequestNotif) { Text(if (isFa) "درخواست مجوز اعلان" else "Request Notification") }
                if (!canExactAlarm) OutlinedButton(onClick = onOpenAlarmSettings) { Text(if (isFa) "تنظیم Exact Alarm" else "Exact Alarm Settings") }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = remTitle,
                    onValueChange = { remTitle = it },
                    label = { Text(if (isFa) "عنوان یادآور (۶۰ دقیقه بعد)" else "Reminder title (+60 min)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                Button(onClick = {
                    if (remTitle.isNotBlank()) {
                        onAddReminder(remTitle.trim(), 60L)
                        remTitle = ""
                    }
                }) { Text(if (isFa) "ثبت یادآور" else "Schedule") }
            }
            reminders.forEach { r ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("#${r.id} • ${r.title}", Modifier.weight(1f))
                    TextButton(onClick = { onDeleteReminder(r.id) }) { Text(if (isFa) "حذف" else "Remove") }
                }
            }
        }
    }
}

@Composable
private fun FinanceScreen(
    isFa: Boolean,
    accounts: List<FinanceAccount>,
    txs: List<FinanceTx>,
    db: RahyarDbHelper,
    onDataChanged: (String) -> Unit,
) {
    var accName by remember { mutableStateOf("") }
    var accOpen by remember { mutableStateOf("1000000") }
    var txAmount by remember { mutableStateOf("250000") }
    var txNote by remember { mutableStateOf("") }
    var csvText by remember {
        mutableStateOf("date,kind,amount_minor,currency,category,note\n2026-11-25,expense,320000,IRT,utilities,Water Bill QA\n2026-11-25,expense,400000,IRT,groceries,خرید آزمایشی")
    }
    var csvPreviews by remember { mutableStateOf<List<CsvDraftPreview>>(emptyList()) }

    val primaryAcc = accounts.firstOrNull()
    val secondAcc = accounts.getOrNull(1)

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (isFa) "حساب‌های مالی (Int64 دقیق — بدون Float)" else "Finance Accounts (Exact Int64 — Zero Float)", fontWeight = FontWeight.Bold)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(accName, { accName = it }, label = { Text(if (isFa) "نام حساب" else "Account") }, modifier = Modifier.weight(1f), singleLine = true)
                OutlinedTextField(accOpen, { accOpen = it }, label = { Text(if (isFa) "موجودی اولیه" else "Opening") }, modifier = Modifier.width(120.dp), singleLine = true)
            }
            Button(onClick = {
                val amt = accOpen.trim().toLongOrNull() ?: 0L
                val name = accName.trim().ifBlank { if (isFa) "حساب جدید" else "New Account" }
                db.upsertAccount(FinanceAccount("acc_${UUID.randomUUID().toString().take(6)}", name, "IRT", amt))
                accName = ""
                onDataChanged(if (isFa) "حساب $name با موجودی $amt ثبت شد" else "Account $name created ($amt IRT)")
            }) { Text(if (isFa) "ایجاد حساب" else "Create Account") }

            accounts.forEach { acc ->
                val bal = FinanceLedger.computeBalanceMinor(acc, txs)
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Row(Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(acc.name, fontWeight = FontWeight.SemiBold)
                        Text("$bal ${acc.currency}", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (isFa) "ثبت درآمد، هزینه و انتقال بین حساب‌ها" else "Income, Expense & Inter-Account Transfer", fontWeight = FontWeight.Bold)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(txAmount, { txAmount = it }, label = { Text(if (isFa) "مبلغ (IRT)" else "Amount") }, modifier = Modifier.width(130.dp), singleLine = true)
                OutlinedTextField(txNote, { txNote = it }, label = { Text(if (isFa) "شرح" else "Note") }, modifier = Modifier.weight(1f), singleLine = true)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Button(
                    enabled = primaryAcc != null,
                    onClick = {
                        val amt = txAmount.trim().toLongOrNull() ?: return@Button
                        db.insertTx(FinanceTx("tx_${UUID.randomUUID().toString().take(8)}", primaryAcc!!.id, null, "income", amt, "IRT", "income", txNote.ifBlank { "درآمد" }, "2026-11-25", true))
                        txNote = ""
                        onDataChanged(if (isFa) "درآمد $amt ثبت شد" else "Income $amt recorded")
                    },
                    modifier = Modifier.weight(1f)
                ) { Text(if (isFa) "درآمد" else "Income", fontSize = 12.sp) }

                Button(
                    enabled = primaryAcc != null,
                    onClick = {
                        val amt = txAmount.trim().toLongOrNull() ?: return@Button
                        db.insertTx(FinanceTx("tx_${UUID.randomUUID().toString().take(8)}", primaryAcc!!.id, null, "expense", amt, "IRT", "expense", txNote.ifBlank { "هزینه" }, "2026-11-25", true))
                        txNote = ""
                        onDataChanged(if (isFa) "هزینه $amt ثبت شد" else "Expense $amt recorded")
                    },
                    modifier = Modifier.weight(1f)
                ) { Text(if (isFa) "هزینه" else "Expense", fontSize = 12.sp) }

                Button(
                    enabled = primaryAcc != null && secondAcc != null,
                    onClick = {
                        val amt = txAmount.trim().toLongOrNull() ?: return@Button
                        db.insertTx(FinanceTx("tx_${UUID.randomUUID().toString().take(8)}", primaryAcc!!.id, secondAcc!!.id, "transfer", amt, "IRT", "transfer", txNote.ifBlank { "انتقال" }, "2026-11-25", true))
                        txNote = ""
                        onDataChanged(if (isFa) "انتقال $amt انجام شد" else "Transfer $amt completed")
                    },
                    modifier = Modifier.weight(1f)
                ) { Text(if (isFa) "انتقال" else "Transfer", fontSize = 12.sp) }
            }
        }
    }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (isFa) "وارد کردن CSV (پیش‌نمایش + تکرارزدایی + صف تأیید)" else "CSV Import (Preview + Dedup + Explicit Approval)", fontWeight = FontWeight.Bold)
            OutlinedTextField(csvText, { csvText = it }, Modifier.fillMaxWidth(), minLines = 3)
            Button(
                enabled = primaryAcc != null,
                onClick = {
                    val accId = primaryAcc!!.id
                    val lines = csvText.lines().drop(1).filter { it.isNotBlank() }
                    csvPreviews = lines.mapNotNull { line ->
                        val p = line.split(",").map { it.trim() }
                        if (p.size < 6) return@mapNotNull null
                        val amt = p[2].toLongOrNull() ?: return@mapNotNull null
                        val hash = FinanceLedger.dedupHash(accId, p[1], amt, p[3], p[0], p[5])
                        val isDup = db.hasDedupHash(hash)
                        CsvDraftPreview("csv_${UUID.randomUUID().toString().take(6)}", p[0], p[1], amt, p[3], p[4], p[5], isDup)
                    }
                    // Queue non-duplicate drafts as unconfirmed (confirmedByUser = false)
                    csvPreviews.filter { !it.isDuplicate }.forEach { d ->
                        db.insertTx(FinanceTx(d.id, accId, null, d.kind, d.amountMinor, d.currency, d.category, d.note, d.date, false))
                    }
                    onDataChanged(if (isFa) "پیش‌نمایش CSV ساخته شد — هیچ مبلغی پیش از تأیید وارد مانده نمی‌شود" else "CSV preview queued — zero balance mutation before explicit approval")
                }
            ) { Text(if (isFa) "پیش‌نمایش و تشخیص تکراری" else "Preview CSV & Detect Duplicates") }

            csvPreviews.filter { it.isDuplicate }.forEach { dup ->
                Text(
                    if (isFa) "تکراری شناسایی شد و مسدود گردید: ${dup.note} (${dup.amountMinor})"
                    else "Duplicate detected & skipped: ${dup.note} (${dup.amountMinor})",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            val pendingDrafts = txs.filter { !it.confirmedByUser }
            if (pendingDrafts.isNotEmpty()) {
                Text(if (isFa) "در انتظار تأیید صریح کاربر (${pendingDrafts.size}):" else "Awaiting Explicit User Approval (${pendingDrafts.size}):", fontWeight = FontWeight.SemiBold)
                pendingDrafts.forEach { d ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)) {
                        Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("${d.kind.uppercase()} • ${d.amountMinor} ${d.currency} • ${d.note}")
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = {
                                    db.confirmTx(d.id)
                                    onDataChanged(if (isFa) "تراکنش تأیید و وارد مانده شد" else "Transaction approved & applied to balance")
                                }) { Text(if (isFa) "تأیید" else "Approve") }
                                OutlinedButton(onClick = {
                                    db.deleteTx(d.id)
                                    onDataChanged(if (isFa) "تراکنش رد و حذف شد" else "Draft rejected & removed")
                                }) { Text(if (isFa) "رد" else "Reject") }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AgentScreen(
    isFa: Boolean,
    killSwitch: Boolean,
    paidFallback: Boolean,
    selectedProvider: String,
    audits: List<AuditItem>,
    onToggleKillSwitch: (Boolean) -> Unit,
    onTogglePaid: (Boolean) -> Unit,
    onSelectProvider: (String) -> Unit,
    onExecuteApproved: (PendingAgentProposal) -> Unit,
    onRejectProposal: (PendingAgentProposal) -> Unit,
    onLogPolicyBlock: (String, String, String) -> Unit,
) {
    var cmd by remember { mutableStateOf("") }
    var proposal by remember { mutableStateOf<PendingAgentProposal?>(null) }
    var errorMsg by remember { mutableStateOf("") }

    val policy = AgentPolicy(userKillSwitch = killSwitch, paidFallbackEnabled = paidFallback)
    val providers = listOf(
        "local_tier0" to (if (isFa) "موتور محلی (Tier 0 — رایگان)" else "Local Rule Engine (Tier 0 — Free)"),
        "ollama_local" to (if (isFa) "Ollama محلی (آفلاین)" else "Ollama Local (Offline)"),
        "cloud_paid" to (if (isFa) "Cloud Paid (مسدود پیش‌فرض)" else "Paid Cloud (Blocked by default)"),
    )

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (isFa) "دستیار هوشمند و حاکمیت مجوز L0–L3" else "AI Agent & L0–L3 Governance", fontWeight = FontWeight.Bold)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(if (isFa) "Kill-Switch فوری (مسدودسازی Cloud)" else "Emergency Kill-Switch (Block Cloud)")
                Switch(checked = killSwitch, onCheckedChange = onToggleKillSwitch)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(if (isFa) "مجوز Provider پولی (خاموش پیش‌فرض)" else "Allow Paid Fallback (Off by default)")
                Switch(checked = paidFallback, onCheckedChange = onTogglePaid)
            }
            Text(if (isFa) "ارائه‌دهنده فعال (Provider):" else "Active Provider:", style = MaterialTheme.typography.labelMedium)
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                providers.forEach { (id, label) ->
                    FilterChip(selected = selectedProvider == id, onClick = { onSelectProvider(id) }, label = { Text(label, fontSize = 11.sp) })
                }
            }
            OutlinedTextField(
                value = cmd,
                onValueChange = { cmd = it },
                label = { Text(if (isFa) "فرمان فارسی یا انگلیسی (مثلاً: یادآور تماس با بانک بذار)" else "Command (e.g. remind me to call bank)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Button(onClick = {
                val text = cmd.trim()
                if (text.isBlank()) return@Button
                errorMsg = ""
                val isPaid = (selectedProvider == "cloud_paid")
                val block = AgentGovernance.checkAllowed(policy, isPaidCloud = isPaid, estCostMicroUsd = if (isPaid) 10_000L else 0L)
                if (block != null) {
                    val msg = if (isFa) "مسدود توسط سیاست امنیتی: $block (هیچ ابزاری اجرا نشد)" else "Blocked by governance policy: $block (zero tool execution)"
                    errorMsg = msg
                    proposal = null
                    onLogPolicyBlock(text, selectedProvider, msg)
                    return@Button
                }
                if (selectedProvider == "ollama_local") {
                    val msg = if (isFa) "ارائه‌دهنده محلی Ollama در دسترس نیست (بدون کرش — حالت آفلاین ایمن)" else "Local Ollama provider unreachable (graceful offline error — no crash)"
                    errorMsg = msg
                    proposal = null
                    onLogPolicyBlock(text, selectedProvider, msg)
                    return@Button
                }
                val isReminder = text.contains("یادآور") || text.lowercase().contains("remind")
                val actionType = if (isReminder) "add_reminder" else "add_task"
                proposal = PendingAgentProposal(
                    command = text,
                    provider = selectedProvider,
                    tier = RiskTier.L2_STATE_MUTATION,
                    actionType = actionType,
                    extractedTitle = text,
                    summaryFa = "پیشنهاد سطح L2 (نیازمند تأیید صریح): ${if (isReminder) "ثبت یادآور" else "ثبت وظیفه"} «$text»",
                    summaryEn = "L2 Proposal (Requires Explicit Approval): ${if (isReminder) "Create Reminder" else "Create Task"} '$text'"
                )
            }) { Text(if (isFa) "تحلیل و پیشنهاد فرمان" else "Analyze & Propose") }

            if (errorMsg.isNotBlank()) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                    Text(errorMsg, Modifier.padding(10.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                }
            }

            proposal?.let { p ->
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                    Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(if (isFa) p.summaryFa else p.summaryEn, fontWeight = FontWeight.SemiBold)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                onExecuteApproved(p)
                                proposal = null
                                cmd = ""
                            }) { Text(if (isFa) "تأیید و اجرا" else "Approve & Execute") }
                            OutlinedButton(onClick = {
                                onRejectProposal(p)
                                proposal = null
                            }) { Text(if (isFa) "رد فرمان" else "Reject") }
                        }
                    }
                }
            }
        }
    }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(if (isFa) "گزارش ممیزی ابزارها (SQLite Audit Log)" else "Tool Governance Audit Log (SQLite)", fontWeight = FontWeight.Bold)
            if (audits.isEmpty()) {
                Text(if (isFa) "هنوز رویدادی ثبت نشده است." else "No audit entries yet.", style = MaterialTheme.typography.bodySmall)
            } else {
                audits.take(6).forEach { a ->
                    Text("[${a.decision}] ${a.tier} • ${a.commandText} → ${a.resultText}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(
    isFa: Boolean,
    isDark: Boolean,
    reducedMotion: Boolean,
    dbPath: String,
    hasNotifPerm: Boolean,
    canExactAlarm: Boolean,
    onSetLang: (Boolean) -> Unit,
    onSetTheme: (Boolean) -> Unit,
    onSetReducedMotion: (Boolean) -> Unit,
    onClearData: () -> Unit,
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(if (isFa) "تنظیمات ظاهری، زبان و دسترس‌پذیری" else "Appearance, Language & Accessibility", fontWeight = FontWeight.Bold)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(if (isFa) "زبان فارسی (RTL)" else "Persian Language (RTL)")
                Switch(checked = isFa, onCheckedChange = onSetLang)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(if (isFa) "حالت تاریک (Dark Mode)" else "Dark Mode")
                Switch(checked = isDark, onCheckedChange = onSetTheme)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(if (isFa) "کاهش انیمیشن (Reduced Motion)" else "Reduced Motion")
                Switch(checked = reducedMotion, onCheckedChange = onSetReducedMotion)
            }
        }
    }

    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(if (isFa) "حریم خصوصی، مجوزها و ذخیره‌سازی محلی" else "Privacy, Permissions & Local Storage", fontWeight = FontWeight.Bold)
            Text(if (isFa) "✓ بدون مجوز RECEIVE_SMS (خواندن پیامک بانکی ممنوع)" else "✓ ZERO RECEIVE_SMS permission (No bank SMS auto-read)", style = MaterialTheme.typography.bodySmall)
            Text(if (isFa) "✓ بدون WebView (۱۰۰٪ بومی Jetpack Compose)" else "✓ ZERO WebView (100% Native Jetpack Compose)", style = MaterialTheme.typography.bodySmall)
            Text(if (isFa) "✓ بدون ارسال خودکار پیامک یا اطلاعات مالی" else "✓ ZERO automatic SMS or financial upload", style = MaterialTheme.typography.bodySmall)
            Text("Notification: $hasNotifPerm | ExactAlarm: $canExactAlarm", style = MaterialTheme.typography.bodySmall)
            Text("SQLite WAL: $dbPath", style = MaterialTheme.typography.bodySmall)
            OutlinedButton(onClick = onClearData) {
                Text(if (isFa) "پاک‌سازی داده‌های آزمایشی" else "Clear Local Test Data")
            }
        }
    }
}
