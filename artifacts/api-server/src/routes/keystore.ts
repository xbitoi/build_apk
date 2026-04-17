import { Router } from "express";
import { db } from "@workspace/db";
import { keystoresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/", (_req, res) => {
  const keystores = db.select().from(keystoresTable).all();
  res.json(keystores.map(({ passwordHash: _, ...k }) => k));
});

router.post("/", (req, res) => {
  const schema = z.object({
    alias: z.string().min(1),
    commonName: z.string().min(1),
    organization: z.string().optional().nullable(),
    validity: z.number().int().optional().nullable(),
    password: z.string().min(6),
  });
  const body = schema.parse(req.body);
  const [keystore] = db
    .insert(keystoresTable)
    .values({
      alias: body.alias,
      commonName: body.commonName,
      organization: body.organization ?? null,
      validity: body.validity ?? 10000,
      passwordHash: `hashed_${body.password}`,
    })
    .returning()
    .all();
  const { passwordHash: _, ...safe } = keystore;
  res.status(201).json(safe);
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const [keystore] = db.select().from(keystoresTable).where(eq(keystoresTable.id, id)).all();
  if (!keystore) { res.status(404).json({ error: "Not found" }); return; }
  const { passwordHash: _, ...safe } = keystore;
  res.json(safe);
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  db.delete(keystoresTable).where(eq(keystoresTable.id, id)).run();
  res.status(204).end();
});

export default router;
