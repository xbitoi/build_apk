import { useState } from "react";
import {
  useListGeminiKeys,
  useUpdateGeminiKey,
  useResetGeminiKeyExhausted,
  useGetSettings,
  useUpdateSetting,
} from "@workspace/api-client-react";
import { Key, RefreshCw, CheckCircle2, AlertCircle, Eye, EyeOff, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function GeminiKeySlot({ slot, data }: { slot: number; data: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newKeyValue, setNewKeyValue] = useState("");
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);
  const updateKey = useUpdateGeminiKey();
  const resetKey = useResetGeminiKeyExhausted();

  const handleSave = () => {
    updateKey.mutate(
      { slot, data: { keyValue: newKeyValue || undefined, isActive: data?.isActive ?? true, label: data?.label ?? `Key ${slot}` } },
      {
        onSuccess: () => {
          toast({ title: `Key ${slot} saved` });
          queryClient.invalidateQueries({ queryKey: ["listGeminiKeys"] });
          setEditing(false);
          setNewKeyValue("");
        },
        onError: () => toast({ variant: "destructive", title: "Failed to save key" }),
      }
    );
  };

  const handleReset = () => {
    resetKey.mutate(
      { slot },
      {
        onSuccess: () => {
          toast({ title: `Key ${slot} exhaustion reset` });
          queryClient.invalidateQueries({ queryKey: ["listGeminiKeys"] });
        },
      }
    );
  };

  const isExhausted = data?.exhaustedUntil && new Date(data.exhaustedUntil) > new Date();

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex items-center gap-2 shrink-0 w-20">
        <Key className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Slot {slot}</span>
      </div>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {editing ? (
          <Input
            type={show ? "text" : "password"}
            placeholder={`Paste Gemini API key for slot ${slot}`}
            value={newKeyValue}
            onChange={(e) => setNewKeyValue(e.target.value)}
            className="font-mono text-xs"
          />
        ) : (
          <div className="flex-1 font-mono text-xs text-muted-foreground truncate bg-muted px-3 py-2 rounded-md border border-border">
            {data?.hasKey ? "***configured***" : <span className="italic">not configured</span>}
          </div>
        )}
        <Button
          variant="ghost" size="icon"
          onClick={() => setShow((s) => !s)}
          className="shrink-0 h-8 w-8"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isExhausted && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleReset} disabled={resetKey.isPending}>
            <RefreshCw className="h-3 w-3 mr-1" /> Reset
          </Button>
        )}
        <Badge variant={isExhausted ? "destructive" : data?.hasKey ? "default" : "secondary"} className="text-xs">
          {isExhausted ? "exhausted" : data?.hasKey ? "active" : "empty"}
        </Badge>
        {editing ? (
          <>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateKey.isPending || !newKeyValue}>
              <Save className="h-3 w-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setNewKeyValue(""); }}>
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function SettingRow({ name, value, onSave }: { name: string; value: string | undefined; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-40 shrink-0">
        <span className="text-sm font-mono text-muted-foreground">{name}</span>
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <Input value={val} onChange={(e) => setVal(e.target.value)} className="text-sm h-8" />
        ) : (
          <span className="text-sm">{value || <span className="italic text-muted-foreground">not set</span>}</span>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2 shrink-0">
          <Button size="sm" className="h-7 text-xs" onClick={() => { onSave(val); setEditing(false); }}>Save</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => setEditing(true)}>Edit</Button>
      )}
    </div>
  );
}

export default function Settings() {
  const { data: keys, isLoading: keysLoading } = useListGeminiKeys();
  const { data: settings, isLoading: settingsLoading } = useGetSettings();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const handleSaveSetting = (key: string, value: string) => {
    updateSetting.mutate(
      { key, data: { value } },
      {
        onSuccess: () => toast({ title: "Setting saved" }),
        onError: () => toast({ variant: "destructive", title: "Failed to save setting" }),
      }
    );
  };

  const appSettings = [
    { key: "androidSdkPath", label: "Android SDK Path" },
    { key: "javaHome", label: "JAVA_HOME" },
    { key: "buildOutputDir", label: "Build Output Dir" },
    { key: "defaultMinSdk", label: "Default Min SDK" },
    { key: "defaultTargetSdk", label: "Default Target SDK" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto w-full space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure Gemini API keys and build environment.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Gemini API Keys
          </CardTitle>
          <CardDescription>
            Configure up to 4 Gemini API key slots. Keys rotate automatically when a quota limit is hit.
            Get keys from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((slot) => (
                <GeminiKeySlot key={slot} slot={slot} data={keys?.find((k) => k.slot === slot)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Build Environment</CardTitle>
          <CardDescription>
            Paths and environment configuration for Android builds. Leave empty to use system defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {appSettings.map((s) => (
                <SettingRow
                  key={s.key}
                  name={s.label}
                  value={(settings as Record<string, string>)?.[s.key]}
                  onSave={(v) => handleSaveSetting(s.key, v)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
