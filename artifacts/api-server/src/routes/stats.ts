import { Router } from "express";
import { db } from "@workspace/db";
import { buildsTable, projectsTable } from "@workspace/db";
import { eq, desc, count, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard", (_req, res) => {
  const totalProjects = db.select({ count: count() }).from(projectsTable).get()?.count ?? 0;
  const totalBuilds = db.select({ count: count() }).from(buildsTable).get()?.count ?? 0;

  const successBuilds = db
    .select({ count: count() })
    .from(buildsTable)
    .where(eq(buildsTable.status, "success"))
    .get()?.count ?? 0;

  const failedBuilds = db
    .select({ count: count() })
    .from(buildsTable)
    .where(eq(buildsTable.status, "failed"))
    .get()?.count ?? 0;

  const runningBuilds = db
    .select({ count: count() })
    .from(buildsTable)
    .where(eq(buildsTable.status, "running"))
    .get()?.count ?? 0;

  const storageSumRow = db
    .select({ total: sql<number>`SUM(output_size_bytes)` })
    .from(buildsTable)
    .get();
  const totalStorageBytes = storageSumRow?.total ?? 0;

  const recentBuilds = db
    .select()
    .from(buildsTable)
    .orderBy(desc(buildsTable.createdAt))
    .limit(5)
    .all()
    .map((b) => {
      let logs: string[] = [];
      try { logs = JSON.parse(b.logs); } catch { logs = []; }
      return { ...b, logs };
    });

  res.json({
    totalProjects,
    totalBuilds,
    successfulBuilds: successBuilds,
    failedBuilds,
    runningBuilds,
    totalStorageBytes,
    recentBuilds,
  });
});

export default router;
