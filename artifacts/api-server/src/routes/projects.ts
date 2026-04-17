import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const FRAMEWORK_MAP: Record<string, string> = {
  react: "react",
  vue: "vue",
  next: "nextjs",
  angular: "angular",
  svelte: "svelte",
  nuxt: "nuxt",
};

function serialize(p: typeof projectsTable.$inferSelect) {
  return { ...p };
}

router.get("/", (_req, res) => {
  const projects = db.select().from(projectsTable).all();
  res.json(projects.map(serialize));
});

router.post("/", (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    sourceType: z.enum(["github", "zip", "local"]),
    sourceUrl: z.string().optional().nullable(),
    packageId: z.string().optional().nullable(),
    appName: z.string().optional().nullable(),
    versionName: z.string().optional().nullable(),
    versionCode: z.number().int().optional().nullable(),
  });
  const body = schema.parse(req.body);
  const [project] = db
    .insert(projectsTable)
    .values({
      name: body.name,
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl ?? null,
      packageId: body.packageId ?? `com.app.${body.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      appName: body.appName ?? body.name,
      versionName: body.versionName ?? "1.0.0",
      versionCode: body.versionCode ?? 1,
      status: "pending",
    })
    .returning()
    .all();
  res.status(201).json(serialize(project));
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const [project] = db.select().from(projectsTable).where(eq(projectsTable.id, id)).all();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(project));
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  db.delete(projectsTable).where(eq(projectsTable.id, id)).run();
  res.status(204).end();
});

router.post("/:id/detect", (req, res) => {
  const id = parseInt(req.params.id);
  const [project] = db.select().from(projectsTable).where(eq(projectsTable.id, id)).all();
  if (!project) { res.status(404).json({ error: "Not found" }); return; }

  let detectedType = "html";
  let framework: string | null = null;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (project.sourceUrl) {
    const url = project.sourceUrl.toLowerCase();
    for (const [key, val] of Object.entries(FRAMEWORK_MAP)) {
      if (url.includes(key)) {
        detectedType = val;
        framework = val;
        break;
      }
    }
  }

  if (detectedType === "react" || detectedType === "nextjs") {
    recommendations.push("Install Capacitor: npx cap init");
    recommendations.push("Build your app: npm run build");
  }

  if (!project.sourceUrl) {
    warnings.push("No source URL provided. Please provide a GitHub repository URL.");
  }

  db.update(projectsTable)
    .set({ framework, updatedAt: new Date().toISOString() })
    .where(eq(projectsTable.id, id))
    .run();

  res.json({ detectedType, framework, buildTool: null, warnings, recommendations });
});

export default router;
