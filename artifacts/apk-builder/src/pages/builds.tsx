import { useListBuilds } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { PlayCircle, Loader2, CheckCircle2, XCircle, RefreshCw, Clock, AlertCircle, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

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
  const { data: builds, isLoading, isError, error, refetch } = useListBuilds();
  const [logsDialog, setLogsDialog] = useState<{ buildId: number; logs: string[] } | null>(null);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5 overflow-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Builds</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">All APK/AAB builds across all projects.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load builds</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || "Could not connect to the API server."}
            <Button variant="outline" size="sm" className="mt-2 h-7 text-xs ml-2" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : builds?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <PlayCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No builds yet</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Open a project and start a build to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {builds?.map((build) => (
            <Card key={build.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {statusIcon(build.status)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-sm font-medium">Build #{build.id}</span>
                        <Badge variant={statusVariant(build.status)} className="text-xs">
                          {build.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-mono">
                          {build.outputFormat?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                          {build.buildType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Project #{build.projectId} &middot;{" "}
                        {build.createdAt ? formatDistanceToNow(new Date(build.createdAt), { addSuffix: true }) : ""}
                      </p>
                      {build.status === "running" && (
                        <Progress value={build.progress ?? 0} className="w-32 h-1.5 mt-1.5" />
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {(build as any).logs?.length > 0 && (
                      <Button
                        variant="ghost" size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setLogsDialog({ buildId: build.id, logs: (build as any).logs })}
                      >
                        <ScrollText className="h-3 w-3" />
                        <span className="hidden sm:inline">Logs</span>
                      </Button>
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
