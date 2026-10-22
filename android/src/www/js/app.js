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
