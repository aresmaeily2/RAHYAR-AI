/* رهیار — اسکریپت مشترک رابط محلی.
 * قواعد:
 *  - همهٔ داده‌ها فقط با پل RahyarNative در حافظهٔ محلی اپ ذخیره می‌شوند (LocalStore).
 *  - هیچ درخواستی به هیچ سروری انجام نمی‌شود (بدون fetch/XHR/منبع شبکه).
 *  - نشانگر آنلاین/آفلاین فقط «وضعیت» را نشان می‌دهد؛ هیچ قابلیت محلی به آن وابسته نیست.
 */
(function () {
  'use strict';

  var KEYS = { profile: 'profile', tasks: 'tasks', reminders: 'reminders' };

  var I18N = {
    fa: {
      appName: 'رهیار', home: 'خانه', tasks: 'وظایف', reminders: 'یادآورها', settings: 'تنظیمات',
      online: 'آنلاین', offline: 'آفلاین — قابلیت‌های محلی فعال',
      hello: 'سلام', guest: 'کاربر',
      openTasks: 'وظایف باز', doneTasks: 'انجام‌شده', remindersUp: 'یادآورهای پیش‌رو',
      addTask: 'افزودن وظیفه', taskTitle: 'عنوان وظیفه', taskNote: 'یادداشت (اختیاری)',
      priority: 'اولویت', high: 'زیاد', med: 'متوسط', low: 'کم',
      save: 'ذخیره', cancel: 'انباشتن', delete: 'حذف', done: 'انجام شد', reopen: 'بازگشایی',
      noTasks: 'هنوز وظیفه‌ای ندارید — اولین وظیفه را اضافه کنید.',
      addReminder: 'افزودن یادآور', remTitle: 'عنوان یادآور', remAt: 'زمان', repeat: 'تکرار',
      none: 'بدون تکرار', daily: 'روزانه', weekly: 'هفتگی',
      noReminders: 'یادآوری ثبت نشده است.',
      remNote: 'اعلان سیستم‌عامل در این نسخه فعال نیست؛ یادآورها درون برنامه نمایش داده می‌شوند.',
      yourName: 'نام شما', language: 'زبان', theme: 'پوسته', auto: 'خودکار', light: 'روشن', dark: 'تیره',
      backup: 'پشتیبان‌گیری و بازگردانی', exportBtn: 'اشتراک پشتیبان (متن JSON)',
      importTitle: 'بازگردانی از پشتیبان', importBtn: 'بازگردانی',
      importHint: 'متن JSON پشتیبان را در کادر بچسبانید. اسناد معتبر جایگزین یا افزوده می‌شوند و هیچ دادهٔ محلی بدون پشتیبان پاک نمی‌شود.',
      serverMode: 'اتصال به سرور (اختیاری)', serverDesc: 'نسخهٔ مستقل بدون سرور کامل است. اگر می‌خواهید نسخهٔ وب روی سرور خودتان را باز کنید، وارد شوید؛ این گزینه کاملاً اختیاری است.',
      serverLogin: 'ورود به سرور…', about: 'درباره و قابلیت‌ها',
      aboutDesc: 'رهیار نسخهٔ مستقل اندروید — اجرای کامل بدون هاست و بدون اینترنت.',
      featuresLocal: 'کاملاً محلی (بدون اینترنت):', featuresLocalVal: 'خانه، وظایف، یادآورها (درون‌برنامه‌ای)، تنظیمات، پشتیبان/بازگردانی',
      featuresPerm: 'محلی با مجوز اندروید (در نسخهٔ بعد):', featuresPermVal: 'اعلان یادآورها (نیازمند رضایت کاربر)',
      featuresNet: 'نیازمند اینترنت یا سرویس بیرونی:', featuresNetVal: 'اتصال اختیاری به سرور شما (نسخهٔ وب کامل)، گفتگوی هوش مصنوعی ابری، آب‌وهوا — همهٔ این‌ها اختیاری‌اند؛ هستهٔ اپ بدون آن‌ها کامل است',
      saved: 'ذخیره شد', confirmDelete: 'حذف شود؟', importedN: 'بازگردانی شد: ', importErr: 'پشتیبان نامعتبر است',
      version: 'نسخه', localMode: 'حالت محلی', storageLocal: 'داده‌ها فقط در حافظهٔ خصوصی اپ روی دستگاه ذخیره می‌شوند.'
    },
    en: {
      appName: 'Rahyar', home: 'Home', tasks: 'Tasks', reminders: 'Reminders', settings: 'Settings',
      online: 'Online', offline: 'Offline — local features active',
      hello: 'Hello', guest: 'user',
      openTasks: 'Open tasks', doneTasks: 'Done', remindersUp: 'Upcoming reminders',
      addTask: 'Add task', taskTitle: 'Task title', taskNote: 'Note (optional)',
      priority: 'Priority', high: 'High', med: 'Medium', low: 'Low',
      save: 'Save', cancel: 'Cancel', delete: 'Delete', done: 'Done', reopen: 'Reopen',
      noTasks: 'No tasks yet — add your first task.',
      addReminder: 'Add reminder', remTitle: 'Reminder title', remAt: 'When', repeat: 'Repeat',
      none: 'No repeat', daily: 'Daily', weekly: 'Weekly',
      noReminders: 'No reminders yet.',
      remNote: 'OS notifications are not enabled in this version; reminders are shown inside the app.',
      yourName: 'Your name', language: 'Language', theme: 'Theme', auto: 'Auto', light: 'Light', dark: 'Dark',
      backup: 'Backup & restore', exportBtn: 'Share backup (JSON text)',
      importTitle: 'Restore from backup', importBtn: 'Restore',
      importHint: 'Paste the backup JSON text. Valid documents are added/updated; nothing is deleted without its backup copy.',
      serverMode: 'Server connection (optional)', serverDesc: 'The standalone app is complete without a server. To open your own web version, sign in — fully optional.',
      serverLogin: 'Sign in to server…', about: 'About & features',
      aboutDesc: 'Rahyar standalone Android — runs fully without a host or internet.',
      featuresLocal: 'Fully local (no internet):', featuresLocalVal: 'Home, tasks, in-app reminders, settings, backup/restore',
      featuresPerm: 'Local with Android permission (next release):', featuresPermVal: 'Reminder notifications (requires user consent)',
      featuresNet: 'Needs internet or external service:', featuresNetVal: 'Optional connection to your server (full web edition), cloud AI chat, weather — all optional; the core app is complete without them',
      saved: 'Saved', confirmDelete: 'Delete?', importedN: 'Restored: ', importErr: 'Invalid backup',
      version: 'Version', localMode: 'Local mode', storageLocal: 'Data is stored only in the app-private storage on this device.'
    }
  };

  // ─── پل بومی (sync) ───
  var native = (typeof window.RahyarNative !== 'undefined') ? window.RahyarNative : null;
  function meta() { try { return native ? JSON.parse(native.meta()) : { versionName: '1.2.0', mode: 'local' }; } catch (e) { return { versionName: '1.2.0', mode: 'local' }; } }
  function getDoc(k) { if (!native) return ''; try { return native.getDoc(k) || ''; } catch (e) { return ''; } }
  function putDoc(k, obj) {
    if (!native) return { ok: false, error: 'no_bridge' };
    try { return JSON.parse(native.putDoc(k, JSON.stringify(obj))); } catch (e) { return { ok: false, error: 'exception' }; }
  }

  function readDoc(k, fallback) {
    var raw = getDoc(k);
    if (!raw) return fallback;
    try { var v = JSON.parse(raw); return (v === null || typeof v !== 'object') ? fallback : v; } catch (e) { return fallback; }
  }

  var profile = readDoc(KEYS.profile, { name: '', lang: 'fa', theme: 'auto' });
  var lang = (profile.lang === 'en') ? 'en' : 'fa';

  function t(k) {
    var d = I18N[lang] || I18N.fa;
    return (d[k] !== undefined) ? d[k] : (I18N.fa[k] || k);
  }

  function saveProfile(patch) {
    var p = readDoc(KEYS.profile, { name: '', lang: 'fa', theme: 'auto' });
    for (var key in patch) if (patch.hasOwnProperty(key)) p[key] = patch[key];
    var r = putDoc(KEYS.profile, p);
    if (r && r.ok) profile = p;
    return r;
  }

  function applyShell() {
    var root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
    root.setAttribute('data-theme', profile.theme === 'dark' || profile.theme === 'light' ? profile.theme : 'auto');
    // نشان برند — SVG درون‌خطی (درون APK؛ هیچ منبع شبکه‌ای)
    var hdr = document.querySelector('header.top');
    if (hdr && !document.getElementById('brandmark')) {
      var mark = document.createElement('span');
      mark.className = 'brandmark';
      mark.id = 'brandmark';
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML = '<svg viewBox="0 0 100 100" role="img" aria-label="RahyAr">'
        + '<g stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none">'
        + '<path d="M30,24 H47 A15.5,15.5 0 0 1 47,55 H30 V80"/>'
        + '<path d="M47,55 L66,80"/></g></svg>';
      hdr.insertBefore(mark, hdr.firstChild);
    }
    // چیپ تاریخ دو‌تقویمی — تقویم و تاریخ کاملاً محلی است (بدون شبکه)
    if (document.body.getAttribute('data-page') === 'home' && !document.getElementById('datechip')) {
      var chip = document.createElement('div');
      chip.className = 'datechip';
      chip.id = 'datechip';
      chip.innerHTML = '<span class="jdate" id="dJalali"></span><span class="gdate" id="dGreg"></span>';
      var main = document.querySelector('main');
      if (main) main.insertBefore(chip, main.firstChild);
      paintDates();
    }
    // نشانگر وضعیت شبکه — فقط اطلاع‌رسانی؛ هیچ قابلیتی به آن وابسته نیست
    function paint() {
      var b = document.getElementById('netbadge');
      if (!b) return;
      if (navigator.onLine) { b.textContent = t('online'); b.className = 'badge on'; }
      else { b.textContent = t('offline'); b.className = 'badge off'; }
    }
    window.addEventListener('online', paint);
    window.addEventListener('offline', paint);
    paint();
    // ترجمهٔ عناصر
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.textContent = t(el.getAttribute('data-i18n'));
    }
    // نام صفحات ناوبری
    document.title = t('appName') + ' — ' + t(document.body.getAttribute('data-page') || 'home');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      if (lang === 'fa') {
        try { return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'medium', timeStyle: 'short' }).format(d); }
        catch (e) { return d.toLocaleString('fa-IR'); }
      }
      return d.toLocaleString('en-GB');
    } catch (e) { return iso; }
  }

  /* تاریخ دو‌تقویمی — کاملاً محلی (Intl تقویم هجری شمسی در WebView موجود است) */
  function paintDates() {
    var jEl = document.getElementById('dJalali'), gEl = document.getElementById('dGreg');
    if (!jEl || !gEl) return;
    var now = new Date();
    try {
      jEl.textContent = new Intl.DateTimeFormat(
        lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-u-ca-persian',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    } catch (e) { jEl.textContent = ''; }
    try {
      gEl.textContent = new Intl.DateTimeFormat(
        lang === 'fa' ? 'fa-IR' : 'en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    } catch (e) { gEl.textContent = ''; }
  }

  function uid() { return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ناوبری پایین — فقط لینک نسبی محلی؛ هیچ درخواست شبکه‌ای
  var NAV_ICONS = {
    'index.html': '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/></svg>',
    'tasks.html': '<svg viewBox="0 0 24 24"><path d="M4 6.5 6 8.5 10 4.5"/><path d="M4 17.5 6 19.5 10 15.5"/><path d="M13 7h7M13 18h7"/></svg>',
    'reminders.html': '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7"/><path d="M12 10v3.5l2 1.5"/><path d="M5 4 3.5 5.5M19 4l1.5 1.5"/></svg>',
    'settings.html': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7"/></svg>'
  };
  function buildNav(current) {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var items = [['index.html', 'home'], ['tasks.html', 'tasks'], ['reminders.html', 'reminders'], ['settings.html', 'settings']];
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var href = items[i][0], key = items[i][1];
      html += '<a href="' + href + '"' + (current === href ? ' class="active"' : '') + '>'
        + NAV_ICONS[href] + '<span>' + esc(t(key)) + '</span></a>';
    }
    nav.innerHTML = html;
  }

  function msg(id, okFlag, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.className = 'msg ' + (okFlag ? 'ok' : 'err');
    el.textContent = text;
    setTimeout(function () { el.className = 'msg'; }, 4000);
  }

  window.RH = {
    native: native, meta: meta, t: t, uid: uid, esc: esc, fmtDate: fmtDate, msg: msg,
    getDoc: getDoc, putDoc: putDoc, readDoc: readDoc, saveProfile: saveProfile,
    buildNav: buildNav,
    profile: function () { return profile; }, lang: function () { return lang; },
    KEYS: KEYS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyShell();
      if (typeof window.PAGE_INIT === 'function') window.PAGE_INIT();
    });
  } else {
    applyShell();
    if (typeof window.PAGE_INIT === 'function') window.PAGE_INIT();
  }
})();

