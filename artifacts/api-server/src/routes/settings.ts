import { Router } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", (_req, res) => {
  const rows = db.select().from(appSettingsTable).all();
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  res.json(result);
});

router.put("/:key", (req, res) => {
  const { key } = req.params;
  const { value } = req.body as { value: string };
  if (value === undefined) { res.status(400).json({ error: "value is required" }); return; }
  db.insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date().toISOString() } })
    .run();
  res.json({ key, value });
});

router.delete("/:key", (req, res) => {
  db.delete(appSettingsTable).where(eq(appSettingsTable.key, req.params.key)).run();
  res.status(204).end();
});

export default router;
