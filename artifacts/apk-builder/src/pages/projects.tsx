import { useState } from "react";
import { Link } from "wouter";
import { useListProjects, useDeleteProject } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Plus, FolderGit2, Loader2, GitBranch, Cpu, MoreVertical, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Projects() {
  const { data: projects, isLoading, isError, error, refetch } = useListProjects();
  const deleteProject = useDeleteProject();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredProjects = projects?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.packageId.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = () => {
    if (!deleteId) return;
    deleteProject.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Project deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
          setDeleteId(null);
        },
        onError: (err: any) => {
          const msg = err?.data?.error || err?.message || "Unknown error";
          toast({
            variant: "destructive",
            title: "Failed to delete project",
            description: msg,
          });
          setDeleteId(null);
        },
      }
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-5 overflow-auto h-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden sm:block">Manage your web-to-APK conversion projects.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/projects/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load projects</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || "Could not connect to server. Make sure the API is running."}
            <Button variant="outline" size="sm" className="mt-2 h-7 text-xs" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Input
        placeholder="Search projects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProjects?.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <FolderGit2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Get started by creating a new project from a web app source.
          </p>
          <Button asChild variant="outline">
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects?.map((project) => (
            <Card key={project.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 pr-2">
                    <CardTitle className="text-base">
                      <Link href={`/projects/${project.id}`} className="hover:underline truncate block">
                        {project.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="font-mono text-xs truncate">{project.packageId}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mt-1 -mr-1">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/projects/${project.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(project.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant={project.status === "success" ? "default" : project.status === "failed" ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {project.status}
                  </Badge>
                  {project.framework && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Cpu className="h-3 w-3" /> {project.framework}
                    </Badge>
                  )}
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <GitBranch className="h-3 w-3" /> {project.sourceType}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-0 text-xs text-muted-foreground border-t border-border mt-auto p-4 flex justify-between">
                <span>v{project.versionName} ({project.versionCode})</span>
                <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all its builds. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
