# متجر ابن مالك — Ibn Malik Grocery Store

موقع تسوق كامل (منتجات، فئات، خصومات، بحث، سلة، مفضلة، دفع عند الاستلام) مبني بـ HTML/CSS/JS عادي بدون أي خطوة بناء (build step)، ومتصل بـ **Supabase** كقاعدة بيانات ونظام تسجيل دخول.

## 1) إعداد Supabase

1. أنشئ مشروع جديد في [supabase.com](https://supabase.com).
2. من **SQL Editor** نفّذ ملف `supabase/schema.sql` بالكامل (يُنشئ الجداول + الحماية RLS + بيانات الفئات الأساسية).
3. من **Authentication → Providers** فعّل **Google** (تحتاج Client ID/Secret من Google Cloud Console)، وفعّل أيضًا **Email** لو عايز حساب الأدمن يدخل بإيميل وباسورد.
4. من **Project Settings → API** انسخ:
   - `Project URL`
   - `anon public key`
5. افتح `assets/supabase-config.js` وحدّث القيمتين:
   ```js
   export const SUPABASE_URL = "https://xxxx.supabase.co";
   export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```

## 2) إنشاء أول حساب أدمن

1. سجّل حساب عادي (بإيميلك) من صفحة تسجيل الدخول في الموقع، أو أضِفه يدويًا من **Authentication → Users → Add user** في Supabase.
2. في **SQL Editor** نفّذ:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com');
   ```
3. ادخل على `ibnmalik-owner-dashboard-2026.html` وسجّل الدخول بنفس الإيميل/الباسورد.

> **ملاحظة أمان:** اسم الرابط السري (`ibnmalik-owner-dashboard-2026.html`) مش هو الحماية الحقيقية — الحماية الفعلية جايه من Supabase Auth + قاعدة `role = 'admin'` + قواعد RLS في `schema.sql`. حتى لو حد وصل للرابط، مش هيقدر يعمل أي حاجة غير لو عنده حساب أدمن فعلي.

## 3) إضافة المنتجات

أسهل طريقة: من لوحة التحكم (`ibnmalik-owner-dashboard-2026.html`) → تبويب **Products** → **+ Add product**.
أي منتج بتضيفه هيظهر فورًا في المتجر من غير أي تعديل كود.

## 4) رفع الصور

استخدم **Storage** في Supabase:
1. أنشئ Bucket اسمه `product-images` واجعله Public.
2. ارفع الصور، وانسخ الرابط العام (Public URL)، وحطه في حقل **Image URL** عند إضافة/تعديل المنتج.

## 5) رفع الموقع (Deploy)

الموقع كله ملفات ثابتة (static) — تقدر ترفعه على:
- **GitHub Pages** (زي الموقع الحالي)
- **Netlify** / **Vercel** (اسحب المجلد وارفعه فقط)
- أي استضافة عادية

لا يوجد أي build step مطلوب — الملفات تعمل كما هي.

## 6) هيكل الملفات

```
index.html                          ← واجهة المتجر
ibnmalik-owner-dashboard-2026.html  ← لوحة تحكم صاحب المتجر (رابط سري، لا يظهر في أي مكان بالموقع)
manifest.json                       ← دعم PWA
assets/
  style.css                         ← التصميم
  app.js                            ← منطق المتجر (سلة، مفضلة، بحث، فلاتر، دفع)
  admin.js                          ← منطق لوحة التحكم
  supabase-config.js                ← بيانات الاتصال بـ Supabase (عدّلها بمفاتيحك)
supabase/
  schema.sql                        ← الجداول + سياسات الحماية RLS + بيانات أولية
```

## 7) نظام الطلبات

الطلب بيتسجل في جدول `orders` في Supabase مباشرة (مش واتساب) — وده اللي يظهر في لوحة التحكم عشان تتابعه وتغيّر حالته (قيد الانتظار → مؤكد → قيد التجهيز → تم الشحن → تم التسليم / ملغي).
زر واتساب موجود بس كخيار إضافي اختياري بعد تأكيد الطلب، مش الطريقة الأساسية لتسجيله.

## 8) الخطوات التالية المقترحة (لسه محتاجة اهتمام)

- ربط بوابة دفع إلكتروني حقيقية لو حبيت تضيف غير "الدفع عند الاستلام".
- رفع صور حقيقية للمنتجات بدل الأيقونات التعبيرية المؤقتة.
- إضافة تفعيل ثنائي (2FA) لحساب الأدمن من إعدادات Supabase Auth.
- ضبط `robots.txt` و`sitemap.xml` باسم الدومين النهائي بعد رفع الموقع.
