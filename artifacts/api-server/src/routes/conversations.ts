import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

router.get("/", (_req, res) => {
  const convs = db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt)).all();
  const result = convs.map((c) => {
    const mc = db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.conversationId, c.id)).get();
    return { ...c, messageCount: mc?.count ?? 0 };
  });
  res.json(result);
});

router.post("/", (req, res) => {
  const { title, projectId } = req.body as { title?: string; projectId?: number | null };
  const [conv] = db
    .insert(conversationsTable)
    .values({
      title: title ?? "New Conversation",
      projectId: projectId ?? null,
    })
    .returning()
    .all();
  res.status(201).json({ ...conv, messageCount: 0 });
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = db.select().from(conversationsTable).where(eq(conversationsTable.id, id)).all();
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const messages = db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .all()
    .map((m) => {
      let toolEvents: unknown[] = [];
      try { toolEvents = JSON.parse(m.toolEvents ?? "[]"); } catch { toolEvents = []; }
      return { ...m, toolEvents };
    });
  res.json({ ...conv, messages });
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  db.delete(conversationsTable).where(eq(conversationsTable.id, id)).run();
  res.status(204).end();
});

export default router;
