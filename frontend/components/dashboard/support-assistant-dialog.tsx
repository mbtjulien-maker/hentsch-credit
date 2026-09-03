"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, Bot, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, ApiError, type SupportChatTurn } from "@/lib/api";

// Sujets fréquents — de simples raccourcis qui pré-remplissent la question envoyée au
// modèle (cf. topics.<id> dans les traductions), pas des réponses pré-rédigées : la
// réponse elle-même vient toujours d'un vrai appel à OpenAI (cf. OpenAiChatService).
const QUICK_TOPICS = ["credit", "kyc", "withdrawal", "investment"] as const;

interface Message {
  role: "user" | "model";
  text: string;
}

// Assistant support réel — OpenAI (cf. §6 CLAUDE.md entrée #43, après deux essais Google
// Gemini abandonnés — entrées #41/#42), pas Anthropic/Claude (demande client explicite)
// et pas un texte scripté (remplace l'entrée #39) : c'est une vraie IA conversationnelle,
// avec le risque d'erreur que cela comporte, explicitement affiché ci-dessous plutôt que
// caché. Aucune session persistée côté serveur — l'historique ne vit que dans ce
// composant tant que le dialogue reste ouvert.
export function SupportAssistantDialog() {
  const t = useTranslations("Dashboard.supportSection.assistant");
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || available !== null) return;
    api
      .getSupportChatStatus()
      .then((status) => setAvailable(status.available))
      .catch(() => setAvailable(false));
  }, [open, available]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  function reset() {
    setMessages([]);
    setInput("");
    setError(null);
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const history: SupportChatTurn[] = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const { reply } = await api.sendSupportChatMessage(history, trimmed);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="justify-start">
            <Bot className="size-4" />
            {t("trigger")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("disclaimer")}</DialogDescription>
        </DialogHeader>

        {available === false && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{t("unavailable")}</span>
          </div>
        )}

        {available !== false && (
          <>
            <div ref={scrollRef} className="flex max-h-[45vh] min-h-[120px] flex-col gap-2 overflow-y-auto pr-1">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("intro")}</p>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    message.role === "model"
                      ? "self-start bg-muted text-foreground"
                      : "self-end bg-primary/10 text-primary"
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2 self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("thinking")}
                </div>
              )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    disabled={available === null}
                    onClick={() => void handleSend(t(`topics.${topic}`))}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t(`topics.${topic}`)}
                  </button>
                ))}
              </div>
            )}

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend(input);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("placeholder")}
                disabled={sending || available === null}
              />
              <Button type="submit" size="icon" disabled={sending || available === null || input.trim() === ""}>
                <ArrowUp className="size-4" />
              </Button>
            </form>
          </>
        )}

        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
          <Sparkles className="size-3 shrink-0" />
          {t("footnote")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
