# APK Builder Pro — build_apk

A Windows-compatible web application that converts web projects (React, Vue, Next.js, Angular, plain HTML) into Android APK/AAB files — with a unified AI chat (Gemini) that auto-detects questions vs. build commands.

## Features

- 📦 Web project → signed APK/AAB (Gradle + Android SDK)
- 🤖 AI chat with Gemini (4 key slots): asks questions or runs build commands automatically
- 🗝️ Keystore management for app signing
- 📊 Builds dashboard: projects, builds history, system checks (Java, Node, Gradle, SDK)
- 🗄️ SQLite (Drizzle ORM) with auto migrations
- 🐳 Docker + nginx deploy, pnpm monorepo (Vite frontend, Express backend, generated API client)

## Run locally

Prerequisites: Node.js 24, pnpm, Java, Gradle, Android SDK.

```bash
pnpm install
pnpm run build
```

Frontend: `artifacts/apk-builder` · Backend: `artifacts/api-server` (`GET /api/healthz`).

## Stack

TypeScript, React + Vite, Express 5, Drizzle + SQLite, Orval + Zod + React Query, Gemini.

Developed by **xboy** © 2026