/* ═══ F2-VOICE: دستیار صوتی — میکروفون/تشخیص/TTS/فرمان‌های واقعی ═══
 * قواعد حریم خصوصی: شنود فقط با لمس؛ صدا به سرویس گفتار سیستم می‌رود؛
 * هیچ ذخیره یا ارسال صدا انجام نمی‌شود؛ متن فرمان فقط در حافظه پردازش می‌شود. */
(function () {
  'use strict';

  var R = window.RH;
  if (!R) return;
  var native = R.native;
  if (!native) return;

  var V = {
    listening: false,
    busyTts: false,
    wakeOn: false,
    // F7: زبان صوتی کاربر از پروفایل خوانده می‌شود (قبلاً تنظیم فقط ظاهری بود)
    bcp: function () {
      var p = R.profile ? R.profile() : null;
      var vl = p && p.voiceLang;
      if (vl === 'en' || vl === 'fa') return vl === 'en' ? 'en-US' : 'fa-IR';
      return R.lang() === 'en' ? 'en-US' : 'fa-IR';
    },
    // V1 (بند ۵): سرعت خواندن از پروفایل — ۰٫۷ تا ۲٫۰؛ نامعتبر = ۱
    rate: function () {
      var p = R.profile ? R.profile() : null;
      var r = p && Number(p.voiceRate);
      if (r >= 0.5 && r <= 2.5) return r;
      return 1;
    }
  };

  var I18NV = {
    fa: {
      mic: 'میکروفون', micStart: 'گوش بده', micStop: 'قطع', listening: 'دارم گوش می‌دهم…',
      transcript: 'متن گفتار', reply: 'پاسخ رهیار',
      errUnavailable: 'سرویس تشخیص گفتار روی این دستگاه نصب نیست — از نسخهٔ وب یا دستگاه با سرویس گوگل استفاده کن.',
      errNoMatch: 'چیزی شنیده نشد — دوباره تلاش کن.', errBusy: 'تشخیص گفتار مشغول است.',
      errDenied: 'مجوز میکروفون داده نشد — از تنظیمات می‌توانی فعال کنی.', errGeneric: 'خطای تشخیص گفتار.',
      needMic: 'برای شروع، اجازهٔ میکروفون لازم است.',
      vTaskAdded: 'وظیفه اضافه شد:', vReminderAdded: 'یادآور ثبت شد:', vDeleted: 'حذف شد:',
      vIncome: 'درآمد ثبت شد:', vExpense: 'هزینه ثبت شد:', vAmount: 'مبلغ',
      vReport: 'گزارش مالی:', vIncomeSum: 'جمع درآمد', vExpenseSum: 'جمع هزینه',
      vPlan: 'برنامه امروز:', vPlanEmpty: 'برای امروز کار بازی ثبت نشده.',
      vDate: 'امروز', vUnknown: 'این فرمان را متوجه نشدم. بگو «چیکار می‌تونی».',
      vHelp: 'می‌توانم وظیفه اضافه یا حذف کنم، یادآور بسازم، هزینه و درآمد ثبت کنم، گزارش مالی بدهم، برنامه امروز را بگویم و تاریخ امروز را بگویم.',
      vCancel: 'قطع شد.', confirmDelete: 'حذف شود؟', yes: 'بله', no: 'نه',
      confirmFinance: 'ثبت شود؟', vCanceled: 'انصراف داده شد — هیچ چیزی ثبت نشد.',
      voiceSec: 'دستیار صوتی', voiceLang: 'زبان صوت', voiceRate: 'سرعت خواندن', wake: 'فعال‌سازی «سلام رهیار» (Wake Word)',
      wakeDesc: 'با روشن‌کردن، سرویس پیش‌زمینه با اعلان ماندگار شفاف به عبارت «سلام رهیار» گوش می‌دهد و اپ را باز می‌کند. هیچ صدایی ذخیره یا ارسال نمی‌شود و هر زمان می‌توانی خاموش کنی.',
      privacy: 'صدا فقط با لمس میکروفون و فقط به سرویس گفتار سیستم‌عامل می‌رود؛ ذخیره یا ارسال پنهان صدا وجود ندارد.',
      wakeUnavailable: 'سرویس تشخیص گفتار روی این دستگاه نیست؛ Wake Word عملیاتی نمی‌شود.',
      vDeletedConfirm: 'حذف انجام شد.',
      vTypeHint: 'یا دستور را تایپ کن…', vSend: 'اجرا',
      vMicOffHint: 'شنیدن صوتی روی این دستگاه در دسترس نیست — فرمان را تایپ کن.',
      ttsErrInit: 'موتور خواندن صوتی آماده نشد — پاسخ متنی نمایش داده می‌شود.',
      ttsErrLang: 'صدای این زبان روی این دستگاه نصب نیست — پاسخ متنی نمایش داده می‌شود.',
      ttsErrGeneric: 'خطای خواندن صوتی — پاسخ متنی نمایش داده می‌شود.',
      // F5-مأموریت ۷: پیامک بانکی
      smsSec: 'پیامک بانکی',
      smsDesc: 'با رضایت شما، پیامک‌های بانکی (واریز/برداشت/خرید) دریافت و به‌صورت پیش‌نمایش در اپ نشان داده می‌شوند. ثبت نهایی فقط با تأیید شما انجام می‌شود. پیامک‌های شخصی و غیرمالی هرگز خوانده یا ذخیره نمی‌شوند.',
      smsConsent: 'رضایت دریافت پیامک بانکی',
      smsPending: 'پیش‌نمایش‌های در انتظار تأیید',
      smsNone: 'موردی در انتظار نیست.',
      smsCommit: 'ثبت در مالی',
      smsDiscard: 'رد',
      smsCommitted: 'ثبت شد ✓',
      smsPermissionDenied: 'مجوز پیامک داده نشد — بدون آن، هیچ پیامکی خوانده نمی‌شود.',
      smsTypeIncome: 'واریز', smsTypeExpense: 'برداشت/خرید'
    },
    en: {
      mic: 'Microphone', micStart: 'Listen', micStop: 'Stop', listening: 'Listening…',
      transcript: 'Transcript', reply: 'Rahyar reply',
      errUnavailable: 'No speech recognition service on this device — use the web edition or a device with a speech service.',
      errNoMatch: 'Nothing heard — try again.', errBusy: 'Recognizer busy.',
      errDenied: 'Microphone permission denied — enable it from settings.', errGeneric: 'Speech recognition error.',
      needMic: 'Microphone permission is required.',
      vTaskAdded: 'Task added:', vReminderAdded: 'Reminder set:', vDeleted: 'Deleted:',
      vIncome: 'Income recorded:', vExpense: 'Expense recorded:', vAmount: 'Amount',
      vReport: 'Finance report:', vIncomeSum: 'Total income', vExpenseSum: 'Total expense',
      vPlan: 'Today:', vPlanEmpty: 'No open work for today.',
      vDate: 'Today is', vUnknown: 'I did not catch that. Say "what can you do".',
      vHelp: 'I can add or delete tasks, set reminders, record income and expenses, give a finance report, read today\'s plan and today\'s date.',
      vCancel: 'Stopped.', confirmDelete: 'Delete?', yes: 'Yes', no: 'No',
      confirmFinance: 'Record this?', vCanceled: 'Canceled — nothing was recorded.',
      voiceSec: 'Voice assistant', voiceLang: 'Voice language', voiceRate: 'Speaking speed', wake: 'Enable "Hey Rahyar" (Wake Word)',
      wakeDesc: 'When enabled, a foreground service with a persistent, transparent notification listens for "Hey Rahyar" and opens the app. No audio is stored or sent; turn off anytime.',
      privacy: 'Audio goes to the OS speech service only when you tap the mic; nothing is stored or silently sent.',
      wakeUnavailable: 'No speech service on this device; Wake Word cannot operate.',
      vDeletedConfirm: 'Deleted.',
      vTypeHint: 'or type a command…', vSend: 'Run',
      vMicOffHint: 'Voice listening is unavailable on this device — type your command.',
      ttsErrInit: 'Speech engine failed to initialize — showing the text reply instead.',
      ttsErrLang: 'No voice for this language is installed on this device — showing the text reply instead.',
      ttsErrGeneric: 'Speech playback failed — showing the text reply instead.',
      // F5: bank SMS
      smsSec: 'Bank SMS',
      smsDesc: 'With your explicit consent, bank SMS (deposit/withdrawal/purchase) are received and shown as previews in the app. Nothing is recorded without your confirmation. Personal and non-financial SMS are never read or stored.',
      smsConsent: 'Consent to receive bank SMS',
      smsPending: 'Previews awaiting confirmation',
      smsNone: 'Nothing pending.',
      smsCommit: 'Record in finance',
      smsDiscard: 'Discard',
      smsCommitted: 'Recorded ✓',
      smsPermissionDenied: 'SMS permission denied — without it no SMS is read.',
      smsTypeIncome: 'Deposit', smsTypeExpense: 'Withdrawal/Purchase'
    }
  };
  function tv(k) { var d = I18NV[R.lang()] || I18NV.fa; return d[k] !== undefined ? d[k] : (I18NV.fa[k] || k); }

  // ─── UI: دکمهٔ شناور + پنل گفت‌وگو (تزریق در همهٔ صفحات) ───
  function injectUI() {
    if (document.getElementById('voiceFab')) return;
    var fab = document.createElement('button');
    fab.id = 'voiceFab';
    fab.setAttribute('aria-label', tv('mic'));
    fab.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M12 17.5V21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    fab.style.cssText = 'position:fixed;bottom:76px;inset-inline-end:14px;width:54px;height:54px;border-radius:50%;'
      + 'border:none;background:#4f6ef7;color:#fff;display:flex;align-items:center;justify-content:center;'
      + 'cursor:pointer;z-index:60;box-shadow:0 6px 18px rgba(0,0,0,.35);';
    var panel = document.createElement('div');
    panel.id = 'voicePanel';
    panel.style.cssText = 'position:fixed;bottom:140px;inset-inline-end:14px;width:min(300px,86vw);'
      + 'background:var(--card,#101a3a);border:1px solid #2a3c78;border-radius:14px;padding:12px;'
      + 'display:none;z-index:60;color:inherit;font-size:13px;line-height:1.9;box-shadow:0 10px 30px rgba(0,0,0,.4);';
    panel.innerHTML = '<div id="vStatus" style="font-weight:700"></div>'
      + '<div id="vPartial" style="opacity:.8"></div>'
      + '<div id="vFinal" style="margin-top:6px"></div>'
      + '<div id="vReply" style="margin-top:6px;color:#8ab4ff"></div>'
      + '<div style="margin-top:8px;display:flex;gap:6px">'
      + '<input id="vTypeBox" placeholder="' + tv('vTypeHint') + '" style="flex:1;min-width:0;padding:7px 9px;border-radius:9px;border:1px solid #2a3c78;background:rgba(255,255,255,.07);color:inherit;font:inherit;font-size:12px;">'
      + '<button id="vTypeGo" style="padding:7px 12px;border-radius:9px;border:none;background:#4f6ef7;color:#fff;cursor:pointer;font:inherit;font-size:12px;">' + tv('vSend') + '</button>'
      + '</div>';
    document.body.appendChild(fab);
    document.body.appendChild(panel);
    fab.addEventListener('click', function () {
      var st = native.voiceMicState ? native.voiceMicState() : 'granted';
      if (st === 'need_request') {
        setPanel(tv('needMic'), '', '');
        native.requestMicPermission();
        return; // پس از رویداد rahyar-voice-perm ادامه می‌دهیم
      }
      if (st === 'denied') { setPanel(tv('errDenied'), '', ''); return; }
      toggleListen();
    });
    // مسیر متنی همان مسیر صوتی است: یک پارسر، یک موتور اجرا — بدون مسیر نمایشی
    setTimeout(function () {
      var go = document.getElementById('vTypeGo');
      var box = document.getElementById('vTypeBox');
      if (go) go.addEventListener('click', function () { runTextCommand(box ? box.value : ''); });
      if (box) box.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runTextCommand(box.value); } });
    }, 0);
  }

  function runTextCommand(text) {
    text = (text || '').trim();
    if (!text) return;
    setPanel(tv('transcript'), text, '');
    try {
      var intent = JSON.parse(native.parseVoiceCommand(text, R.lang()));
      intent.raw = text;
      runIntent(intent);
    } catch (err) {
      setPanel('', '', tv('vUnknown'));
      speak(tv('vUnknown'));
    }
    var box = document.getElementById('vTypeBox');
    if (box) box.value = '';
  }

  function setPanel(status, partial, reply) {
    var panel = document.getElementById('voicePanel');
    if (!panel) return;
    panel.style.display = 'block';
    document.getElementById('vStatus').textContent = status;
    document.getElementById('vPartial').textContent = partial || '';
    document.getElementById('vReply').textContent = reply || '';
  }

  function hidePanelSoon() {
    setTimeout(function () {
      var p = document.getElementById('voicePanel');
      if (p && !V.listening) p.style.display = 'none';
    }, 6000);
  }

  function toggleListen() {
    if (V.listening) {
      native.voiceStop();
      V.listening = false;
      fabIdle();
      return;
    }
    if (native.voiceAvailable && native.voiceAvailable() !== 'true') {
      // بدون سرویس گفتار: پنل با پیام صادقانه و ورودی متنی باز می‌ماند
      setPanel(tv('vMicOffHint'), '', '');
      var box0 = document.getElementById('vTypeBox');
      if (box0) box0.focus();
      fabIdle();
      return;
    }
    V.listening = true;
    fabActive();
    setPanel(tv('listening'), '', '');
    native.voiceStart(V.bcp());
  }

  var fab = null;
  function fabActive() {
    fab = fab || document.getElementById('voiceFab');
    if (fab) { fab.style.background = '#e5484d'; fab.style.boxShadow = '0 0 0 8px rgba(229,72,77,.25)'; }
  }
  function fabIdle() {
    fab = fab || document.getElementById('voiceFab');
    if (fab) { fab.style.background = '#4f6ef7'; fab.style.boxShadow = '0 6px 18px rgba(0,0,0,.35)'; }
  }

  function speak(text) {
    if (!text) return;
    V.busyTts = true;
    setPanel(tv('reply'), '', text);
    try {
      // V1 (بند ۵): سرعت خواندن انتخابی کاربر — پل قدیمی‌تر بدون setTtsRate بی‌اثر می‌ماند
      if (native.setTtsRate) { try { native.setTtsRate(String(V.rate())); } catch (e0) { /* بی‌اثر */ } }
      native.ttsSpeak(text, V.bcp());
    } catch (e) { V.busyTts = false; }
  }

  // ─── اجرای واقعی کنش‌ها روی ماژول‌ها ───
  function tasksArr() { var d = R.readDoc(R.KEYS.tasks, null); return Array.isArray(d) ? d : (d && Array.isArray(d.items) ? d.items : []); }
  function saveTasks(arr) {
    var cur = R.readDoc(R.KEYS.tasks, null);
    if (cur && Array.isArray(cur.items)) cur.items = arr; else arr2doc('tasks', arr);
    if (!(cur && Array.isArray(cur.items))) return;
    R.putDoc(R.KEYS.tasks, cur);
  }
  function arr2doc(key, arr) {
    // ساختار سند را از موجودی یاد بگیر؛ در نبود، آرایهٔ خام
    var cur = R.readDoc(key, null);
    if (cur && typeof cur === 'object' && !Array.isArray(cur) && Array.isArray(cur.items)) {
      cur.items = arr; R.putDoc(key, cur);
    } else {
      R.putDoc(key, arr);
    }
  }

  function runIntent(intent) {
    var a = intent.action;
    var reply = '';
    if (a === 'add_task' && intent.title) {
      var arr = tasksArr();
      arr.push({ id: R.uid(), title: intent.title, note: '', priority: intent.priority || 'med', done: false, createdAt: new Date().toISOString() });
      arr2doc(R.KEYS.tasks, arr);
      reply = tv('vTaskAdded') + ' ' + intent.title;
    } else if (a === 'delete_task') {
      if (!intent.confirm) { reply = tv('confirmDelete'); speak(reply); return; }
      askConfirm(tv('confirmDelete') + ' «' + (intent.title || '') + '»', function (yes) {
        if (!yes) return;
        var arr = tasksArr().filter(function (x) {
          return !(intent.title && x.title && x.title.indexOf(intent.title) !== -1);
        });
        arr2doc(R.KEYS.tasks, arr);
        var r = tv('vDeletedConfirm');
        setPanel('', '', r); speak(r);
      });
      return;
    } else if (a === 'add_reminder' && intent.title) {
      var rem = R.readDoc(R.KEYS.reminders, null);
      var rarr = Array.isArray(rem) ? rem : (rem && Array.isArray(rem.items) ? rem.items : []);
      rarr.push({ id: R.uid(), title: intent.title, at: intent.timeHint || '', repeat: 'none', createdAt: new Date().toISOString() });
      arr2doc(R.KEYS.reminders, rarr);
      reply = tv('vReminderAdded') + ' ' + intent.title;
    } else if ((a === 'add_income' || a === 'add_expense') && intent.amount) {
      // F7: عملیات مالی حساس است — هرگز بی‌تأیید صریح نوشته نمی‌شود
      // (هم‌عرض مدل امنیتی وب: پندینگ + تأیید؛ لغو → هیچ تغییری)
      var amtTxt = String(intent.amount);
      var whatTxt = (a === 'add_income' ? tv('vIncome') : tv('vExpense')) + ' ' + amtTxt + (intent.title ? ' — ' + intent.title : '');
      askConfirm(tv('confirmFinance') + ' «' + whatTxt + '»', function (yes) {
        if (!yes) { setPanel('', '', tv('vCanceled')); return; }
        var fin = R.readDoc('finance', { items: [] });
        var farr = Array.isArray(fin) ? fin : (fin && Array.isArray(fin.items) ? fin.items : []);
        var host = (fin && !Array.isArray(fin) && fin.items) ? fin : { items: [] };
        host.items.push({ id: R.uid(), kind: a === 'add_income' ? 'income' : 'expense', amount: intent.amount, title: intent.title || '', ts: new Date().toISOString() });
        R.putDoc('finance', host);
        var r = whatTxt;
        setPanel('', '', r); speak(r);
      });
      return;
    } else if (a === 'finance_report') {
      var fin2 = R.readDoc('finance', { items: [] });
      var items2 = Array.isArray(fin2) ? fin2 : (fin2 && fin2.items ? fin2.items : []);
      var inc = 0, exp = 0;
      for (var i = 0; i < items2.length; i++) {
        var amt = Number(items2[i].amount) || 0;
        if (items2[i].kind === 'income') inc += amt; else exp += amt;
      }
      reply = tv('vReport') + ' ' + tv('vIncomeSum') + ': ' + inc + ' — ' + tv('vExpenseSum') + ': ' + exp;
    } else if (a === 'plan_query') {
      var open = tasksArr().filter(function (x) { return !x.done; });
      reply = open.length ? tv('vPlan') + ' ' + open.map(function (x) { return x.title; }).join('، ') : tv('vPlanEmpty');
    } else if (a === 'date_query') {
      var now = new Date();
      var fa = R.lang() !== 'en';
      try {
        var j = new Intl.DateTimeFormat((fa ? 'fa-IR' : 'en') + '-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
        var g = new Intl.DateTimeFormat(fa ? 'fa-IR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
        reply = tv('vDate') + (fa ? '، ' : ': ') + j + (fa ? ' (میلادی: ' + g + ')' : ' (Gregorian: ' + g + ')');
      } catch (e) { reply = tv('vDate') + ' ' + now.toLocaleDateString(fa ? 'fa-IR' : 'en-GB'); }
    } else if (a === 'help') {
      reply = tv('vHelp');
    } else if (a === 'cancel') {
      reply = tv('vCancel');
    } else {
      reply = tv('vUnknown');
    }
    setPanel(R.esc(intent.raw || ''), '', R.esc(reply));
    var panel = document.getElementById('voicePanel');
    if (panel) document.getElementById('vFinal').textContent = intent.raw || '';
    speak(reply);
    hidePanelSoon();
  }

  function askConfirm(text, cb) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:100;';
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--card,#101a3a);border:1px solid #2a3c78;border-radius:14px;padding:18px;max-width:320px;color:inherit;font-size:14px;line-height:2;';
    var yes = document.createElement('button'), no = document.createElement('button');
    yes.textContent = tv('yes'); no.textContent = tv('no');
    [yes, no].forEach(function (b, i) {
      b.style.cssText = 'margin-inline-start:8px;padding:8px 16px;border-radius:10px;border:1px solid #2a3c78;cursor:pointer;font-size:13px;'
        + (i === 0 ? 'background:#e5484d;color:#fff;' : 'background:transparent;color:inherit;');
    });
    box.textContent = text;
    box.appendChild(document.createElement('br'));
    box.appendChild(no); box.appendChild(yes);
    wrap.appendChild(box); document.body.appendChild(wrap);
    yes.addEventListener('click', function () { document.body.removeChild(wrap); cb(true); });
    no.addEventListener('click', function () { document.body.removeChild(wrap); cb(false); });
  }

  // ─── رویدادهای بومی ───
  window.addEventListener('rahyar-wake', function () {
    // V1 (بند ۷): باز شدن اپ با Wake Word — شروع شنود همان مسیر دکمهٔ میکروفون
    // (درست مجوز داخل toggleListen بررسی می‌شود؛ بدون رضایت، شنود شروع نمی‌شود)
    var st = native.voiceMicState ? native.voiceMicState() : 'granted';
    if (st === 'granted' && !V.listening) {
      toggleListen();
    }
  });
  window.addEventListener('rahyar-voice-partial', function (e) {
    setPanel(tv('listening'), (e.detail && e.detail.text) || '', '');
  });
  window.addEventListener('rahyar-voice-final', function (e) {
    var text = (e.detail && e.detail.text) || '';
    setPanel(text, '', '');
    try {
      var intent = JSON.parse(native.parseVoiceCommand(text, R.lang()));
      intent.raw = text;
      runIntent(intent);
    } catch (err) {
      speak(tv('vUnknown'));
    }
  });
  window.addEventListener('rahyar-voice-error', function (e) {
    var code = (e.detail && e.detail.code) || 'error';
    var map = { no_match: 'errNoMatch', busy: 'errBusy', denied: 'errDenied', unavailable: 'errUnavailable' };
    setPanel(tv(map[code] || 'errGeneric'), '', '');
    V.listening = false; fabIdle(); hidePanelSoon();
  });
  window.addEventListener('rahyar-voice-end', function () {
    V.listening = false; fabIdle();
  });
  window.addEventListener('rahyar-voice-perm', function (e) {
    var st = (e.detail && e.detail.state) || '';
    if (st === 'granted') { toggleListen(); }
    else { setPanel(tv('errDenied'), '', ''); }
  });
  window.addEventListener('rahyar-tts-done', function () {
    V.busyTts = false;
  });
  window.addEventListener('rahyar-tts-error', function (e) {
    // R3-P0 §3: خطای صادقانهٔ TTS — نبود صدای فارسی/انگلیسی یا شکست موتور؛
    // هرگز موفقیت قلابی نمایش داده نمی‌شود
    var code = (e.detail && e.detail.code) || 'error';
    var map = { init_failed: 'ttsErrInit', missing_data: 'ttsErrLang', not_supported: 'ttsErrLang', error: 'ttsErrGeneric' };
    setPanel(tv(map[code] || 'ttsErrGeneric'), '', '');
    V.busyTts = false;
  });

  // ─── بخش صوت در تنظیمات ───
  function injectSettings() {
    if (document.body.getAttribute('data-page') !== 'settings') return;
    if (document.getElementById('voiceSection')) return;
    var sec = document.createElement('section');
    sec.id = 'voiceSection';
    sec.className = 'card';
    var wake = R.profile().wakeWord === true;
    sec.innerHTML = '<h2>' + tv('voiceSec') + '</h2>'
      + '<label style="display:flex;align-items:center;gap:8px;margin:8px 0">'
      + '<span>' + tv('voiceLang') + '</span>'
      + '<select id="vLang" style="background:inherit;color:inherit;border:1px solid #2a3c78;border-radius:8px;padding:4px 8px">'
      + '<option value="fa"' + ((R.profile().voiceLang || R.lang()) === 'fa' ? ' selected' : '') + '>فارسی</option>'
      + '<option value="en"' + ((R.profile().voiceLang || R.lang()) === 'en' ? ' selected' : '') + '>English</option>'
      + '</select></label>'
      + '<label style="display:flex;align-items:center;gap:8px;margin:8px 0">'
      + '<span>' + tv('voiceRate') + '</span>'
      + '<select id="vRate" style="background:inherit;color:inherit;border:1px solid #2a3c78;border-radius:8px;padding:4px 8px">'
      + '<option value="0.8"' + (V.rate() === 0.8 ? ' selected' : '') + '>۰٫۸ — آهسته</option>'
      + '<option value="0.95"' + (V.rate() === 0.95 ? ' selected' : '') + '>۰٫۹۵</option>'
      + '<option value="1"' + (V.rate() === 1 ? ' selected' : '') + '>۱ — عادی</option>'
      + '<option value="1.2"' + (V.rate() === 1.2 ? ' selected' : '') + '>۱٫۲ — تند</option>'
      + '<option value="1.5"' + (V.rate() === 1.5 ? ' selected' : '') + '>۱٫۵</option>'
      + '</select></label>'
      + '<label style="display:flex;align-items:center;gap:8px;margin:8px 0">'
      + '<input type="checkbox" id="vWake"' + (wake ? ' checked' : '') + '><span>' + tv('wake') + '</span></label>'
      + '<p style="opacity:.8;font-size:12px">' + tv('wakeDesc') + '</p>'
      + '<p style="opacity:.6;font-size:11px">' + tv('privacy') + '</p>'
      + '<div id="vWakeState" style="font-size:12px;opacity:.8"></div>';
    var main = document.querySelector('main');
    if (main) main.appendChild(sec); else document.body.appendChild(sec);
    document.getElementById('vLang').addEventListener('change', function (e2) {
      R.saveProfile({ voiceLang: e2.target.value });
    });
    document.getElementById('vRate').addEventListener('change', function (e5) {
      R.saveProfile({ voiceRate: Number(e5.target.value) });
    });
    document.getElementById('vWake').addEventListener('change', function (e3) {
      var on = e3.target.checked;
      R.saveProfile({ wakeWord: on });
      try { native.setWakeService(on); } catch (e4) { /* بدون پل — بی‌اثر */ }
      if (on && native.voiceAvailable && native.voiceAvailable() !== 'true') {
        document.getElementById('vWakeState').textContent = tv('wakeUnavailable');
      } else {
        document.getElementById('vWakeState').textContent = on ? 'ON' : 'OFF';
      }
    });
  }

  function boot() {
    injectUI();
    injectSettings();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ═══ F5-مأموریت ۷: بخش پیامک بانکی در تنظیمات ═══
 * رضایت صریح → دیالوگ مجوز سیستم RECEIVE_SMS → صف پیش‌نمایش محلی؛
 * ثبت نهایی «فقط» با تأیید کاربر روی هر آیتم (اصلاح پیش از ثبت).
 * لغو رضایت = توقف کامل پردازش + پاک‌شدن صف. */
  (function () {
    'use strict';
    var R2 = window.RH;
    if (!R2 || !R2.native) return;

    function tv2(k) {
      // همان نقشهٔ بلوک صوت در دسترس نیست؛ برچسب‌ها را دو زبانه همین‌جا نگه می‌داریم
      var fa = {
        smsSec: 'پیامک بانکی',
        smsDesc: 'با رضایت شما، پیامک‌های بانکی (واریز/برداشت/خرید) دریافت و به‌صورت پیش‌نمایش نشان داده می‌شوند. ثبت نهایی فقط با تأیید شماست؛ پیامک شخصی/غیرمالی هرگز خوانده نمی‌شود.',
        smsConsent: 'رضایت دریافت پیامک بانکی',
        smsPending: 'پیش‌نمایش‌های در انتظار تأیید',
        smsNone: 'موردی در انتظار نیست.',
        smsCommit: 'ثبت در مالی',
        smsDiscard: 'رد',
        smsCommitted: 'ثبت شد ✓',
        smsDenied: 'مجوز پیامک داده نشد — بدون آن هیچ پیامکی خوانده نمی‌شود.'
      };
      var en = {
        smsSec: 'Bank SMS',
        smsDesc: 'With your explicit consent, bank SMS are received and shown as previews. Nothing is recorded without your confirmation; personal SMS are never read.',
        smsConsent: 'Consent to receive bank SMS',
        smsPending: 'Previews awaiting confirmation',
        smsNone: 'Nothing pending.',
        smsCommit: 'Record in finance',
        smsDiscard: 'Discard',
        smsCommitted: 'Recorded ✓',
        smsDenied: 'SMS permission denied — no SMS is read without it.'
      };
      var d = R2.lang() === 'en' ? en : fa;
      return d[k] || k;
    }

    function queueToArray() {
      try { return JSON.parse(R2.native.smsPending() || '[]'); } catch (e) { return []; }
    }

    function render() {
      var box = document.getElementById('smsPendingList');
      if (!box) return;
      var q = queueToArray();
      if (!q.length) { box.innerHTML = '<p style="opacity:.6;font-size:12px">' + tv2('smsNone') + '</p>'; return; }
      box.innerHTML = '';
      q.forEach(function (it, idx) {
        var row = document.createElement('div');
        row.style.cssText = 'border:1px solid #2a3c78;border-radius:10px;padding:8px;margin:6px 0;font-size:12px';
        var type = it.type === 'income' ? tv2('smsTypeIncome') : tv2('smsTypeExpense');
        row.innerHTML = '<b>' + (it.bank || it.sender) + '</b> — ' + type + ' ' + (it.amount > 0 ? it.amount : '?')
          + '<div style="opacity:.75;margin:4px 0">' + String(it.body || '').slice(0, 90) + '</div>';
        var ok = document.createElement('button');
        ok.textContent = tv2('smsCommit');
        ok.style.cssText = 'margin-left:6px;padding:4px 10px;border-radius:8px;border:1px solid #2a3c78;background:inherit;color:inherit';
        ok.addEventListener('click', function () {
          // ثبت واقعی در مالی محلی — همان سند finance که بقیهٔ اپ می‌خواند
          var fin = R2.readDoc('finance', { items: [] });
          var host = (fin && !Array.isArray(fin) && fin.items) ? fin : { items: [] };
          host.items.push({
            id: R2.uid(),
            kind: it.type === 'income' ? 'income' : 'expense',
            amount: it.amount > 0 ? it.amount : 0,
            title: (it.bank || 'Bank SMS') + ' • ' + (it.sender || ''),
            ts: it.ts ? new Date(it.ts).toISOString() : new Date().toISOString()
          });
          R2.putDoc('finance', host);
          // حذف از صف
          var rest = queueToArray().filter(function (x) { return x.h !== it.h; });
          try { R2.native.putDoc('sms_queue', JSON.stringify({ items: rest })); } catch (e2) { }
          // صف بومی را هم از مسیر خودش به‌روز کن (فقط نمایش دوباره)
          render();
          var s = document.getElementById('smsStateLine');
          if (s) { s.textContent = tv2('smsCommitted'); setTimeout(function () { s.textContent = ''; }, 2500); }
        });
        var no = document.createElement('button');
        no.textContent = tv2('smsDiscard');
        no.style.cssText = 'margin-left:6px;padding:4px 10px;border-radius:8px;border:1px solid #2a3c78;background:inherit;color:inherit';
        no.addEventListener('click', function () {
          var rest = queueToArray().filter(function (x) { return x.h !== it.h; });
          try { R2.native.putDoc('sms_queue', JSON.stringify({ items: rest })); } catch (e2) { }
          render();
        });
        row.appendChild(ok); row.appendChild(no);
        box.appendChild(row);
      });
    }

    function injectSms() {
      if (document.body.getAttribute('data-page') !== 'settings') return;
      if (!R2.native.smsState || !R2.native.smsState.toString().match(/function/)) {
        // پل بدون متد پیامک (نسخهٔ قدیمی بومی) — بخش مخفی می‌ماند
      }
      if (typeof R2.native.smsState !== 'function') return;
      var st;
      try { st = JSON.parse(R2.native.smsState()); } catch (e) { return; }
      if (!st || st.supported !== true) return; // فقط در اپ اندروید واقعی
      if (document.getElementById('smsSection')) { render(); return; }
      var sec = document.createElement('section');
      sec.id = 'smsSection';
      sec.className = 'card';
      sec.innerHTML = '<h2>' + tv2('smsSec') + '</h2>'
        + '<p style="opacity:.8;font-size:12px">' + tv2('smsDesc') + '</p>'
        + '<label style="display:flex;align-items:center;gap:8px;margin:8px 0">'
        + '<input type="checkbox" id="smsConsent"' + (st.consent ? ' checked' : '') + '><span>' + tv2('smsConsent') + '</span></label>'
        + '<div id="smsStateLine" style="font-size:12px;opacity:.8"></div>'
        + '<h3 style="margin-top:10px;font-size:13px">' + tv2('smsPending') + '</h3>'
        + '<div id="smsPendingList"></div>';
      var main = document.querySelector('main');
      if (main) main.appendChild(sec); else document.body.appendChild(sec);
      document.getElementById('smsConsent').addEventListener('change', function (e) {
        var on = e.target.checked;
        if (on) {
          // درخواست مجوز سیستم — ثبت رضایت فقط پس از granted در بومی انجام می‌شود
          R2.native.smsRequestConsent();
          setTimeout(function () {
            try {
              var st2 = JSON.parse(R2.native.smsState());
              if (st2.permission === 'denied') document.getElementById('smsStateLine').textContent = tv2('smsDenied');
              document.getElementById('smsConsent').checked = st2.consent === true;
            } catch (e2) { }
          }, 1200);
        } else {
          R2.native.smsRevokeConsent();
        }
        setTimeout(render, 300);
      });
      window.addEventListener('rahyar_sms_state', function () {
        try {
          var st3 = JSON.parse(R2.native.smsState());
          document.getElementById('smsConsent').checked = st3.consent === true;
        } catch (e) { }
        render();
      });
      render();
    }

    function boot2() { injectSms(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot2);
    else setTimeout(boot2, 0);
  })();
