// Per-tenant WebSocket client. The backend already exposes services/websocket.js
// which broadcasts on a per-tenant channel (e.g. "restaurant:order:created",
// "kitchen:ticket:new"). Features subscribe and invalidate the matching query,
// so a KOT fired on the floor lights up the KDS on another device within a
// second — the piece in-memory useState could never do.

import { queryClient } from "./query-client";

type Listener = (payload: unknown) => void;

class LiveChannel {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectTimer: number | null = null;
  private url = "";

  connect(tenantId: string, token: string) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const apiUrl = import.meta.env.VITE_API_URL ?? "";
    const host = apiUrl.replace(/^https?:\/\//, "") || location.host;
    this.url = `${proto}://${host}/ws?tenant=${encodeURIComponent(tenantId)}&token=${encodeURIComponent(token)}`;
    this.open();
  }

  private open() {
    if (!this.url) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.onmessage = (ev) => {
      try {
        const { event, payload } = JSON.parse(ev.data) as { event: string; payload: unknown };
        this.listeners.get(event)?.forEach((fn) => fn(payload));
      } catch {
        /* ignore malformed frame */
      }
    };
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = () => this.ws?.close();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer != null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, 3000);
  }

  on(event: string, fn: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  disconnect() {
    if (this.reconnectTimer != null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.url = "";
    this.ws?.close();
    this.ws = null;
  }
}

export const liveChannel = new LiveChannel();

/** Convenience: invalidate a query key whenever a WS event arrives. */
export function invalidateOn(event: string, queryKey: readonly unknown[]): () => void {
  return liveChannel.on(event, () => {
    void queryClient.invalidateQueries({ queryKey });
  });
}
