"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import type { ChatMessage, Conversation } from "@idea-district/api-client";

import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

const POLL_MS = 15_000;

/**
 * One conversation: loads it, polls every 15 s while the tab is visible, and sends.
 * Shared by the thread page and the 3D Lantern Pier.
 */
export function useThread(founderId: string, conversationId: string, onSent?: (m: ChatMessage) => void) {
  const [convo, setConvo] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api.conversation(conversationId, founderId).then(
        (c) => {
          setConvo(c);
          setError(null);
        },
        (e) => setError(errorMessage(e)),
      ),
    [conversationId, founderId],
  );

  // Fetch on show, every 15 s while visible, and when the tab becomes visible again.
  useEffect(() => {
    let live = true;
    const refresh = () => {
      if (live && document.visibilityState === "visible") void load();
    };
    refresh();
    const t = window.setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      live = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const msg = await api.sendMessage(conversationId, founderId, body);
      setConvo((c) => (c && !c.messages.some((m) => m.id === msg.id) ? { ...c, messages: [...c.messages, msg] } : c));
      setDraft("");
      onSent?.(msg);
    } catch (err) {
      setSendError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return { convo, error, load, draft, setDraft, sending, sendError, send };
}
