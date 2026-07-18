# Barq Cashier

> نظام كاشير بسيط (Express + SQLite + WhatsApp integration)

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Seed demo data (optional):

```bash
node seed-data.js
```

3. Start server:

```bash
npm start
```

Open `http://localhost:3000` (or the port in your `.env`) to view the app.

## Prepare repository and CI/CD

This repository includes example GitHub Actions workflows to:
- Run tests (`npm test`)
- Build and publish a Docker image to GitHub Container Registry (GHCR)

To push and deploy from your GitHub account:

1. Create a new repository on GitHub.
2. Add this project as a local git repo and push:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo>.git
git push -u origin main
```

3. Enable GitHub Actions under your repo Settings → Actions.
4. (Optional) To publish Docker images to GHCR, grant Actions permission to `packages: write` and add any required secrets.

## Deploy options

- GHCR + your cloud: Build and push Docker image using the provided workflow then deploy that image to your cloud provider (Render, DigitalOcean, AWS, etc.).
- Render / Heroku: Use provider-specific GitHub integrations or the Actions examples and set provider API key as a repo secret.

## CI files
- `.github/workflows/ci.yml` — runs tests
- `.github/workflows/docker-publish.yml` — builds and pushes Docker image to GHCR

## Notes
- Don't commit `.env` files or `.wwebjs_auth` (WhatsApp session) — they are in `.gitignore`.
- Make sure to set any runtime secrets in your GitHub repository settings (Secrets → Actions).

If you tell me which deployment target you prefer (Render, Heroku, DigitalOcean App Platform, AWS, etc.), I will add a workflow tailored to it and instructions for required secrets.
# 🍔 Barq Cashier System

نظام كاشير متكامل للمطاعم والمقاهي مع إدارة الطلبات والدفع والمخزون والتقارير و WhatsApp.

## ✨ المميزات

✅ **نظام الطلبات**: إنشاء وإدارة طلبات العملاء بسهولة
✅ **معالجة الدفع**: دعم الدفع النقدي والبطاقات والتحويلات البنكية
✅ **إدارة المخزون**: تتبع المنتجات والمخزون والتنبيهات بالحد الأدنى
✅ **WhatsApp Integration**: إرسال إشعارات الطلبات عبر واتساب
✅ **التقارير والإحصائيات**: تقارير المبيعات والمنتجات الأكثر مبيعاً
✅ **الواجهة بالعربية**: واجهة سهلة الاستخدام بالعربية
✅ **Web + Desktop**: تطبيق ويب وتطبيق سطح مكتب

## 🚀 التثبيت والتشغيل

### المتطلبات
- Node.js 14.0 أو أحدث
- npm أو yarn

### خطوات التثبيت

```bash
# 1. انتقل إلى مجلد المشروع
cd barq-cashier

# 2. ثبّت الحزم
npm install

