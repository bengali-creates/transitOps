"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Settings2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";

type ActionPill = {
  label: string;
  actionType: string;
  payload: Record<string, string>;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ActionPill[];
};

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Securely encapsulated chat streaming using TanStack Query mutation
  const { mutate: sendMessage, isPending, error } = useMutation({
    mutationFn: async (userMsg: Message) => {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(response.statusText || "Failed to get response");
      }

      if (!response.body) throw new Error("No response body");
      return response.body;
    },
    onMutate: async (userMsg) => {
      setInput("");
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);
      return { assistantMessageId };
    },
    onSuccess: async (body, _, context) => {
      if (!context) return;
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let actions: ActionPill[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.type === "meta") {
                if (data.conversationId) {
                  setConversationId(data.conversationId);
                }
              } else if (data.type === "text") {
                assistantText += data.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === context.assistantMessageId
                      ? { ...msg, content: assistantText }
                      : msg
                  )
                );
              } else if (data.type === "actions") {
                actions = data.actions;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === context.assistantMessageId
                      ? { ...msg, actions }
                      : msg
                  )
                );
              }
            } catch (err) {
              console.error("NDJSON chunk parsing error:", err);
            }
          }
        }
      } catch (err) {
        console.error("Stream reading error:", err);
        throw err;
      }
    },
    onError: (err, _, context) => {
      if (context?.assistantMessageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === context.assistantMessageId
              ? { ...msg, content: `Error: ${err.message || "Something went wrong."}` }
              : msg
          )
        );
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    sendMessage(userMessage);
  };

  const handleStartNewChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <div className="flex h-[calc(100vh-100px)] w-full gap-4 max-w-6xl mx-auto p-4">
      {/* Sidebar for History / Settings */}
      <Card className="w-64 hidden md:flex flex-col p-4 bg-muted/20">
        <div className="flex items-center gap-2 font-semibold mb-6">
          <Settings2 className="w-5 h-5" />
          Assistant
        </div>
        <Button variant="outline" className="w-full mb-4" onClick={handleStartNewChat}>
          New Chat
        </Button>
        <div className="text-sm text-muted-foreground mb-2">Current Session</div>
        <div className="flex-1 overflow-auto space-y-2">
          {conversationId ? (
            <div className="p-2 text-xs bg-accent rounded-md border border-accent-foreground/20 truncate">
              ID: {conversationId.slice(0, 8)}...
            </div>
          ) : (
            <div className="p-2 text-xs text-muted-foreground italic">
              Unsaved Conversation
            </div>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col p-4 relative">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70">
            <Bot className="w-16 h-16 mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Fleet Operations Intelligence</h2>
            <p className="max-w-md text-muted-foreground mb-8">
              Ask me about fleet utilization, expiring licences, high-cost vehicles, or driver safety.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
              <Button variant="outline" className="justify-start" onClick={() => {
                setInput("Which licences expire in the next 30 days?");
              }}>
                Licences expiring soon
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => {
                setInput("What is our fleet utilization this week?");
              }}>
                Fleet utilization this week
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => {
                setInput("Which are our 5 highest cost vehicles?");
              }}>
                Highest cost vehicles
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => {
                setInput("Show me drivers with a safety score below 80");
              }}>
                Driver safety check
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto space-y-6 pb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}>
                <div className="flex-shrink-0 mt-1">
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                      <Bot className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className={`flex flex-col ${msg.role === "assistant" ? "items-start" : "items-end"} max-w-[80%]`}>
                  <div className={`p-3 rounded-2xl ${msg.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    {msg.content === "" && isPending && msg.id === messages[messages.length - 1].id && (
                      <div className="flex gap-1 mt-1">
                        <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce delay-150"></div>
                      </div>
                    )}
                  </div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.actions.map((action, i) => (
                        <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                          {action.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {error && (
              <div className="flex gap-2 items-center text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{error.message || "An error occurred."}</span>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your fleet..."
            disabled={isPending}
            className="flex-1 bg-muted/50"
          />
          <Button type="submit" disabled={isPending || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
