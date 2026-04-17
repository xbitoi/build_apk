import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Plus, Trash2, MessageSquareCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useListConversations,
  useCreateConversation,
  useDeleteConversation,
  useGetConversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
  requestType?: "question" | "command";
  streaming?: boolean;
}

export default function Chat() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: conversations, isLoading: convsLoading } = useListConversations();
  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();
  const { data: convData } = useGetConversation(activeConvId ?? 0, {
    query: { enabled: activeConvId != null },
  });

  useEffect(() => {
    if (convData?.messages) {
      setMessages(
        convData.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          requestType: m.requestType,
        }))
      );
    }
  }, [convData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewConversation = useCallback(() => {
    createConv.mutate(
      { data: { title: "New Conversation" } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({ queryKey: ["listConversations"] });
          setActiveConvId(conv.id);
          setMessages([]);
        },
        onError: () => toast({ variant: "destructive", title: "Failed to create conversation" }),
      }
    );
  }, [createConv, queryClient, toast]);

  const handleDeleteConv = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConv.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["listConversations"] });
          if (activeConvId === id) {
            setActiveConvId(null);
            setMessages([]);
          }
        },
      }
    );
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;
    if (!activeConvId) {
      toast({ variant: "destructive", title: "Please start or select a conversation first" });
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setStreaming(true);

    const assistantIdx = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvId, message: userMessage }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`Server error: ${resp.status}`);
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let detectedType: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === "text_delta") {
              fullContent += event.text;
            } else if (event.type === "request_type") {
              detectedType = event.requestType;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }

            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.streaming) {
                updated[updated.length - 1] = {
                  ...last,
                  content: fullContent,
                  requestType: detectedType as any,
                };
              }
              return updated;
            });
          } catch {
          }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: fullContent,
            streaming: false,
            requestType: detectedType as any,
          };
        }
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ["listConversations"] });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.streaming) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${err.message}`,
            streaming: false,
          };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-border flex flex-col h-full">
        <div className="p-3 border-b border-border">
          <Button
            onClick={startNewConversation}
            disabled={createConv.isPending}
            className="w-full"
            size="sm"
          >
            {createConv.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 px-2 py-2">
          {convsLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : conversations?.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center mt-4">No conversations yet</p>
          ) : (
            <div className="space-y-1">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConvId(conv.id); setMessages([]); }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between group transition-colors",
                    activeConvId === conv.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/60 text-muted-foreground"
                  )}
                >
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => handleDeleteConv(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity ml-1 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      <div className="flex-1 flex flex-col h-full min-w-0">
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center p-8">
            <MessageSquareCode className="h-16 w-16 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold">APK Builder AI</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Ask questions about your builds, get help with Android configuration, or give commands to manage projects.
              </p>
            </div>
            <Button onClick={startNewConversation} disabled={createConv.isPending}>
              {createConv.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Start a conversation
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="shrink-0 h-8 w-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={cn("max-w-[80%] space-y-1", msg.role === "user" ? "items-end flex flex-col" : "")}>
                      {msg.role === "assistant" && msg.requestType && (
                        <Badge variant="outline" className="text-xs px-2 py-0 font-mono">
                          {msg.requestType}
                        </Badge>
                      )}
                      <div
                        className={cn(
                          "rounded-md px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-card-foreground"
                        )}
                      >
                        {msg.content}
                        {msg.streaming && (
                          <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
                        )}
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="shrink-0 h-8 w-8 rounded-sm bg-muted border border-border flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <Separator />
            <div className="p-4">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask a question or give a command... (Shift+Enter for newline)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none font-mono text-sm min-h-[56px] max-h-40"
                  rows={2}
                  disabled={streaming}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  className="shrink-0 h-auto"
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Powered by Gemini. Configure API keys in Settings.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
