import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Roadmap } from "../types";

interface Props {
  roomId: string;
  name: string;
  roadmap: Roadmap | null;
  onLeave: () => void;
}

function wsUrl(roomId: string): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws?room=${encodeURIComponent(roomId)}`;
}

export default function Room({ roomId, name, roadmap, onLeave }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState(1);
  const [coachTyping, setCoachTyping] = useState(false);
  const [copied, setCopied] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl(roomId));
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          type: "join",
          room: roomId,
          name,
          goal: roadmap?.ambition ?? null,
          roadmapOverview: roadmap?.overview ?? null,
        })
      );
    };

    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === "history") {
        setMessages(msg.messages || []);
      } else if (msg.type === "message") {
        setMessages((prev) => [...prev, msg.message]);
      } else if (msg.type === "presence") {
        setPresence(msg.count);
      } else if (msg.type === "coachTyping") {
        setCoachTyping(!!msg.value);
      }
    };

    ws.onclose = () => setConnected(false);

    return () => ws.close();
    // Reconnect only when the room changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, coachTyping]);

  function send() {
    const text = input.trim();
    const ws = wsRef.current;
    if (!text || !ws || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: "chat", text }));
    setInput("");
  }

  function copyLink() {
    const url = `${location.origin}/?room=${encodeURIComponent(roomId)}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {}
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[70vh]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">Coaching room</h2>
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                connected ? "bg-green-500" : "bg-slate-300"
              }`}
              title={connected ? "Connected" : "Disconnected"}
            />
            <span className="text-xs text-slate-500">{presence} online</span>
          </div>
          <p className="text-xs text-slate-500">
            Room <span className="font-mono">{roomId}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            {copied ? "Link copied!" : "Copy invite link"}
          </button>
          <button
            onClick={onLeave}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-8">
            Share the invite link so your team can join, then start chatting. LifeCoach AI is in the
            room too.
          </p>
        )}
        {messages.map((m) => {
          if (m.role === "system") {
            return (
              <p key={m.id} className="text-center text-xs text-slate-400">
                {m.text}
              </p>
            );
          }
          const isCoach = m.role === "coach";
          const mine = m.author === name && m.role === "user";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  isCoach
                    ? "bg-indigo-50 text-slate-800 border border-indigo-100"
                    : mine
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <div
                  className={`text-xs mb-0.5 font-medium ${
                    mine ? "text-indigo-100" : isCoach ? "text-indigo-600" : "text-slate-500"
                  }`}
                >
                  {isCoach ? "LifeCoach AI" : m.author}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
              </div>
            </div>
          );
        })}
        {coachTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-2 text-sm text-indigo-600">
              LifeCoach AI is typing…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message the room…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={send}
          disabled={!input.trim() || !connected}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
