FROM node:18-alpine

WORKDIR /app

# نسخ ملفات المشروع
COPY package*.json ./
COPY server.js ./
COPY public ./public

# تثبيت المكتبات
RUN npm install --production

# تعريض الميناء
EXPOSE 3000

# بدء التطبيق
CMD ["node", "server.js"]
