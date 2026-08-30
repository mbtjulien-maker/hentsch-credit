"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Phone, Send, StickyNote } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminField } from "@/components/admin/admin-ui";
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, ADMIN_INPUT } from "@/lib/admin-theme";
import type { AdminClient } from "@/lib/admin-mock-data";
import { api, ApiError, type AdminNoteRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

// Onglet "Notes & Support" — sections 18 (notes internes) et 19 (support client) du
// brief. Quand la fiche vient de la vraie base (client.userId présent, cf.
// backend/src/admin-clients), l'ajout de note est réellement persisté (POST
// /admin/clients/:id/notes) ; pour une fiche de démonstration (lib/admin-mock-data.ts),
// l'ajout reste local à la session, comme avant.
export function NotesSupportTab({ client }: { client: AdminClient }) {
  const [notes, setNotes] = useState<AdminNoteRecord[]>(client.notes);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddNote() {
    if (draft.trim() === "") return;
    const content = draft.trim();

    if (client.userId) {
      setSubmitting(true);
      setError(null);
      try {
        const updated = await api.addAdminClientNote(client.userId, content);
        setNotes(updated);
        setDraft("");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const now = new Date();
    setNotes((prev) => [
      {
        author: "Vous",
        date: now.toLocaleDateString("fr-FR"),
        time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        content,
      },
      ...prev,
    ]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminCard>
        <AdminCardHeader title="Support client" />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <AdminField label="Tickets ouverts" value={client.support.openTickets} />
          <AdminField label="Tickets résolus" value={client.support.resolvedTickets} />
          <AdminField label="Dernier contact" value={client.support.lastContact} />
          <AdminField label="Canaux" value={client.support.channels.map((c) => `${c.type} (${c.count})`).join(" · ") || "—"} />
        </div>
        <div className="mt-4 flex gap-2 border-t border-foreground/[0.06] pt-4">
          <button type="button" className={ADMIN_BTN_SECONDARY}>
            <MessageSquare className="size-3.5 text-primary" />
            Nouvelle conversation
          </button>
          <button type="button" className={ADMIN_BTN_SECONDARY}>
            <Phone className="size-3.5 text-primary" />
            Planifier un appel
          </button>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Notes internes"
          description={
            client.userId
              ? "Enregistrées en base, visibles uniquement par le personnel habilité."
              : "Visibles uniquement par le personnel habilité (démonstration, non enregistrées)."
          }
        />
        <div className="mb-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !submitting && handleAddNote()}
            placeholder="Ajouter une note interne…"
            disabled={submitting}
            className={ADMIN_INPUT}
          />
          <button type="button" onClick={handleAddNote} disabled={submitting} className={cn(ADMIN_BTN_PRIMARY, "shrink-0")}>
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            Ajouter
          </button>
        </div>
        {error && <p className="mb-3 text-[12.5px] text-destructive">{error}</p>}
        <div className="flex flex-col gap-2">
          {notes.length === 0 && <p className="text-[13px] text-muted-foreground">Aucune note pour l&apos;instant.</p>}
          {notes.map((note, i) => (
            <div key={i} className="rounded-lg border border-foreground/[0.06] p-3.5">
              <div className="mb-1.5 flex items-center gap-2 text-[12px]">
                <StickyNote className="size-3.5 text-primary" />
                <span className="font-medium text-foreground">{note.author}</span>
                <span className="text-muted-foreground">
                  {note.date ?? "—"} · {note.time}
                </span>
              </div>
              <p className="text-[13px] text-foreground">« {note.content} »</p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
