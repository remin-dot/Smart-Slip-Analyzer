"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const QUICK_PROMPTS = [
  { key: "chatui.prompt.where", icon: "💸" },
  { key: "chatui.prompt.save", icon: "🏦" },
  { key: "chatui.prompt.buy", icon: "🛒" },
  { key: "chatui.prompt.reduce", icon: "✂️" },
  { key: "chatui.prompt.budget", icon: "📊" },
  { key: "chatui.prompt.goals", icon: "🎯" },
];

export function FinanceChatPanel() {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history,
          locale,
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();
      if (data.model) setModel(data.model);

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: t("chatui.error"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [messages, sending, locale, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] flex-col">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen onPromptClick={sendMessage} />
        ) : (
          <div className="grid gap-4 p-4">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {sending && (
              <div className="flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/10 text-teal">
                  <Bot size={16} />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="animate-spin" size={14} />
                    <span className="font-bold">{t("chatui.analyzing")}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Quick prompts (show when empty or after response) */}
      {messages.length > 0 && !sending && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
          {QUICK_PROMPTS.slice(0, 4).map((p) => (
            <button
              key={p.key}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-muted hover:border-teal hover:text-teal transition-colors"
              onClick={() => sendMessage(t(p.key))}
              type="button"
            >
              {p.icon} {t(p.key)}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm font-medium text-ink placeholder:text-muted/60 focus:border-teal focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal"
              placeholder={t("chatui.placeholder")}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
          </div>
          <button
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            disabled={sending || !input.trim()}
            onClick={() => sendMessage(input)}
            type="button"
          >
            <Send size={18} />
          </button>
        </div>
        {model && (
          <p className="mt-2 text-[11px] font-bold text-muted">
            Powered by {model} &middot; {t("chatui.dataNote")}
          </p>
        )}
      </div>
    </div>
  );
}

function WelcomeScreen({ onPromptClick }: { onPromptClick: (text: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal/10">
        <Sparkles size={28} className="text-teal" />
      </div>
      <h3 className="mt-5 text-2xl font-black text-ink">{t("chatui.welcomeTitle")}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        {t("chatui.welcomeBody")}
      </p>

      <div className="mt-8 grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.key}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-ink hover:border-teal hover:bg-teal/5 transition-colors"
            onClick={() => onPromptClick(t(p.key))}
            type="button"
          >
            <span className="text-lg">{p.icon}</span>
            <span>{t(p.key)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message: msg }: { message: Message }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
        isUser ? "bg-ocean/10 text-ocean" : "bg-teal/10 text-teal"
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser
          ? "rounded-tr-sm bg-ocean text-white"
          : "rounded-tl-sm bg-slate-50 text-ink"
      }`}>
        <div className={`text-sm leading-7 font-medium whitespace-pre-wrap ${isUser ? "" : "prose-chat"}`}>
          <FormattedContent content={msg.content} isUser={isUser} />
        </div>
        <p className={`mt-1 text-[10px] font-bold ${isUser ? "text-white/50" : "text-muted/50"}`}>
          {msg.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function FormattedContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) return <>{content}</>;

  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-extrabold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
