import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, geminiKeysTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { TOOL_DECLARATIONS, executeTool, MAX_STEPS, type ToolName } from "../services/agent-tools";
import { join } from "path";
import { existsSync } from "fs";

const router = Router();
const IS_WINDOWS = process.platform === "win32";

const SYSTEM_PROMPT = `You are a senior software engineer embedded in APK Builder Pro — a platform that converts web apps (React, Vue, Next.js, Angular, HTML) into Android APK/AAB files.

## Request Classification
For EVERY message, first classify it:
- **question**: General questions, explanations, how-to, what-is, definitions
- **command**: Requests to do something — fix, create, modify files, run commands, build, analyze

Always include at the start of your response, on its own line:
REQUEST_TYPE: question
or
REQUEST_TYPE: command

## Decision Framework
| Request type | Action |
|---|---|
| Question / explanation | Answer from knowledge — do NOT call tools |
| Need to understand code | list_directory → read_file |
| Fix a bug or error | read_file → write_file → run_command to verify |
| Create new file | read nearby files first for conventions → write_file |
| Find something | search_files |
| Run a build / command | run_command |

## Tool Rules
1. Never write a file without reading it first
2. write_file always contains the COMPLETE file — no partial edits, no "..." placeholders
3. After any change, run a build or lint command to confirm it works
4. Be surgical — fix only what is broken
5. If a task needs multiple steps, complete ALL of them before stopping

## Platform Awareness
- Platform: **${IS_WINDOWS ? "Windows 11" : process.platform}**
- On Windows: use gradlew.bat not ./gradlew, use cmd.exe syntax, avoid && chaining (use separate run_command calls), paths use backslashes internally
- On Linux/macOS: use ./gradlew, bash syntax

## Expertise
- Android: Gradle, Android SDK, Manifest, ProGuard/R8, signing, APK/AAB, Play Store
- Hybrid: Capacitor, Cordova, WebView performance, native bridge
- Frontend: React, Vue, Next.js, Angular, TypeScript, Vite, Webpack
- Backend: Node.js, Express, PostgreSQL, Drizzle ORM
- Tooling: npm, pnpm, git, CI/CD pipelines, Windows PowerShell/CMD

## Response Rules
- No filler phrases — get straight to the point
- Code in properly-labeled markdown blocks
- After making changes: one concise summary of what changed and why
- Match the user's language (Arabic → Arabic, English → English)`;

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /quota|rate.?limit|429|resource.?exhausted/i.test(msg);
}

function getActiveKey(): { key: string; slot: number } | null {
  const now = new Date().toISOString();
  const keys = db.select().from(geminiKeysTable)
    .where(eq(geminiKeysTable.isActive, true))
    .all();

  for (const k of keys) {
    if (!k.keyValue) continue;
    if (k.exhaustedUntil && k.exhaustedUntil > now) continue;
    return { key: k.keyValue, slot: k.slot };
  }
  return null;
}

function markKeyExhausted(slot: number) {
  const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.update(geminiKeysTable)
    .set({ exhaustedUntil: until, updatedAt: new Date().toISOString() })
    .where(eq(geminiKeysTable.slot, slot))
    .run();
}

function detectProjectRoot(): string {
  const candidates = [
    process.env.PROJECT_ROOT,
    process.env.HOME ? join(process.env.HOME, "projects") : null,
    IS_WINDOWS ? "C:\\Users\\User\\projects" : "/home/user/projects",
    process.cwd(),
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return process.cwd();
}

function extractRequestType(text: string): "question" | "command" {
  const match = text.match(/REQUEST_TYPE:\s*(question|command)/i);
  return match ? (match[1].toLowerCase() as "question" | "command") : "question";
}

function stripRequestTypeLine(text: string): string {
  return text.replace(/^REQUEST_TYPE:\s*(question|command)\n?/im, "").trim();
}

router.post("/chat", async (req, res) => {
  const { conversationId, message, model = "gemini-2.5-flash" } = req.body as {
    conversationId: number;
    message: string;
    model?: string;
  };

  if (!conversationId || !message) {
    res.status(400).json({ error: "conversationId and message are required" });
    return;
  }

  const [conv] = db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).all();
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const keyInfo = getActiveKey();
  if (!keyInfo) {
    res.status(503).json({ error: "No active Gemini API key available. Please add a key in Settings." });
    return;
  }

  const [userMsg] = db.insert(messagesTable).values({
    conversationId,
    role: "user",
    content: message,
  }).returning().all();

  const history = db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .all()
    .slice(0, -1)
    .map((m) => ({
      role: m.role as "user" | "model",
      parts: [{ text: m.content }],
    }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  function send(event: object) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  const genAI = new GoogleGenAI({ apiKey: keyInfo.key });
  const projectRoot = detectProjectRoot();
  const toolEvents: object[] = [];
  let fullText = "";
  let requestType: "question" | "command" = "question";

  try {
    const chat = genAI.chats.create({
      model,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: TOOL_DECLARATIONS as never[] }],
      },
      history,
    });

    let steps = 0;
    let currentUserMessage = message;

    while (steps < MAX_STEPS) {
      steps++;
      const response = await chat.sendMessage({ message: currentUserMessage });
      const candidates = response.candidates ?? [];
      const firstCandidate = candidates[0];
      if (!firstCandidate) break;

      const parts = firstCandidate.content?.parts ?? [];
      let hasToolCall = false;

      for (const part of parts) {
        if (part.text) {
          if (!fullText) {
            requestType = extractRequestType(part.text);
            const cleaned = stripRequestTypeLine(part.text);
            if (cleaned) {
              fullText += cleaned;
              send({ type: "text", content: cleaned });
            }
          } else {
            fullText += part.text;
            send({ type: "text", content: part.text });
          }
        }

        if (part.functionCall) {
          hasToolCall = true;
          const toolName = part.functionCall.name as ToolName;
          const toolArgs = (part.functionCall.args ?? {}) as Record<string, unknown>;
          const eventId = `${toolName}_${Date.now()}`;

          const toolEvent = { id: eventId, name: toolName, args: toolArgs, status: "running" };
          toolEvents.push(toolEvent);
          send({ type: "tool_start", id: eventId, name: toolName, args: toolArgs });

          let result: string;
          try {
            result = executeTool(toolName, toolArgs, projectRoot);
          } catch (e: unknown) {
            result = `Error: ${(e as Error).message}`;
          }

          Object.assign(toolEvent, { status: "done", result });
          send({ type: "tool_end", id: eventId, name: toolName, result });

          currentUserMessage = `Tool result for ${toolName}:\n${result}`;
        }
      }

      if (!hasToolCall) break;
    }

    db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: fullText || "(no response)",
      requestType,
      toolEvents: JSON.stringify(toolEvents),
    }).run();

    db.update(conversationsTable)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(conversationsTable.id, conversationId))
      .run();

    if (conv.title === "New Conversation" && message.length > 0) {
      const shortTitle = message.slice(0, 50).replace(/\n/g, " ").trim();
      db.update(conversationsTable)
        .set({ title: shortTitle })
        .where(eq(conversationsTable.id, conversationId))
        .run();
    }

    send({ type: "done", requestType });
    res.end();
  } catch (err: unknown) {
    if (isQuotaError(err)) {
      markKeyExhausted(keyInfo.slot);
      send({ type: "error", message: "API quota exceeded. Key marked as exhausted. Try another key in Settings." });
    } else {
      send({ type: "error", message: (err as Error).message ?? "Unknown error" });
    }
    res.end();
  }
});

export default router;
