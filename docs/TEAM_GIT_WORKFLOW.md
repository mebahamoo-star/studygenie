# دليل فريق StudyGenie للعمل مع Git (Git Team Workflow)

مرجع سريع وعملي لتحديث نسختك بأمان والعمل على مهامك بدون تعارضات أو فقدان للكود.

---

## 1. إعداد لمرة واحدة (One-time Setup)

نفّذ هذه الأوامر مرة واحدة في Terminal أو PowerShell:

```bash
git config --global pull.rebase false
git config --global core.autocrlf true
git config --global fetch.prune true
```

---

## 2. الروتين اليومي (Daily Routine)

1. **حدّث نسختك بأمان:** شغّل ملف `update-studygenie.bat` (دبل كليك من مجلد المشروع). يقوم السكربت بحفظ تعديلاتك مؤقتاً، سحب آخر تحديثات `master`، إعادة تعديلاتك، وتحديث مكتبات وبناء الواجهة عند الحاجة.
2. **أنشئ فرعك الخاص:** لا تكتب كوداً على `master`. أنشئ فرعاً لمهمتك:
   ```bash
   git checkout -b feat/my-feature-name
   ```
3. **احفظ شغلك أولاً بأول:** اعمل commits صغيرة وواضحة:
   ```bash
   git add .
   git commit -m "feat: short description of change"
   ```
4. **ارفع فرعك وافتح Pull Request:**
   ```bash
   git push -u origin feat/my-feature-name
   ```
   ثم افتح **Pull Request (PR)** على GitHub باتجاه `master`.

---

## 3. قواعد الفريق (Team Rules)

- **ممنوع العمل أو الـ commit مباشرة على `master`** (فرع `master` محمي).
- **فرع واحد لكل شخص / ميزة:** لا يشارك شخصان في تعديل نفس الـ feature branch إلا بالتنسيق المسبق.
- **المراجعة إلزامية:** كل Pull Request يحتاج مراجعة (Review) من زميل قبل دمجه في `master`.

---

## 4. حل التعارضات في VS Code في 4 خطوات

إذا ظهرت رسالة وجود تعارض (Conflict) عند تحديث الكود:

1. افتح تبويب **Source Control** في VS Code (أو افتح الملفات الظاهرة في الرسالة تحت `Merge Changes`).
2. داخل الملف، اختر أحد الأزرار فوق التعديل المتعارض: **Accept Current** أو **Accept Incoming** أو **Accept Both**، وتأكد من صحة الكود.
3. احفظ الملف ثم نفّذ في Terminal:
   ```bash
   git add .
   ```
4. تأكد أن المشروع يعمل بدون أخطاء، ثم احذف النسخة المؤقتة من الـ stash (إذا كان التعارض ناتجاً عن `update-studygenie.bat`):
   ```bash
   git stash drop
   ```
   *(ملاحظة: إذا كان التعارض أثناء `git merge` عادي وليس `stash pop`، نفّذ `git commit` بدلاً من `git stash drop`.)*

---

## 5. جدول حل المشاكل الشائعة (Troubleshooting)

| المشكلة / الخطأ | السبب | الحل |
|---|---|---|
| `error: Your local changes would be overwritten by merge` | لديك تعديلات غير محفوظة تتعارض مع التحديثات الجديدة | شغّل `update-studygenie.bat` (يستخدم `git stash` تلقائياً) أو اعمل `git commit` لتعديلاتك أولاً |
| `Merge conflict` بعد `update-studygenie.bat` | تعديلاتك المحلية لمست نفس الأسطر التي تغيرت في `master` | عملك محفوظ في `git stash`؛ اتبع خطوات VS Code الأربع أعلاه ثم `git stash drop` |
| تغييرات وهمية في ملفات لم تعدّلها (CRLF / LF) | اختلاف نهايات الأسطر بين Windows و Linux/Mac | تأكد من ضبط `core.autocrlf true`، وسيضبط ملف `.gitattributes` النهايات تلقائياً |
| نقص ملف `.env` أو فشل تشغيل الخدمة محلياً | ملفات `.env` سرية ومستبعدة من Git عمداً | انسخ `.env.example` إلى `.env` (مثلاً `copy .env.example .env`) وعبّئ القيم المطلوبة |
| فرعك متأخر عن `master` (`Branch behind master`) | زملاؤك دمجوا تحديثات جديدة في `master` بعد إنشائك للفرع | انتقل لفرعك وشغّل `update-studygenie.bat` أو `git pull --no-rebase origin master` |

> **ملاحظة حول `.gitignore`:** إذا كان هناك ملف متتبع مسبقاً في Git (مثل `backend-services/scratch/readme-append.md`) وتمت إضافته لاحقاً إلى `.gitignore`، فلن يتجاهله Git تلقائياً حتى تلغي تتبعه من الـ index دون حذفه من جهازك عبر الأمر: `git rm --cached <path>`
