import { useState } from "react";
import { Link } from "wouter";
import { useListKeystores } from "@workspace/api-client-react";
import { Key, Plus, Trash2, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

const formSchema = z.object({
  alias: z.string().min(1, "Alias is required"),
  commonName: z.string().min(1, "Common name is required"),
  organization: z.string().optional(),
  validity: z.coerce.number().min(365).default(10000),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Keystore() {
  const { data: keystores, isLoading } = useListKeystores();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { alias: "my-key", commonName: "", organization: "", validity: 10000, password: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const res = await fetch("/api/keystore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      queryClient.invalidateQueries({ queryKey: ["listKeystores"] });
      toast({ title: "Keystore created" });
      setOpen(false);
      form.reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/keystore/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["listKeystores"] });
      toast({ title: "Keystore deleted" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete keystore" });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-5 overflow-auto h-full">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2">
          <Link href="/"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Keystore</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage signing keystores for production builds.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Keystore</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Keystore</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="alias" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alias</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="commonName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Common Name</FormLabel>
                      <FormControl><Input placeholder="Your Name or Company" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="organization" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="validity" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validity (days)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormDescription>10000 days = ~27 years</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : keystores?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <Key className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No keystores yet</h3>
          <p className="text-sm text-muted-foreground mt-2">Create a keystore to sign production APKs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {keystores?.map((ks) => (
            <Card key={ks.id} className="hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{ks.alias}</CardTitle>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 -mt-1 -mr-2 hover:text-destructive"
                    onClick={() => handleDelete(ks.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardDescription className="font-mono text-xs">{ks.commonName}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-muted-foreground space-y-1">
                {ks.organization && <p>Org: {ks.organization}</p>}
                <p>Valid: {ks.validity} days</p>
                {ks.createdAt && <p>Created {formatDistanceToNow(new Date(ks.createdAt), { addSuffix: true })}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
