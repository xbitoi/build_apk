import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetProject, useListBuilds, useStartBuild } from "@workspace/api-client-react";
import {
  ArrowLeft, PlayCircle, Loader2, CheckCircle2, XCircle, RefreshCw, Clock,
  GitBranch, Cpu, PackageOpen, AlertCircle, ScrollText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

function statusIcon(status: string) {
  switch (status) {
    case "success": return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
    case "running": return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    case "queued": return <Clock className="h-4 w-4 text-muted-foreground" />;
    default: return <PlayCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { data: project, isLoading: projLoading, isError: projError, error: projErr, refetch } = useGetProject(id);
  const { data: allBuilds, isLoading: buildsLoading } = useListBuilds();
  const builds = allBuilds?.filter((b) => b.projectId === id);
  const startBuild = useStartBuild();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [buildType, setBuildType] = useState<"debug" | "release">("debug");
  const [outputFormat, setOutputFormat] = useState<"apk" | "aab">("apk");
  const [startError, setStartError] = useState<string | null>(null);
  const [logsDialog, setLogsDialog] = useState<{ buildId: number; logs: string[] } | null>(null);

  const handleStartBuild = () => {
    setStartError(null);
    startBuild.mutate(
      { id, data: { buildType, outputFormat } },
      {
        onSuccess: (build) => {
          toast({ title: `Build #${build.id} queued successfully` });
          queryClient.invalidateQueries({ queryKey: ["/api/builds"] });
          queryClient.invalidateQueries({ queryKey: ["/api/stats/dashboard"] });
        },
        onError: (err: any) => {
          const msg =
            err?.data?.error ||
            err?.data?.message ||
            err?.message ||
            "Failed to start build. Check that all build tools (Java, Gradle, Android SDK) are available.";
          setStartError(msg);
          toast({ variant: "destructive", title: "Build failed to start", description: msg });
        },
      }
    );
  };

  if (projLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 overflow-auto h-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (projError) {
    return (
      <div className="p-4 sm:p-6 space-y-4 overflow-auto h-full">
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2">
          <Link href="/projects"><ArrowLeft className="h-4 w-4" /> Back to Projects</Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load project</AlertTitle>
          <AlertDescription>
            {(projErr as any)?.message || `Project #${id} not found or server is unavailable.`}
            <br />
            <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-4 sm:p-6">
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 mb-4">
          <Link href="/projects"><ArrowLeft className="h-4 w-4" /> Back to Projects</Link>
        </Button>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Project not found</AlertTitle>
          <AlertDescription>Project #{id} does not exist.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-5 overflow-auto h-full">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 shrink-0">
          <Link href="/projects"><ArrowLeft className="h-4 w-4" /> Projects</Link>
        </Button>
        <span className="text-muted-foreground hidden sm:inline">/</span>
        <span className="font-semibold text-sm truncate hidden sm:block">{project.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">{project.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1 truncate">{project.packageId}</CardDescription>
                </div>
                <Badge
                  variant={project.status === "success" ? "default" : project.status === "failed" ? "destructive" : "secondary"}
                  className="shrink-0"
                >
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">App Name</p>
                <p className="truncate">{project.appName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Version</p>
                <p className="font-mono">{project.versionName} ({project.versionCode})</p>
              </div>
              {project.framework && (
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Framework</p>
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    <p>{project.framework}</p>
                  </div>
                </div>
              )}
              {project.sourceUrl && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-0.5">Source</p>
                  <div className="flex items-center gap-1 min-w-0">
                    <GitBranch className="h-3 w-3 shrink-0" />
                    <a
                      href={project.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-primary hover:underline text-xs"
                    >
                      {project.sourceUrl}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Build History</CardTitle>
            </CardHeader>
            <CardContent>
              {buildsLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : builds?.length === 0 ? (
                <div className="text-center py-8">
                  <PackageOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">No builds yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {builds?.map((build) => (
                    <div key={build.id} className="flex items-center justify-between gap-3 p-3 rounded-md border border-border bg-card">
                      <div className="flex items-center gap-2 min-w-0">
                        {statusIcon(build.status)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-sm">#{build.id}</span>
                            <Badge variant="outline" className="text-xs">{build.outputFormat?.toUpperCase()}</Badge>
                            <Badge variant="outline" className="text-xs">{build.buildType}</Badge>
                          </div>
                          {build.status === "running" && (
                            <Progress value={build.progress ?? 0} className="w-24 h-1.5 mt-1" />
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {build.createdAt ? formatDistanceToNow(new Date(build.createdAt), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {build.outputSizeBytes && (
                          <span className="text-xs text-muted-foreground">
                            {(build.outputSizeBytes / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}
                        {(build as any).logs?.length > 0 && (
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => setLogsDialog({ buildId: build.id, logs: (build as any).logs })}
                          >
                            <ScrollText className="h-3 w-3" /> Logs
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Start New Build</CardTitle>
              <CardDescription className="text-xs">Configure and trigger an Android build</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {startError && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">{startError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Build Type</label>
                <Select value={buildType} onValueChange={(v: any) => setBuildType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug (faster, not for release)</SelectItem>
                    <SelectItem value="release">Release (requires keystore)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Output Format</label>
                <Select value={outputFormat} onValueChange={(v: any) => setOutputFormat(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apk">APK (direct install)</SelectItem>
                    <SelectItem value="aab">AAB (Google Play Bundle)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleStartBuild} disabled={startBuild.isPending}>
                {startBuild.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <PlayCircle className="mr-2 h-4 w-4" />}
                Start Build
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={logsDialog !== null} onOpenChange={(o) => !o && setLogsDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Build #{logsDialog?.buildId} Logs</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-80 rounded-md border border-border bg-muted p-3">
            <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
              {logsDialog?.logs?.join("\n") || "No logs available"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
