"use client";

import { useEffect } from "react";

export function useMarathonActivity(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    const sessionId = `s_${crypto.randomUUID().replaceAll("-", "")}`;
    let lastSent = performance.now();
    let counting = !document.hidden;
    const send = (active: boolean) => {
      const now = performance.now();
      const activeSeconds = counting ? Math.min(30, (now - lastSent) / 1000) : 0;
      lastSent = now;
      counting = active;
      void fetch("/api/marathon/activity", {
        method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, activeSeconds, active }),
      }).catch(() => undefined);
    };
    send(!document.hidden);
    const timer = window.setInterval(() => { if (!document.hidden) send(true); }, 15_000);
    const visibility = () => send(!document.hidden);
    const pagehide = () => send(false);
    const pageshow = () => send(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    return () => {
      send(false);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
    };
  }, [userId]);
}
