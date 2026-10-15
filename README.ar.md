# محترف بناء APK — build_apk

تطبيق ويب متوافق مع ويندوز يحوّل مشاريع الويب (React و Vue و Next.js و Angular و HTML) الى ملفات اندرويد APK/AAB — مع محادثة ذكاء صناعي موحدة (Gemini) تميز السؤال عن امر البناء تلقائيا.

## المميزات

- 📦 مشروع ويب ← APK/AAB موقّع (Gradle و Android SDK)
- 🤖 محادثة AI مع Gemini (4 مفاتيح): تجيب عن الاسئلة او تنفذ اوامر البناء تلقائيا
- 🗝️ ادارة مفاتيح التوقيع Keystore
- 📊 لوحة البناء: المشاريع وسجل البناء وفحص النظام (Java و Node و Gradle و SDK)
- 🗄️ قاعدة SQLite مع (Drizzle ORM) وترحيل تلقائي
- 🐳 نشر Docker و nginx وهيكل pnpm monorepo (واجهة Vite وخادم Express وعميل API مولّد)

## التشغيل محليا

المتطلبات: Node.js 24 و pnpm و Java و Gradle و Android SDK.

```bash
pnpm install
pnpm run build
```

الواجهة: `artifacts/apk-builder` · الخادم: `artifacts/api-server` (فحص `GET /api/healthz`).

## التقنيات

TypeScript و React و Vite و Express 5 و Drizzle و SQLite و Orval و Zod و React Query و Gemini.

من تطوير **xboy** © 2026
