"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";

/**
 * Total unread messages for the tab bar. Fetches when the screen mounts or becomes visible again
 * (Next re-runs effects when a kept-alive route is shown). Failures just show nothing.
 */
export function useUnreadCount(founderId: string | null | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!founderId) return;
    let live = true;
    api.conversations(founderId).then(
      (list) => live && setCount(list.reduce((n, c) => n + c.unread, 0)),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [founderId]);

  return count;
}
