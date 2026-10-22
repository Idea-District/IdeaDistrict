"use client";

import { useEffect, useState } from "react";

import type { FounderID } from "@idea-district/api-client";

import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

/**
 * Loads the founder's ID. Refetches whenever the screen becomes visible again (Next keeps
 * routes alive with <Activity>, which re-runs effects), so a "Tell me more" shows up here,
 * while the previous data stays on screen during the refetch.
 */
export function useFounderIdData(founderId: string) {
  const [data, setData] = useState<FounderID | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    api.getId(founderId).then(
      (d) => {
        if (!live) return;
        setData(d);
        setError(null);
      },
      (e) => live && setError(errorMessage(e)),
    );
    return () => {
      live = false;
    };
  }, [founderId, attempt]);

  return {
    data,
    error,
    retry: () => {
      setError(null);
      setAttempt((n) => n + 1);
    },
  };
}
