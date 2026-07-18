# 📦 دليل التثبيت الكامل - Barq Cashier System

## المتطلبات الأساسية

- **Node.js**: الإصدار 14.0 أو أحدث
- **npm** أو **yarn**: مدير حزم Node.js
- **Git** (اختياري): لاستنساخ المستودع

## ✅ التحقق من التثبيت

تأكد من تثبيت Node.js بشكل صحيح:

```bash
node --version    # يجب أن يكون v14.0 أو أحدث
npm --version     # يجب أن يكون v6.0 أو أحدث
```

## 🚀 خطوات التثبيت

### 1. تحضير مجلد المشروع

```bash
# انتقل إلى مجلد يحتوي المشروع أو أنشئ مجلد جديد
cd /المسار/إلى/المشروع

# أو انسخ المشروع من المرفق
unzip barq-cashier.zip
cd barq-cashier
```

### 2. تثبيت المكتبات

```bash
npm install
```

هذا سيثبت جميع المكتبات المطلوبة:
- **express**: خادم الويب
- **sqlite3**: قاعدة البيانات
- **cors**: معالجة طلبات متعددة الأصول
- والمكتبات الأخرى

### 3. بدء الخادم

```bash
npm start
```

ستشاهد رسالة مثل:
```
╔════════════════════════════════════════╗
║   🚀 Barq Cashier System Started!     ║
║   API: http://localhost:3000          ║
║   Web: http://localhost:3000/         ║
╚════════════════════════════════════════╝
```

### 4. فتح التطبيق

افتح متصفح الويب واذهب إلى:
```
http://localhost:3000
```

## 🎯 الخطوة التالية: إضافة بيانات تجريبية

لتجربة التطبيق بسهولة، أضف بيانات تجريبية:

```bash
node seed-data.js
```

ستُضاف:
- ✅ حساب مستخدم: `demo` / `123456`
- ✅ 12 منتج تجريبي
- ✅ 10 طلبات تجريبية

## 🖥️ تشغيل تطبيق Desktop (.EXE)

إذا أردت تطبيق سطح مكتب:

### الطريقة الأولى: استخدام Electron

```bash
# تثبيت Electron
npm install --save-dev electron electron-builder

# بناء التطبيق
npm run build-desktop

# التطبيق سيكون في مجلد dist/
```

### الطريقة الثانية: استخدام Docker

```bash
# تثبيت Docker أولاً من docker.com

# بناء الصورة
docker build -t barq-cashier .

# تشغيل الحاوية
docker run -p 3000:3000 barq-cashier
```

## 🐳 التشغيل باستخدام Docker Compose (الأسهل)

```bash
# تثبيت Docker Desktop أولاً

# بدء التطبيق
docker-compose up

# إيقاف التطبيق
docker-compose down
```

## 📱 الوصول للتطبيق من جهاز آخر

إذا أردت الوصول من جهاز آخر على نفس الشبكة:

```bash
# اكتشف عنوان IP الخاص بك
# على Windows:
ipconfig

# على Mac/Linux:
ifconfig

# ثم افتح المتصفح:
http://YOUR_IP:3000
```

## 🔧 الإعدادات المتقدمة

### تغيير المنفذ (Port)

```bash
# على Windows
set PORT=8080 && npm start

# على Mac/Linux
PORT=8080 npm start
```

### تغيير قاعدة البيانات

```bash
# استخدم قاعدة بيانات PostgreSQL بدلاً من SQLite
# عدّل server.js وغيّر إعدادات قاعدة البيانات
```

### تفعيل HTTPS

```bash
# للإنتاج، استخدم HTTPS
# استخدم reverse proxy مثل nginx أو Apache
```

## 🧪 الاختبار

### اختبار API من سطر الأوامر

```bash
# فحص صحة الخادم
curl http://localhost:3000/api/health

# الحصول على قائمة المنتجات
curl http://localhost:3000/api/products
```

### اختبار الواجهة

1. افتح المتصفح على `http://localhost:3000`
2. أنشئ حساب جديد
3. أضف منتج
4. أنشئ طلب
5. معالجة الدفع

## 🆘 استكشاف الأخطاء

### ❌ خطأ: Address already in use

**السبب**: المنفذ 3000 مستخدم بالفعل

**الحل**:
```bash
# أوقف العملية التي تستخدم المنفذ أو غيّر المنفذ
PORT=3001 npm start
```

### ❌ خطأ: Cannot find module

**السبب**: المكتبات غير مثبتة

**الحل**:
```bash
# أعد تثبيت المكتبات
rm -rf node_modules package-lock.json
npm install
```

### ❌ خطأ: Database is locked

**السبب**: قاعدة البيانات مقفلة

**الحل**:
```bash
# احذف قاعدة البيانات وأعد بدء التطبيق
rm barq.db
npm start

# أضف بيانات تجريبية
node seed-data.js
```

### ❌ خطأ: Node.js غير مثبت

**الحل**: حمّل وثبّت Node.js من https://nodejs.org/

## 📊 فحص قاعدة البيانات

```bash
# تثبيت أداة sqlite3 (اختيارية)
npm install -g sqlite3

# فحص الجداول
sqlite3 barq.db ".tables"

# فحص البيانات
sqlite3 barq.db "SELECT * FROM orders LIMIT 5;"
```

## 🔐 الأمان - قبل الإنتاج

⚠️ **تنبيه**: النسخة الحالية للاختبار والتطوير فقط

قبل النشر الإنتاجي:

- [ ] غيّر كلمات المرور الافتراضية
- [ ] استخدم HTTPS
- [ ] شفّر البيانات الحساسة
- [ ] استخدم متغيرات البيئة للأسرار
- [ ] فعّل المصادقة القوية
- [ ] استخدم قاعدة بيانات متقدمة (PostgreSQL)

## 📚 الملفات الهامة

```
barq-cashier/
├── server.js              # خادم Node.js الرئيسي
├── package.json           # تعريف المشروع والمكتبات
├── .env                   # متغيرات البيئة
├── public/
│   ├── index.html         # الصفحة الرئيسية
│   ├── styles.css         # التنسيقات
│   └── app.js             # منطق التطبيق
├── barq.db                # قاعدة البيانات (تُنشأ تلقائياً)
├── Dockerfile             # لـ Docker
├── docker-compose.yml     # لـ Docker Compose
└── seed-data.js           # بيانات تجريبية
```

## 🚢 النشر على الإنترنت

### استخدام Heroku

```bash
# تثبيت Heroku CLI
# ثم في مجلد المشروع:

heroku login
heroku create your-app-name
git push heroku main
```

### استخدام AWS/Google Cloud

اتبع التعليمات الخاصة بكل منصة.

## 📞 الدعم والمساعدة

- تحقق من README.md للمزيد من التفاصيل
- اقرأ QUICK_START.md للبدء السريع
- تفقد الأخطاء في console (F12)

## ✅ قائمة التحقق

- [ ] تثبيت Node.js
- [ ] تثبيت المكتبات: `npm install`
- [ ] بدء الخادم: `npm start`
- [ ] فتح المتصفح: `http://localhost:3000`
- [ ] إنشاء حساب
- [ ] إضافة منتج
- [ ] إنشاء طلب

## 🎉 تم!

الآن لديك نظام كاشير كامل ويعمل على جهازك!

للسؤالات والدعم:
- تحقق من الوثائق في المشروع
- اقرأ رسائل الأخطاء بعناية
- جرب البحث عن الخطأ على الإنترنت

---

**Version 1.0.0**
**Last Updated: 2024**
