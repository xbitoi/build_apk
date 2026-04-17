import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetProject, useListBuilds, useStartBuild } from "@workspace/api-client-react";
import {
  ArrowLeft, PlayCircle, Loader2, CheckCircle2, XCircle, RefreshCw, Clock,
  GitBranch, Cpu, PackageOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

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
  const { data: project, isLoading: projLoading } = useGetProject(id);
  const { data: allBuilds, isLoading: buildsLoading } = useListBuilds();
  const builds = allBuilds?.filter((b) => b.projectId === id);
  const startBuild = useStartBuild();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [buildType, setBuildType] = useState<"debug" | "release">("debug");
  const [outputFormat, setOutputFormat] = useState<"apk" | "aab">("apk");

  const handleStartBuild = () => {
    startBuild.mutate(
      { id, data: { buildType, outputFormat } },
      {
        onSuccess: (build) => {
          toast({ title: `Build #${build.id} started` });
          queryClient.invalidateQueries({ queryKey: ["listBuilds"] });
        },
        onError: (err: any) => toast({ variant: "destructive", title: "Failed", description: err.message }),
      }
    );
  };

  if (projLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Project not found.</p>
        <Button asChild variant="link" className="pl-0 mt-2">
          <Link href="/projects"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full space-y-6 overflow-auto h-full">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/projects"><ArrowLeft className="h-4 w-4" /> Projects</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold">{project.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription className="font-mono text-xs mt-1">{project.packageId}</CardDescription>
                </div>
                <Badge variant={project.status === "success" ? "default" : project.status === "failed" ? "destructive" : "secondary"}>
                  {project.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">App Name</p>
                <p>{project.appName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Version</p>
                <p className="font-mono">{project.versionName} ({project.versionCode})</p>
              </div>
              {project.framework && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Framework</p>
                  <div className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    <p>{project.framework}</p>
                  </div>
                </div>
              )}
              {project.sourceUrl && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Source</p>
                  <div className="flex items-center gap-1 min-w-0">
                    <GitBranch className="h-3 w-3 shrink-0" />
                    <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="truncate text-primary hover:underline text-xs">
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
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : builds?.length === 0 ? (
                <div className="text-center py-8">
                  <PackageOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-3">No builds yet. Start one to get your APK.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {builds?.map((build) => (
                    <div key={build.id} className="flex items-center justify-between gap-4 p-3 rounded-md border border-border bg-card">
                      <div className="flex items-center gap-3 min-w-0">
                        {statusIcon(build.status)}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm">#{build.id}</span>
                            <Badge variant="outline" className="text-xs">{build.outputFormat?.toUpperCase()}</Badge>
                            <Badge variant="outline" className="text-xs">{build.buildType}</Badge>
                            {build.status === "running" && (
                              <Progress value={build.progress ?? 0} className="w-20 h-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {build.createdAt ? formatDistanceToNow(new Date(build.createdAt), { addSuffix: true }) : ""}
                          </p>
                        </div>
                      </div>
                      {build.outputSizeBytes && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(build.outputSizeBytes / 1024 / 1024).toFixed(1)} MB
                        </span>
                      )}
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
              <CardDescription className="text-xs">Configure and trigger a new build</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Build Type</label>
                <Select value={buildType} onValueChange={(v: any) => setBuildType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="release">Release</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Output Format</label>
                <Select value={outputFormat} onValueChange={(v: any) => setOutputFormat(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apk">APK</SelectItem>
                    <SelectItem value="aab">AAB (Bundle)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleStartBuild}
                disabled={startBuild.isPending}
              >
                {startBuild.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <PlayCircle className="mr-2 h-4 w-4" />}
                Start Build
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
