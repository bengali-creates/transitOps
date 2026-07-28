"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Send, X, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";

interface ActionPill {
  label: string;
  actionType: string;
  payload: Record<string, unknown>;
}

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  actions?: ActionPill[];
  timestamp: Date;
}

interface StreamChunk {
  type: "meta" | "text" | "actions";
  content?: string;
  conversationId?: string;
  actions?: ActionPill[];
}

// ─── Stream Parser ─────────────────────────────────────────────────────────────

async function* parseNDJSONStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            yield JSON.parse(trimmed) as StreamChunk;
          } catch {
            // skip malformed lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AICopilotPanel() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when panel opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const { mutate: sendMessage } = useMutation({
    mutationFn: async (userInput: string) => {
      setIsStreaming(true);

      const newUserMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: userInput,
        timestamp: new Date(),
      };

      const allMessages = [...messages, newUserMessage];
      setMessages(allMessages);

      // Add a streaming placeholder for assistant
      const streamingId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: streamingId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Request failed");
      }

      let builtText = "";
      let finalActions: ActionPill[] = [];

      for await (const chunk of parseNDJSONStream(response.body)) {
        if (chunk.type === "meta" && chunk.conversationId) {
          setConversationId(chunk.conversationId);
        } else if (chunk.type === "text" && chunk.content) {
          builtText += chunk.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, content: builtText } : m
            )
          );
        } else if (chunk.type === "actions" && chunk.actions) {
          finalActions = chunk.actions;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, actions: chunk.actions } : m
            )
          );
        }
      }

      setIsStreaming(false);
    },
    onError: (err) => {
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.role === "assistant"
            ? {
                ...m,
                content: "Sorry, something went wrong. Please try again.",
              }
            : m
        )
      );
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
  };

  const suggestedPrompts = [
    "Which licences expire in the next 30 days?",
    "Show fleet utilization for this week",
    "Top 5 highest-cost vehicles",
    "Drivers with safety scores below 75",
  ];

  return (
    <>
      {/* Trigger Button */}
      <Button
        id="ai-copilot-trigger"
        variant="outline"
        size="icon"
        className={cn(
          "relative h-9 w-9 rounded-full transition-all duration-200",
          isOpen && "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
        )}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open AI Co-pilot"
        title="AI Co-pilot"
      >
        <Bot className="w-4 h-4" />
        {/* Pulse indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-background animate-pulse" />
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-over Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] lg:w-[460px]",
          "bg-background border-l shadow-2xl",
          "flex flex-col",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="AI Co-pilot panel"
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-4 border-b bg-muted/30">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Fleet Co-pilot</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isStreaming ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
                  </span>
                ) : (
                  "Ask anything about your fleet"
                )}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7 px-2"
              onClick={handleReset}
            >
              New chat
            </Button>
          )}
          <Button
            id="ai-copilot-close"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Fleet Intelligence Assistant</p>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  Ask me about vehicles, drivers, costs, utilization, and compliance in real time.
                </p>
              </div>
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Try asking…</p>
                <div className="grid gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      id={`suggestion-${prompt.slice(0, 20).replace(/\s/g, "-").toLowerCase()}`}
                      className={cn(
                        "text-left text-sm rounded-lg border border-border/60 px-3 py-2.5",
                        "bg-muted/40 hover:bg-muted/80 transition-colors duration-150",
                        "flex items-center justify-between gap-2 group"
                      )}
                      onClick={() => {
                        setInput(prompt);
                        textareaRef.current?.focus();
                      }}
                    >
                      <span>{prompt}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2.5",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div className={cn("max-w-[88%] space-y-2")}>
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted/60 text-foreground rounded-bl-sm border border-border/40"
                      )}
                    >
                      {message.content ? (
                        <span className="whitespace-pre-wrap">{message.content}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Calling fleet tools…</span>
                        </span>
                      )}
                    </div>

                    {/* Action Pills */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {message.actions.map((action, i) => (
                          <button
                            key={i}
                            id={`action-pill-${i}`}
                            className={cn(
                              "text-xs rounded-full border border-primary/30 px-3 py-1",
                              "bg-primary/5 hover:bg-primary/10 text-primary",
                              "transition-colors duration-150 font-medium"
                            )}
                            onClick={() => console.log("Action:", action)}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground px-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="shrink-0 border-t bg-background p-3 space-y-2">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              id="ai-copilot-input"
              placeholder="Ask about your fleet…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={1}
              className={cn(
                "min-h-[40px] max-h-[120px] resize-none rounded-xl text-sm",
                "scrollbar-thin"
              )}
            />
            <Button
              id="ai-copilot-send"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          {/* <p className="text-[10px] text-muted-foreground text-center">
            Powered by Gemini · Results are live from your database
          </p> */}
        </div>
      </div>
    </>
  );
}
