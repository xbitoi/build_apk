import { Link } from "wouter";
import { useGetDashboardStats, useSystemCheck } from "@workspace/api-client-react";
import { FolderGit2, PlayCircle, CheckCircle2, XCircle, AlertCircle, ChevronRight, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ label, value, icon: Icon, loading }: { label: string; value?: number; icon: React.ElementType; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-3xl font-bold mt-1">{value ?? 0}</p>}
        </div>
        <Icon className="h-8 w-8 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: system, isLoading: sysLoading } = useSystemCheck();

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your APK Builder Pro workspace.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats?.totalProjects} icon={FolderGit2} loading={statsLoading} />
        <StatCard label="Total Builds" value={stats?.totalBuilds} icon={PlayCircle} loading={statsLoading} />
        <StatCard label="Successful" value={stats?.successfulBuilds} icon={CheckCircle2} loading={statsLoading} />
        <StatCard label="Failed" value={stats?.failedBuilds} icon={XCircle} loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Jump straight to common tasks</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/projects/new">
                New Project <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/chat">
                AI Assistant <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/keystore">
                Manage Keystores <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/settings">
                Configure Gemini Keys <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" /> System Status
            </CardTitle>
            <CardDescription>Required tools for Android builds</CardDescription>
          </CardHeader>
          <CardContent>
            {sysLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {system && Object.entries(system).map(([tool, info]: [string, any]) => {
                  if (tool === "os" || tool === "ready") return null;
                  return (
                    <div key={tool} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-muted-foreground">{tool}</span>
                      <div className="flex items-center gap-2">
                        {info?.version && <span className="text-xs text-muted-foreground">{info.version}</span>}
                        <Badge variant={info?.available ? "default" : "destructive"} className="text-xs">
                          {info?.available ? "found" : "missing"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {system?.ready !== undefined && (
                  <div className="pt-3 border-t border-border flex items-center gap-2">
                    {system.ready
                      ? <CheckCircle2 className="h-4 w-4 text-primary" />
                      : <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span className="text-sm">{system.ready ? "Ready to build" : "Some tools are missing"}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
