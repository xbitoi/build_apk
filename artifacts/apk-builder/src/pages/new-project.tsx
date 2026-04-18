import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useCreateProject, CreateProjectBodySourceType } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  sourceType: z.nativeEnum(CreateProjectBodySourceType),
  sourceUrl: z.string().url("Must be a valid URL (e.g. https://github.com/user/repo)").optional().or(z.literal("")),
  packageId: z.string().regex(
    /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i,
    "Invalid format. Use reverse domain notation: com.example.app"
  ),
  appName: z.string().min(1, "App name is required"),
  versionName: z.string().min(1, "Version name is required").regex(/^\d+\.\d+(\.\d+)?$/, "Use format: 1.0.0"),
  versionCode: z.coerce.number().min(1, "Version code must be at least 1").int("Must be a whole number"),
});

export default function NewProject() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sourceType: CreateProjectBodySourceType.github,
      sourceUrl: "",
      packageId: "com.example.app",
      appName: "",
      versionName: "1.0.0",
      versionCode: 1,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setSubmitError(null);
    createProject.mutate(
      { data: values },
      {
        onSuccess: (project) => {
          toast({ title: "Project created successfully" });
          setLocation(`/projects/${project.id}`);
        },
        onError: (error: any) => {
          const msg =
            error?.data?.error ||
            error?.data?.message ||
            error?.message ||
            "An unexpected error occurred. Check the API server is running.";
          setSubmitError(msg);
          toast({
            variant: "destructive",
            title: "Failed to create project",
            description: msg,
          });
        },
      }
    );
  };

  const sourceType = form.watch("sourceType");

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full overflow-auto h-full">
      <div className="flex items-center gap-2 mb-5">
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2">
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Project</CardTitle>
          <CardDescription>Create a new Android APK/AAB project from your web app source.</CardDescription>
        </CardHeader>
        <CardContent>
          {submitError && (
            <Alert variant="destructive" className="mb-5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{submitError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome App" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a source type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="github">GitHub Repository</SelectItem>
                        <SelectItem value="zip">ZIP URL</SelectItem>
                        <SelectItem value="local">Local Path (Server)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {sourceType !== "local" && (
                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://github.com/user/repo" {...field} />
                      </FormControl>
                      <FormDescription>
                        {sourceType === "github"
                          ? "Full GitHub repository URL (e.g. https://github.com/user/repo)"
                          : "Direct URL to a ZIP archive of your web app"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="appName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My App" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Shown on device launcher</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="packageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package ID</FormLabel>
                      <FormControl>
                        <Input placeholder="com.example.app" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Reverse domain notation</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="versionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version Name</FormLabel>
                      <FormControl>
                        <Input placeholder="1.0.0" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Public version string</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="versionCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Version Code</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">Integer, must increment each release</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setLocation("/projects")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Project
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
