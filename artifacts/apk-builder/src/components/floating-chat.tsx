import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Plus, X, MessageSquareCode, Minimize2, Maximize2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCreateConversation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
  requestType?: "question" | "command";
  streaming?: boolean;
}

export function FloatingChat() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const createConv = useCreateConversation();

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized && !convId) {
      initConversation();
    }
  }, [open]);

  const initConversation = useCallback(() => {
    createConv.mutate(
      { data: { title: "Quick Chat" } },
      {
        onSuccess: (conv) => {
          setConvId(conv.id);
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        },
        onError: () => toast({ variant: "destructive", title: "Could not start conversation" }),
      }
    );
  }, [createConv, queryClient, toast]);

  const sendMessage = async () => {
    if (!input.trim() || streaming || !convId) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: userMsg }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || `Server error ${resp.status}`);
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
            if (event.type === "text_delta") fullContent += event.text;
            else if (event.type === "request_type") detectedType = event.requestType;
            else if (event.type === "error") throw new Error(event.message);
          } catch {}
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.streaming) {
              updated[updated.length - 1] = { ...last, content: fullContent, requestType: detectedType as any };
            }
            return updated;
          });
        }
      }
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = { ...last, content: fullContent, streaming: false, requestType: detectedType as any };
        }
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.streaming) {
          updated[updated.length - 1] = { role: "assistant", content: `Error: ${err.message}`, streaming: false };
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

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
    setMinimized(false);
  };

  const handleNewChat = () => {
    setMessages([]);
    setConvId(null);
    initConversation();
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-lg",
            "bg-primary text-primary-foreground flex items-center justify-center",
            "hover:scale-110 active:scale-95 transition-transform",
            "border-2 border-primary-foreground/20"
          )}
          aria-label="Open AI Chat"
        >
          <MessageSquareCode className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 flex flex-col rounded-xl shadow-2xl overflow-hidden",
            "border border-border bg-background",
            "w-[360px] sm:w-[420px]",
            minimized ? "h-14" : "h-[520px]",
            "transition-all duration-200"
          )}
        >
          <div className="flex items-center justify-between px-4 h-14 bg-card border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-sm bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">APK Builder AI</p>
                <p className="text-xs text-muted-foreground leading-none mt-0.5">Gemini</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!minimized && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNewChat} title="New chat">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setMinimized((m) => !m)}
                title={minimized ? "Expand" : "Minimize"}
              >
                {minimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose} title="Close">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {!minimized && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 && !createConv.isPending && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    <MessageSquareCode className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    Ask a question or give a build command
                  </div>
                )}
                {createConv.isPending && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="shrink-0 h-6 w-6 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mt-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                      </div>
                    )}
                    <div className={cn("max-w-[80%] space-y-1", msg.role === "user" ? "items-end flex flex-col" : "")}>
                      {msg.role === "assistant" && msg.requestType && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono h-4">
                          {msg.requestType}
                        </Badge>
                      )}
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground border border-border"
                        )}
                      >
                        {msg.content}
                        {msg.streaming && (
                          <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 align-middle animate-pulse" />
                        )}
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="shrink-0 h-6 w-6 rounded-sm bg-muted border border-border flex items-center justify-center mt-0.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-border flex gap-2 bg-card">
                <Textarea
                  ref={textareaRef}
                  placeholder="Message... (Enter to send)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none text-sm min-h-[40px] max-h-24 py-2"
                  rows={1}
                  disabled={streaming || !convId}
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming || !convId}
                  className="h-10 w-10 shrink-0"
                >
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
