import { Router } from "express";
import { db } from "@workspace/db";
import { geminiKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function serialize(k: typeof geminiKeysTable.$inferSelect) {
  return {
    slot: k.slot,
    label: k.label,
    isActive: Boolean(k.isActive),
    hasKey: Boolean(k.keyValue && k.keyValue.length > 0),
    exhaustedUntil: k.exhaustedUntil ?? null,
    updatedAt: k.updatedAt ?? null,
  };
}

router.get("/", (_req, res) => {
  const keys = db.select().from(geminiKeysTable).all();
  res.json(keys.map(serialize));
});

router.put("/:slot", (req, res) => {
  const slot = parseInt(req.params.slot);
  const schema = z.object({
    keyValue: z.string().optional(),
    label: z.string().optional(),
    isActive: z.boolean().optional(),
  });
  const body = schema.parse(req.body);
  const update: Partial<typeof geminiKeysTable.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (body.keyValue !== undefined) update.keyValue = body.keyValue.trim() || null;
  if (body.label !== undefined) update.label = body.label;
  if (body.isActive !== undefined) update.isActive = body.isActive;

  db.insert(geminiKeysTable)
    .values({ slot, label: `Key ${slot}`, ...update })
    .onConflictDoUpdate({ target: geminiKeysTable.slot, set: update })
    .run();

  const [updated] = db.select().from(geminiKeysTable).where(eq(geminiKeysTable.slot, slot)).all();
  res.json(serialize(updated));
});

router.post("/:slot/reset-exhausted", (req, res) => {
  const slot = parseInt(req.params.slot);
  db.update(geminiKeysTable)
    .set({ exhaustedUntil: null, updatedAt: new Date().toISOString() })
    .where(eq(geminiKeysTable.slot, slot))
    .run();
  const [updated] = db.select().from(geminiKeysTable).where(eq(geminiKeysTable.slot, slot)).all();
  res.json(serialize(updated));
});

export default router;
