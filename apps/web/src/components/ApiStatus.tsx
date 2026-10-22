"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

/* Development aid: shows whether the web app can reach the API. */
export default function ApiStatus() {
  const [status, setStatus] = useState("checking API…");

  useEffect(() => {
    api
      .health()
      .then((h) => setStatus(`API ok · ${h.database} · AI: ${h.ai_provider}`))
      .catch(() => setStatus("API not reachable — run pnpm dev:api"));
  }, []);

  return <p className="text-xs text-ink3">{status}</p>;
}
