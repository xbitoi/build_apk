# APK Builder Pro

A Windows 11-compatible web application that converts GitHub web projects (React, Vue, Next.js, Angular, HTML) into Android APK/AAB files. Features a unified AI chat interface powered by Gemini with auto-detection of questions vs. commands.

## Architecture

### Monorepo Structure (pnpm workspaces)
- `artifacts/apk-builder/` — React + Vite frontend (port 21448 → external port 80)
- `artifacts/api-server/` — Express.js backend (port 8080 → external port 8080)
- `lib/api-spec/` — OpenAPI spec + Orval codegen
- `lib/api-zod/` — Generated Zod schemas
- `lib/api-client-react/` — Generated React Query hooks
- `lib/db/` — Drizzle ORM + SQLite schemas

### Database
- SQLite via `better-sqlite3` (requires native compilation)
- Database file: `data/apk-builder.db` (relative to api-server working dir)
- Migrations run automatically on server startup via `artifacts/api-server/src/lib/migrate.ts`
- Tables: `projects`, `builds`, `keystores`, `conversations`, `messages`, `gemini_keys`, `app_settings`

### API Server Routes
All routes mounted under `/api`:
- `GET /api/healthz` — Health check
- `GET /api/projects` + CRUD — Project management
- `POST /api/projects/:id/builds` — Start build
- `GET /api/builds` — All builds
- `GET/PUT/DELETE /api/keystore` — Keystore management
- `GET/PUT /api/gemini-keys/:slot` — Gemini API key management (4 slots)
- `GET /api/stats/dashboard` — Dashboard statistics
- `GET /api/system/check` — Check Java, Node, Gradle, Android SDK availability
- `POST /api/gemini/chat` — AI chat (SSE streaming)
- `GET/POST/DELETE /api/conversations` — Conversation management
- `GET/PUT/DELETE /api/settings` — App settings

### AI Chat (Gemini)
- SSE-streamed responses via `artifacts/api-server/src/routes/gemini.ts`
- Auto-classifies requests as "question" (no tools) or "command" (uses tools)
- 4-slot API key rotation with automatic failover on quota exhaustion
- Prefix detection: `REQUEST_TYPE: question|command`

### Frontend Pages
- `/` — Dashboard with stats and system status
- `/projects` — Project list
- `/projects/new` — New project form
- `/projects/:id` — Project detail + build history
- `/builds` — All builds
- `/keystore` — Keystore management
- `/chat` — AI chat (main feature, two-panel layout)
- `/settings` — Gemini keys + build environment config

## Key Technical Notes
- **Windows 11 compatibility**: Backend uses `cmd.exe` shell on Windows, avoids `&&` chaining
- **SQLite native compilation**: `better-sqlite3` requires `node-gyp` + build tools (gcc, python3, make)
- **Codegen quirk**: After running Orval, patch `lib/api-zod/src/index.ts` to remove duplicate exports
- **No base URL needed**: Generated API client already includes `/api` prefix in paths
- **API paths**: All routes start with `/api` — do NOT set `setBaseUrl("/api")` in the frontend

## Dependencies
- Frontend: React 19, Vite 7, Tailwind CSS 4, shadcn/ui, TanStack Query v5, wouter, lucide-react 0.545.0
- Backend: Express 5, better-sqlite3, drizzle-orm, @google/genai, zod, pino
- Build tools: esbuild (backend bundle)
