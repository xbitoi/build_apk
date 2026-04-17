import { Router } from "express";
import { db } from "@workspace/db";
import { buildsTable, projectsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const BUILD_STAGES = [
  "Initializing build environment...",
  "Cloning / extracting source files from GitHub...",
  "Installing Node.js dependencies (npm install)...",
  "Detecting project type and framework...",
  "Building web assets (npm run build)...",
  "Wrapping with Capacitor for Android...",
  "Generating Android project files...",
  "Running Gradle build...",
  "Signing APK with keystore...",
  "Optimizing and aligning APK...",
  "Build complete!",
];

function serializeBuild(b: typeof buildsTable.$inferSelect) {
  let logs: string[] = [];
  try { logs = JSON.parse(b.logs); } catch { logs = []; }
  return { ...b, logs };
}

async function simulateBuild(buildId: number) {
  const totalSteps = BUILD_STAGES.length;
  for (let i = 0; i < totalSteps; i++) {
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    const progress = Math.round(((i + 1) / totalSteps) * 100);
    const logLine = `[${new Date().toISOString()}] ${BUILD_STAGES[i]}`;

    const [current] = db.select().from(buildsTable).where(eq(buildsTable.id, buildId)).all();
    if (!current || current.status === "cancelled") return;

    let currentLogs: string[] = [];
    try { currentLogs = JSON.parse(current.logs); } catch { currentLogs = []; }
    const newLogs = [...currentLogs, logLine];
    const isLast = i === totalSteps - 1;

    db.update(buildsTable)
      .set({
        progress,
        logs: JSON.stringify(newLogs),
        status: isLast ? "success" : "running",
        startedAt: i === 0 ? new Date().toISOString() : current.startedAt,
        completedAt: isLast ? new Date().toISOString() : null,
        outputPath: isLast ? `/builds/${buildId}/output.apk` : null,
        outputSizeBytes: isLast ? Math.floor(4 * 1024 * 1024 + Math.random() * 20 * 1024 * 1024) : null,
      })
      .where(eq(buildsTable.id, buildId))
      .run();
  }

  const [build] = db.select().from(buildsTable).where(eq(buildsTable.id, buildId)).all();
  if (build) {
    db.update(projectsTable)
      .set({ status: "success", updatedAt: new Date().toISOString() })
      .where(eq(projectsTable.id, build.projectId))
      .run();
  }
}

router.get("/", (_req, res) => {
  const builds = db.select().from(buildsTable).orderBy(desc(buildsTable.createdAt)).all();
  res.json(builds.map(serializeBuild));
});

router.post("/projects/:id/build", (req, res) => {
  const projectId = parseInt(req.params.id);
  const schema = z.object({
    buildType: z.enum(["debug", "release"]),
    outputFormat: z.enum(["apk", "aab"]),
    minSdkVersion: z.number().int().optional().nullable(),
    targetSdkVersion: z.number().int().optional().nullable(),
    useKeystore: z.boolean(),
    keystoreId: z.number().int().optional().nullable(),
  });
  const body = schema.parse(req.body);

  const [project] = db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).all();
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const [build] = db
    .insert(buildsTable)
    .values({
      projectId,
      buildType: body.buildType,
      outputFormat: body.outputFormat,
      status: "queued",
      progress: 0,
      logs: JSON.stringify([`[${new Date().toISOString()}] Build queued...`]),
      minSdkVersion: body.minSdkVersion ?? 21,
      targetSdkVersion: body.targetSdkVersion ?? 34,
      keystoreId: body.keystoreId ?? null,
    })
    .returning()
    .all();

  db.update(projectsTable)
    .set({ status: "building", updatedAt: new Date().toISOString() })
    .where(eq(projectsTable.id, projectId))
    .run();

  simulateBuild(build.id).catch(() => {});

  res.status(201).json(serializeBuild(build));
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const [build] = db.select().from(buildsTable).where(eq(buildsTable.id, id)).all();
  if (!build) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeBuild(build));
});

router.post("/:id/cancel", (req, res) => {
  const id = parseInt(req.params.id);
  const [build] = db.select().from(buildsTable).where(eq(buildsTable.id, id)).all();
  if (!build) { res.status(404).json({ error: "Not found" }); return; }

  db.update(buildsTable)
    .set({ status: "cancelled", completedAt: new Date().toISOString() })
    .where(eq(buildsTable.id, id))
    .run();

  const [updated] = db.select().from(buildsTable).where(eq(buildsTable.id, id)).all();
  res.json(serializeBuild(updated));
});

export default router;