# 3. ابدأ الخادم
npm start
```

الآن يمكنك الوصول للتطبيق على:
- **الويب**: http://localhost:3000
- **API**: http://localhost:3000/api

## 📖 كيفية الاستخدام

### الدخول للنظام
1. أنشئ حساب جديد من خلال "إنشاء حساب"
2. ادخل بيانات المستخدم:
   - اسم المستخدم
   - البريد الإلكتروني
   - كلمة المرور
   - نوع الحساب (كاشير/مدير/مسؤول)

### إنشاء طلب جديد
1. اضغط على "طلب جديد" من قائمة الطلبات
2. أدخل بيانات العميل (الاسم والهاتف)
3. اختر المنتجات من القائمة
4. حدّد الكمية لكل منتج
5. اضغط "تأكيد الطلب"
6. ادفع المبلغ المستحق

### إدارة المنتجات
1. اذهب إلى قسم "المنتجات"
2. اضغط "منتج جديد" لإضافة منتج
3. ملء بيانات المنتج:
   - الاسم والسعر والفئة والكود
   - المخزون الأولي
4. حفظ المنتج

### تتبع المخزون
1. اذهب إلى "المخزون"
2. شاهد المنتجات بالحد الأدنى
3. عرض حركات المخزون

### عرض التقارير
1. اذهب إلى "التقارير"
2. شاهد:
   - الإحصائيات العامة
   - مبيعات اليوم
   - أعلى المنتجات مبيعاً
3. صفّي حسب التاريخ

## 🗄️ هيكل قاعدة البيانات

```
- users (المستخدمون)
- products (المنتجات)
- orders (الطلبات)
- order_items (مفردات الطلبات)
- payments (الدفعات)
- stock_movements (حركات المخزون)
- whatsapp_messages (رسائل واتساب)
```

## 🔌 API Endpoints

### المستخدمين
- `POST /api/auth/register` - إنشاء حساب جديد
- `POST /api/auth/login` - الدخول

### المنتجات
- `GET /api/products` - قائمة المنتجات
- `POST /api/products` - إضافة منتج جديد
- `PUT /api/products/:id` - تعديل منتج

### الطلبات
- `GET /api/orders` - قائمة الطلبات
- `POST /api/orders` - إنشاء طلب جديد
- `GET /api/orders/:id` - عرض تفاصيل الطلب

### الدفع
- `POST /api/payments` - معالجة الدفع
- `GET /api/payments/:orderId` - عرض دفعات الطلب

### المخزون
- `GET /api/stock/movements` - حركات المخزون
- `POST /api/stock/adjust` - تعديل المخزون
- `GET /api/stock/low-stock` - المنتجات بالحد الأدنى

### التقارير
- `GET /api/reports/sales` - تقارير المبيعات
- `GET /api/reports/products` - تقارير المنتجات
- `GET /api/reports/summary` - الملخص الإجمالي

### WhatsApp
- `POST /api/whatsapp/send` - إرسال رسالة واتساب

## 🖥️ صنع تطبيق سطح المكتب (Desktop)

```bash
# تثبيت Electron و Electron Builder
npm install --save-dev electron electron-builder

# بناء التطبيق
npm run build-desktop

# توزيع التطبيق
npm run dist
```

سيتم إنشاء ملف `.EXE` في مجلد `dist/`.

## 📱 تكامل WhatsApp

لتفعيل واتساب:
1. اذهب إلى "الإعدادات"
2. أدخل رقم الهاتف
3. قم بتعديل رسالة الطلب الافتراضية
4. احفظ الإعدادات

سيتم إرسال الرسائل تلقائياً عند إنشاء/دفع الطلبات.

## 🔐 الأمان

- تشفير كلمات المرور في قاعدة البيانات
- تحقق من هوية المستخدمين
- حماية API من الوصول غير المصرح

## 📊 النسخ الاحتياطية

من الإعدادات:
- اضغط "إنشاء نسخة احتياطية" لحفظ البيانات
- اضغط "استعادة نسخة" للعودة لنسخة سابقة

## 🐛 استكشاف الأخطاء

### المشكلة: لا يمكن الاتصال بالـ API
**الحل**: 
- تأكد من تشغيل الخادم: `npm start`
- تحقق من أن الميناء 3000 متاح
- تحقق من أن العنوان صحيح في `app.js`

### المشكلة: خطأ في قاعدة البيانات
**الحل**:
- احذف ملف `barq.db` وأعد بدء الخادم
- تأكد من أن لديك صلاحيات الكتابة

### المشكلة: الواجهة لا تحمل البيانات
**الحل**:
- افتح Developer Tools (F12)
- تحقق من الأخطاء في Console
- تحقق من Network tab للطلبات الفاشلة

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل، يرجى التواصل.

## 📄 الترخيص

هذا المشروع مفتوح المصدر ومتاح للاستخدام التجاري والشخصي.

---

**صُنع بـ ❤️ لتسهيل إدارة المطاعم والمقاهي**

Version: 1.0.0
Last Updated: 2024
