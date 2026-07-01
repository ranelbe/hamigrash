# ⚽ HaMigrash — הַמִּגְרָשׁ

> פלטפורמת ניהול ליגות כדורגל חובבים בעברית, RTL, פרונט-אנד מודרני עם Supabase כ-backend מלא.

הַמִּגְרָשׁ (HaMigrash) היא אפליקציית ווב לניהול מלא של ליגות וגביעי כדורגל חובבים — מדחיפת שחקנים לקבוצות מאוזנות, דרך יצירת לוח משחקים אוטומטי, ועד ניקוד חי בזמן אמת וטבלת ליגה שמתעדכנת מאירועי המשחק.

---

## 📋 תוכן עניינים

- [תיאור הפרויקט](#-תיאור-הפרויקט)
- [מטרת המערכת](#-מטרת-המערכת)
- [טכנולוגיות](#-טכנולוגיות)
- [הוראות התקנה](#-הוראות-התקנה)
- [מבנה הפרויקט](#-מבנה-הפרויקט)
- [תיאור המסכים](#-תיאור-המסכים)
- [רשימת הפיצ'רים](#-רשימת-הפיצרים)
- [מודל ההרשאות](#-מודל-ההרשאות)
- [דיפלוי](#-דיפלוי)

---

## 🎯 תיאור הפרויקט

הַמִּגְרָשׁ נבנתה מהיסוד לענות על נקודת כאב אמיתית של מארגני ליגות חובבים בישראל — כל התהליך שנעשה בקבוצות WhatsApp וגליונות אקסל, עם המון בלגן, זיוף תוצאות, ושחקנים שלא יודעים מתי המשחק הבא. האפליקציה מרכזת הכל במקום אחד, עם ממשק עברי מלא (RTL), אימות חד-משמעי של מי מנהל את מה, וסטטיסטיקה שמחושבת אוטומטית מאירועי המשחק.

**מיועד ל:**
- 🎽 מארגני ליגות חובבים בשכונה / במקום העבודה
- 🏆 מארגני טורנירי גביע חד-פעמיים
- ⚽ קבוצות ידידים שנפגשות לשחק שבועית ורוצות למדוד ביצועים

---

## 🎨 מטרת המערכת

1. **לחסל את התלות באקסל וב-WhatsApp** לניהול ליגה / גביע
2. **לאזן קבוצות אוטומטית** לפי מיומנויות שחקנים, עמדות, וקבוצות אימון
3. **לייצר לוחות משחקים אוטומטיים** — ליגה (round-robin) או גביע (bracket)
4. **לתעד תוצאות ואירועים בזמן אמת** — עם רישום פרטני של גולים, כרטיסים, הכנסות/יציאות
5. **לחשב טבלת ליגה + מלכי שערים אוטומטית** ללא התערבות אנושית
6. **להזמין משתמשים בצורה מבוקרת** — token-based invitations דרך WhatsApp / QR / אימייל
7. **לשמור על שקיפות** — קישור ציבורי לכל תחרות עם טבלה ולוח משחקים מתעדכנים חיים

---

## 🛠 טכנולוגיות

### Frontend
- **[Next.js 14](https://nextjs.org/)** (App Router + Server Components + Server Actions)
- **[React 18](https://react.dev/)** עם Suspense ו-Streaming
- **[TypeScript 5](https://www.typescriptlang.org/)** במצב strict
- **[Tailwind CSS 3](https://tailwindcss.com/)** עם darkMode: 'class' וטוקנים מותאמים לעברית
- **[Lucide React](https://lucide.dev/)** לאייקונים
- **[Zustand](https://zustand-demo.pmnd.rs/)** ל-state ניתן לשימוש חוזר (toast, טופסים)
- **[Dexie](https://dexie.org/)** ל-IndexedDB (offline event queue למשחקים בזמן אמת)

### Backend
- **[Supabase](https://supabase.com/)** — Postgres, Auth, RLS, Realtime, Storage
- **PostgreSQL 15** עם Row-Level Security על כל טבלה
- **RPC functions** (SECURITY DEFINER) ללוגיקה שמעורבת בכמה טבלאות (`accept_invitation`, `competition_standings`, `player_stats`, `can_manage_match` וכו')
- **Triggers** ל-bookkeeping אוטומטי (יוצר קבוצה → מתווסף כמנהל; אירוע גול ראשון → הסטטוס עובר ל-live; period_end אחרון → finished)

### שירותים חיצוניים
- **[Resend](https://resend.com/)** לשליחת מיילים (חינמי עד 100/יום)
- **[data.gov.il](https://data.gov.il/)** לאוטו-סופלמנטציה של ערים ורחובות ישראליים (CKAN API)
- **[api.qrserver.com](https://goqr.me/api/)** ל-QR codes של קישורי הזמנה
- **[Vercel](https://vercel.com/)** לדיפלוי + CDN
- **[Google OAuth](https://developers.google.com/identity/protocols/oauth2)** לכניסת משתמשים

### שיטות פיתוח
- **Server-first** — כמעט הכל בקומפוננטות שרת של Next.js; קליינט רק היכן שדרוש
- **Type-safe** מקצה לקצה עם Zod schemas + טיפוסים אוטומטיים מ-Supabase
- **RTL-first** — dir="rtl" ב-html; כל הרכיבים תוכננו לעברית מלכתחילה
- **Defense-in-depth** — RLS ב-DB + בדיקות הרשאה ב-action + הסתרת UI ללא הרשאות

---

## 🚀 הוראות התקנה

### דרישות מוקדמות
- Node.js 18+ ו-npm 9+
- חשבון [Supabase](https://supabase.com/) (חינמי)
- חשבון [Resend](https://resend.com/) (אופציונלי — למיילים)

### שלב 1 — clone והתקנת חבילות

```bash
git clone https://github.com/ranelbe/hamigrash.git
cd hamigrash
npm install
```

### שלב 2 — הגדרת Supabase

1. צור פרויקט חדש ב-Supabase
2. פתח את **SQL Editor** ורוץ את המיגרציות מ-`supabase/migrations/` בסדר עולה (0001 → 0027)
3. פתח את **Authentication → Providers → Google** והפעל Google OAuth
4. פתח את **Authentication → URL Configuration** והוסף:
   - Site URL: `http://localhost:3000` (או ה-Vercel URL בפרודקשן)
   - Redirect URLs: `http://localhost:3000/auth/callback`

### שלב 3 — משתני סביבה

צור קובץ `.env.local` בשורש הפרויקט:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Resend (אופציונלי — אם ריק, האפליקציה פשוט לא תשלח מיילים אוטומטית)
RESEND_API_KEY=re_XXXXXXXXXXXXXX
RESEND_FROM=HaMigrash <onboarding@resend.dev>
```

### שלב 4 — הרצה

```bash
npm run dev
```

האפליקציה זמינה ב-http://localhost:3000

### שלב 5 — הגדרת אדמין ראשון

היכנס למערכת עם Google. אחר כך ב-Supabase SQL Editor:

```sql
insert into public.app_admins (user_id)
select id from auth.users where email = 'YOUR-EMAIL@gmail.com';
```

עכשיו יש לך הרשאות אדמין מלאות.

### שלב 6 (אופציונלי) — מוק דאטה לבדיקות

הרץ ב-Supabase SQL Editor את `supabase/reset-players-only.sql` — יוצר 70 שחקנים + 4 קבוצות אימון + קבוצת שחקנים חופשיים.

לצירוף 4 משתמשי מוק לבדיקת תפקידים הרץ את `supabase/seed-mock-users.sql` — יוצר admin/manager/organiser/viewer עם סיסמה `Test1234!`. בדף ה-login יש 4 כפתורי quick-login שקופצים ישר לכל תפקיד ללא סיסמה.

---

## 📂 מבנה הפרויקט

```
hamigrash/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (app)/                    # אזור מוגן (auth-only)
│   │   │   ├── layout.tsx            # AppShell + auth gate
│   │   │   ├── dashboard/            # 🏠 לוח בקרה ("בניהול שלי")
│   │   │   ├── players/              # 👥 רשימת שחקנים + עריכה
│   │   │   ├── teams/                # 🛡️ קבוצות + סגלים
│   │   │   ├── competitions/         # 🏆 תחרויות (ליגות + גביעים)
│   │   │   ├── matches/              # ⚽ פרטי משחק + הזנת תוצאה
│   │   │   ├── balancer/             # ⚖️ מאזן קבוצות אוטומטי
│   │   │   ├── training-groups/      # 📅 קבוצות אימון (admin only)
│   │   │   └── invitations/          # 📨 הזמנות + ניהול
│   │   ├── invitations/accept/       # קבלת הזמנה (public)
│   │   ├── c/[slug]/                 # 🌐 דף תחרות ציבורי
│   │   ├── t/[slug]/                 # 🌐 דף קבוצה ציבורי
│   │   ├── m/[id]/                   # 🌐 דף משחק ציבורי (חי)
│   │   ├── p/[id]/                   # 🌐 דף שחקן ציבורי
│   │   ├── login/                    # 🔑 מסך התחברות
│   │   ├── auth/callback/            # OAuth callback
│   │   └── api/                      # Route handlers
│   ├── components/                   # קומפוננטות UI
│   │   ├── ui/                       # Card, Input, Button, Badge, Toast וכו'
│   │   ├── balancer/                 # מאזן הקבוצות
│   │   ├── match/                    # LiveTracker, MatchCard וכו'
│   │   ├── invitations/              # InvitationShare, ReshareButton
│   │   ├── competition/              # NextCupRoundButton וכו'
│   │   ├── layout/                   # AppShell (כותרת + תפריט)
│   │   └── theme/                    # ThemeToggle
│   └── lib/
│       ├── actions/                  # Server Actions (Next.js)
│       ├── algorithms/               # balancer, fixtures, knockout
│       ├── auth/                     # capabilities, app-admin
│       ├── i18n/                     # מחרוזות עברית
│       ├── queries/                  # helpers לשאילתות מורכבות
│       ├── schemas/                  # Zod validation
│       ├── stores/                   # Zustand (toast וכו')
│       └── supabase/                 # server + browser clients
├── supabase/
│   ├── migrations/                   # 27+ מיגרציות ב-SQL
│   ├── reset-players-only.sql        # seed נתוני בדיקה
│   ├── seed-mock-users.sql           # 4 משתמשי בדיקה
│   └── setup.sql                     # snapshot מלא של הסכימה
├── public/                           # קבצים סטטיים
├── tailwind.config.ts                # פלטת צבעים pitch/ink + darkMode
└── next.config.mjs                   # קונפיגורציה של Next.js
```

---

## 🖥 תיאור המסכים

### 🏠 דשבורד (`/dashboard`)
המסך הראשי אחרי התחברות. מציג:
- **קיצורי דרך לפעולות** (admin): יצירת משחק / קבוצה / תחרות
- **"בניהול שלי"** — כרטיסי תחרויות עם מונה קבוצות + חיווי סטטוס. קליק פותח את דף התחרות עם כל הקבוצות.
- **המשחקים הקרובים שלי** — משחקים של קבוצות שאתה מנהל, עם רצועה צבעונית (ליגה=ירוק, גביע=כתום, ידידותי=אפור).
- **תחרויות פעילות** + **תוצאות אחרונות**.

### 👥 רשימת שחקנים (`/players`)
כל השחקנים הפעילים במערכת. כל שחקן מציג את הקבוצות שהוא חבר בהן (many-to-many) עם צבעי הקבוצות. סינון לפי קבוצה + חיפוש.

### 👤 דף שחקן (`/players/[id]`)
- **כרטיס דירוגים** (רק לאדמין/מנהל) — 6 מיומנויות (PAC/SHO/PAS/DRI/DEF/PHY) בפורמט FIFA
- **מטא-דאטה** — קבוצות פר תחרות, קבוצת אימון, כתובת (עיר + רחוב מ-data.gov.il)
- **סטטיסטיקה** — הופעות, גולים, בישולים, כרטיסים, דקות
- למחזיקי GK — סטטיסטיקת פנדלים והצלות

### 🛡️ דף קבוצה (`/teams/[id]`)
- לוגו + שם + מגרש בית
- **סגל** — נשלף מ-`team_rosters` (junction table), עם מספר חולצה של השחקן בקבוצה הזו
- **חברי צוות** — מנהלים ועוזרים
- כפתורי עריכה / מחיקה לאדמין/מנהל

### 🏆 דף תחרות (`/competitions/[id]`)
- כותרת עם סוג תחרות + סטטוס + עונה
- **הוספת קבוצות** — ניהול אילו קבוצות נרשמות לתחרות
- **טבלה** (ליגות בלבד) — עם צורת האחרונים (W/D/L) של 5 המשחקים האחרונים
- **לוח משחקים** — מקובץ לפי סבבים; לגביע יש הודעה מסבירה + כפתור "צור משחקי שלב הבא"
- **קישור שיתוף ציבורי** — QR + URL לגישה ללא התחברות

### ⚽ דף משחק (`/matches/[id]`)
- כרטיס תוצאה + פרטי מפגש
- **הזנת תוצאה רטרואקטיבית** (משחקים שלא התחילו) — במשחק גביע חוסם תיקו
- **LiveTracker** — הזנת אירועים בזמן אמת (גול, כרטיס, חילוף) עם offline queue
- **תיקון תוצאה** — כפתור לפתיחה מחדש של משחק שהסתיים לתיקון

### ⚖️ מאזן קבוצות (`/balancer`) — Admin Only
מסך הליבה של המערכת:
1. בוחר N שחקנים
2. מגדיר לכמה קבוצות לחלק (2–10)
3. אלגוריתם 3-שלבי:
   - **שלב A**: snake draft לפי עמדות (וודא שיש GK/DF/MF/FW בכל קבוצה)
   - **שלב B**: hill-climb לאיזון סכום מיומנויות
   - **שלב C**: polish לפי קבוצות אימון (רק אם לא פוגע ב-A/B)
4. תוצאה — עורכים ידנית אם רוצים
5. שומרים כ-**ליגה** (round-robin) או **גביע** (single-elimination bracket)

### 📨 הזמנות (`/invitations`) — Admin Only
- טופס יצירת הזמנה — מייל **אופציונלי**
- אחרי יצירה — כרטיס עם 4 אופציות שיתוף: WhatsApp / העתק קישור / מייל אוטומטי (אם Resend מוגדר) / QR
- רשימת הזמנות אחרונות עם סטטוס, מי אישר, כפתורי מחיקה/ביטול/הסרת הרשאה

### 🌐 מסכים ציבוריים (ללא התחברות)
- `/c/[slug]` — דף תחרות ציבורי (לשיתוף עם צופים)
- `/t/[slug]` — דף קבוצה ציבורי
- `/m/[id]` — דף משחק ציבורי חי
- `/p/[id]` — דף שחקן ציבורי

---

## 🎯 רשימת הפיצ'רים

### ניהול שחקנים
- ✅ יצירה / עריכה / מחיקה של שחקנים
- ✅ 6 מיומנויות בסולם 0-100 (PAC, SHO, PAS, DRI, DEF, PHY) + 6 מיוחדות לשוער
- ✅ many-to-many עם קבוצות (שחקן יכול להיות בכמה קבוצות במקביל)
- ✅ קבוצות אימון (dropdown מנוהל)
- ✅ כתובת מלאה עם autocomplete מ-data.gov.il (עיר → רחוב מסונן)
- ✅ תמונת פרופיל (URL)
- ✅ סטטיסטיקה אוטומטית מאירועי המשחק

### ניהול קבוצות ותחרויות
- ✅ יצירת קבוצות עם צבע + סמל + מגרש בית
- ✅ יצירת תחרויות עם 1-4 סיבובים (round-robin) או גביע (knockout)
- ✅ round-robin עם Berger algorithm
- ✅ knockout bracket עם byes אוטומטיים לחזקות לא-2
- ✅ טבלת ליגה מחושבת אוטומטית
- ✅ קישור שיתוף ציבורי לכל תחרות

### מאזן קבוצות (Auto-Balancer)
- ✅ אלגוריתם 3-שלבי (עמדות → מיומנויות → קבוצות אימון)
- ✅ חלוקה שווה + חיווי אם לא מסתדר
- ✅ יצירת ליגה או גביע ישירות מהמאזן
- ✅ יצירת לוח משחקים אוטומטי
- ✅ מספרי חולצה אוטומטיים לכל קבוצה חדשה

### ניהול משחקים
- ✅ LiveTracker בזמן אמת (עם offline queue דרך Dexie)
- ✅ הזנה רטרואקטיבית של תוצאה
- ✅ אירועי משחק: גול (עם בישול), כרטיס צהוב/אדום, חילוף, פנדל, השלמת רבע
- ✅ טריגר אוטומטי — הסטטוס משתנה מ-scheduled → live → finished לפי אירועים
- ✅ פתיחה מחדש של משחק שהסתיים לתיקון תוצאה
- ✅ מניעת תיקו במשחקי גביע (client + server)
- ✅ יצירת סיבוב הבא בגביע אחרי סיום השלב הנוכחי

### הזמנות והרשאות
- ✅ token-based invitations (בלי חובת מייל)
- ✅ 4 ערוצי שיתוף: WhatsApp, מייל, קישור להעתקה, QR code
- ✅ שליחה אוטומטית דרך Resend (אם מוגדר)
- ✅ ניהול הזמנות: מחיקה, ביטול, הסרת הרשאה שכבר ניתנה
- ✅ הצגת מי בפועל אישר את ההזמנה (גם אם המייל שנשלח היה שונה)

### חוויית משתמש
- ✅ Dark mode מלא עם ThemeToggle
- ✅ עברית מלאה + RTL בכל האפליקציה
- ✅ Toast notifications בעברית
- ✅ Placeholders + הודעות שגיאה בעברית
- ✅ ולידציה מפורטת של טפסים (Zod) עם הודעות מסבירות
- ✅ ההרשאות מסתירות תוכן שלא רלוונטי — אף אחד לא רואה כפתורים שלא רלוונטיים לו

### התאמה למובייל
- ✅ Responsive מלא (mobile-first Tailwind)
- ✅ תפריט המבורגר במובייל
- ✅ מגע-ידידותי (72dp targets)

---

## 🔐 מודל ההרשאות

המערכת עובדת עם 4 רמות משתמש:

| תפקיד | מה יכול לעשות |
|---|---|
| **App Admin** (`app_admins`) | עוקף את כל ה-RLS. יכול הכל בכל התחרויות והקבוצות. |
| **Competition Organiser** | מנהל תחרות ספציפית — יוצר משחקים, מזין תוצאות, מוסיף קבוצות |
| **Team Manager** | מנהל קבוצה ספציפית — עורך שחקנים, מגיש הרכבים |
| **Viewer** (default) | רק צפייה בתחרויות, קבוצות ומשחקים ציבוריים |

**3 שכבות הגנה:**
1. **UI Hide** — כפתורים שלא רלוונטיים מוסתרים
2. **Server Action Check** — כל action בודק הרשאה לפני שינוי
3. **RLS Policy** — DB דוחה כתיבה גם אם שכבות 1-2 נפרצו

---

## 🚢 דיפלוי

### Vercel (מומלץ)

1. חבר את הריפו ל-Vercel
2. הגדר משתני סביבה (`Settings → Environment Variables`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (ה-URL של הפרודקשן)
   - `RESEND_API_KEY` + `RESEND_FROM` (אופציונלי)
3. Deploy → Vercel יבנה אוטומטית בכל push ל-`main`

### עדכון Supabase Auth URLs לפרודקשן

ב-Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: `https://your-domain.vercel.app/auth/callback`

---

## 📄 רישיון

MIT — ראה `LICENSE` (במידה וקיים).

---

## 👥 צוות

-
- **Ranel Ben Simman Tov**
---

**נעים להשתמש! ⚽**
