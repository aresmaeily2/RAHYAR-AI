#!/usr/bin/env python3
"""مهاجرت انبوه i18n — بسته‌بندی رشته‌های فارسی JSX در ت()

سه الگو:
  1) صفت‌ها:   aria-label="X" | title="X" | placeholder="X"  →  attr={t('X')}
  2) متن JSX:  >X< (در خط مستقل) و >X</...> (درون‌خطی)  →  {t('X')}
  3) توست‌ها:  toast[.success/.error]('X'  →  toast... (t('X'
و افزودن import + const { t } = useI18n() به کامپوننت هدف.
"""
import re
import sys
import shutil
from pathlib import Path

AR = r'[\u0600-\u06FF]'

FILES = {
    'src/components/ara/today-view.tsx': 'TodayView',
    'src/components/ara/tasks-view.tsx': 'TasksView',
    'src/components/ara/quick-add.tsx': 'QuickAdd',
    'src/components/ara/quick-add-inline.tsx': 'QuickAddInline',
    'src/components/ara/plan-view.tsx': 'PlanView',
    'src/components/ara/focus-timer.tsx': 'FocusTimer',
    'src/components/ara/task-item.tsx': 'TaskItem',
    'src/components/ara/task-detail.tsx': 'TaskDetail',
}

ROOT = Path('/home/z/my-project')
backup_dir = ROOT / 'scripts' / 'backup-i18n'
backup_dir.mkdir(parents=True, exist_ok=True)

attr_re = re.compile(
    r'(?P<attr>aria-label|title|placeholder)="(?P<val>[^"]*(?:' + AR + r')[^"]*)"'
)
# متن JSX در خط مستقل:  >TEXT<
line_re = re.compile(
    r'(?P<pre>^(\s*))>(?P<val>[^<>{}]*' + AR + r'[^<>{}]*)<$', re.M
)
# درون‌خطی: >TEXT</tag>
inline_re = re.compile(
    r'>(?P<val>[^<>{}]*' + AR + r'[^<>{}]{1,80})</'
)
toast_re = re.compile(
    r"(\btoast(?:\.success|\.error)?\()\s*'(?P<val>[^']*" + AR + r"[^']*)'"
)

def esc(s: str) -> str:
    return s.replace('\\', '\\\\').replace("'", "\\'")

changed_total = 0
for rel, comp in FILES.items():
    p = ROOT / rel
    src = p.read_text(encoding='utf-8')
    shutil.copy2(p, backup_dir / p.name)
    orig = src

    if "from '@/i18n/store'" not in src:
        src = re.sub(
            r"(\nimport \{ cn \} from '@/lib/utils')",
            "\nimport { useI18n } from '@/i18n/store'\\1",
            src,
            count=1,
        )
        if "from '@/i18n/store'" not in src:
            # fallback: prepend import after first import block
            src = re.sub(r"(^'use client'\n\n)", r"\1import { useI18n } from '@/i18n/store'\n", src, count=1)

    # hook: بعد از خط «export function Comp()» یا «function Comp()»
    hook_pat = re.compile(
        r"(?P<head>(?:export default )?(?:export )?function " + comp + r"\(\)(?:[^{]*)\{\n)"
    )
    m = hook_pat.search(src)
    if m and re.search(r'\bconst \{[^}]*t\b[^}]*\} = useI18n', src[m.end():m.end()+400]) is None:
        src = src[:m.end()] + '  const { t } = useI18n()\n' + src[m.end():]

    # 1) صفت‌ها
    src = attr_re.sub(lambda mm: f"{mm.group('attr')}={{t('{esc(mm.group('val'))}')}}", src)

    # 2) متن خط مستقل
    src = line_re.sub(lambda mm: f"{mm.group('pre')}{{t('{esc(mm.group('val'))}')}}", src)

    # 3) درون‌خطی (فقط اگر قبلش => نیست)
    def inline_sub(mm: re.Match) -> str:
        start = mm.start()
        before = src2[max(0, start-3):start]
        if before.endswith('=>') or '=>' in before:
            return mm.group(0)
        return ">{t('" + esc(mm.group('val')) + "')}</"
    src2 = src
    src = inline_re.sub(inline_sub, src)

    # 4) توست‌ها
    src = toast_re.sub(lambda mm: f"{mm.group(1)}t('{esc(mm.group('val'))}'", src)

    if src != orig:
        p.write_text(src, encoding='utf-8')
        n = sum(1 for _ in re.finditer(r"t\('[^']*" + AR, src))
        print(f"✓ {rel}: ~{n} t() calls")
        changed_total += 1
    else:
        print(f"- {rel}: no change")

print('files changed:', changed_total)
