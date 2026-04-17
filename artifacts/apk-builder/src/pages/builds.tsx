import { useListBuilds } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { PlayCircle, Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";

function statusIcon(status: string) {
  switch (status) {
    case "success": return <CheckCircle2 className="h-4 w-4 text-primary" />;
    case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
    case "running": return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    case "queued": return <Clock className="h-4 w-4 text-muted-foreground" />;
    default: return <PlayCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "success": return "default";
    case "failed": return "destructive";
    default: return "secondary";
  }
}

export default function Builds() {
  const { data: builds, isLoading } = useListBuilds();

  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Builds</h1>
        <p className="text-muted-foreground mt-1">All APK/AAB builds across all projects.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : builds?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <PlayCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No builds yet</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Start a build from a project to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {builds?.map((build) => (
            <Card key={build.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {statusIcon(build.status)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">
                          Build #{build.id}
                        </span>
                        <Badge variant={statusVariant(build.status)} className="text-xs">
                          {build.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono">
                          {build.outputFormat?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {build.buildType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Project #{build.projectId} &middot;{" "}
                        {build.createdAt ? formatDistanceToNow(new Date(build.createdAt), { addSuffix: true }) : ""}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {build.status === "running" && (
                      <div className="w-32 space-y-1">
                        <Progress value={build.progress ?? 0} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">{build.progress ?? 0}%</p>
                      </div>
                    )}
                    {build.outputSizeBytes && (
                      <p className="text-xs text-muted-foreground">
                        {(build.outputSizeBytes / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
