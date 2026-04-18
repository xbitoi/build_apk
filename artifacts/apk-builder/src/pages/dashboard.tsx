import { Link } from "wouter";
import { useGetDashboardStats, useSystemCheck } from "@workspace/api-client-react";
import { FolderGit2, PlayCircle, CheckCircle2, XCircle, AlertCircle, ChevronRight, Cpu, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function StatCard({ label, value, icon: Icon, loading }: { label: string; value?: number; icon: React.ElementType; loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5 flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
          {loading ? <Skeleton className="h-7 sm:h-8 w-12 mt-1" /> : <p className="text-2xl sm:text-3xl font-bold mt-1">{value ?? 0}</p>}
        </div>
        <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useGetDashboardStats();
  const { data: system, isLoading: sysLoading, isError: sysError, refetch: refetchSys } = useSystemCheck();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5 overflow-auto h-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Overview of your APK Builder Pro workspace.</p>
      </div>

      {statsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cannot load stats</AlertTitle>
          <AlertDescription>
            The API server may be unavailable. Check that it is running.
            <Button variant="outline" size="sm" className="mt-2 h-7 text-xs ml-2" onClick={() => refetchStats()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Projects" value={stats?.totalProjects} icon={FolderGit2} loading={statsLoading} />
        <StatCard label="Total Builds" value={stats?.totalBuilds} icon={PlayCircle} loading={statsLoading} />
        <StatCard label="Successful" value={stats?.successfulBuilds} icon={CheckCircle2} loading={statsLoading} />
        <StatCard label="Failed" value={stats?.failedBuilds} icon={XCircle} loading={statsLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription className="text-xs">Jump straight to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-between text-sm">
              <Link href="/projects/new">New Project <ChevronRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between text-sm">
              <Link href="/chat">AI Assistant <ChevronRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between text-sm">
              <Link href="/keystore">Manage Keystores <ChevronRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between text-sm">
              <Link href="/settings">Configure Gemini Keys <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cpu className="h-4 w-4" /> System Status
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Required tools for Android builds</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchSys()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sysError && (
              <Alert variant="destructive" className="mb-3 py-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs">Failed to check system status.</AlertDescription>
              </Alert>
            )}
            {sysLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2.5">
                {system && Object.entries(system).map(([tool, info]: [string, any]) => {
                  if (tool === "os" || tool === "ready") return null;
                  return (
                    <div key={tool} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{tool}</span>
                      <div className="flex items-center gap-2">
                        {info?.version && <span className="text-xs text-muted-foreground font-mono">{info.version}</span>}
                        <Badge variant={info?.available ? "default" : "destructive"} className="text-xs px-1.5">
                          {info?.available ? "found" : "missing"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {system?.ready !== undefined && (
                  <div className="pt-2.5 border-t border-border flex items-center gap-2">
                    {system.ready
                      ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <span className="text-xs">{system.ready ? "Ready to build APKs" : "Some required tools are missing"}</span>
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
