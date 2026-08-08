import { useEffect, useState } from "react";
import GoalIntake from "./components/GoalIntake";
import RoadmapView from "./components/Roadmap";
import Room from "./components/Room";
import { generateRoadmap, getHealth } from "./lib/api";
import { loadRoadmap, saveRoadmap, clearRoadmap } from "./lib/storage";
import type { GoalInput, Roadmap } from "./types";

type View = "intake" | "roadmap" | "room";

function randomRoomId(): string {
  return Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const [view, setView] = useState<View>("intake");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState<boolean | null>(null);

  const [roomId, setRoomId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [nameConfirmed, setNameConfirmed] = useState(false);

  // On load: pick up a saved roadmap, and handle a shared ?room= link.
  useEffect(() => {
    getHealth()
      .then((h) => setMockMode(h.mockMode))
      .catch(() => setMockMode(null));

    const saved = loadRoadmap();
    if (saved) {
      setRoadmap(saved);
      setView("roadmap");
    }

    const params = new URLSearchParams(location.search);
    const linkedRoom = params.get("room");
    if (linkedRoom) {
      setRoomId(linkedRoom);
      setView("room");
    }
  }, []);

  async function handleGenerate(input: GoalInput) {
    setLoading(true);
    setError(null);
    try {
      const { roadmap: rm, mockMode: mm } = await generateRoadmap(input);
      setRoadmap(rm);
      saveRoadmap(rm);
      setMockMode(mm);
      setView("roadmap");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    clearRoadmap();
    setRoadmap(null);
    setView("intake");
  }

  function openRoom() {
    setRoomId((prev) => prev || randomRoomId());
    setView("room");
  }

  function leaveRoom() {
    // Clean the ?room= param from the URL.
    history.replaceState(null, "", location.pathname);
    setView(roadmap ? "roadmap" : "intake");
    setNameConfirmed(false);
  }

  const needsName = view === "room" && !nameConfirmed;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              L
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none">LifeCoach AI</h1>
              <p className="text-xs text-slate-500">Ambitions → roadmap → daily action</p>
            </div>
          </div>
          {mockMode !== null && (
            <span
              className={`text-xs rounded-full px-3 py-1 font-medium ${
                mockMode
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
              title={
                mockMode
                  ? "No ANTHROPIC_API_KEY set — running templated mock output."
                  : "Using the Anthropic API (claude-sonnet-5)."
              }
            >
              {mockMode ? "Mock mode" : "Live · claude-sonnet-5"}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {view === "intake" && (
          <GoalIntake onSubmit={handleGenerate} loading={loading} error={error} />
        )}

        {view === "roadmap" && roadmap && (
          <RoadmapView roadmap={roadmap} onReset={handleReset} onOpenRoom={openRoom} />
        )}

        {view === "room" && needsName && (
          <NamePrompt
            roomId={roomId}
            onConfirm={(n) => {
              setName(n);
              setNameConfirmed(true);
            }}
            onCancel={leaveRoom}
          />
        )}

        {view === "room" && !needsName && (
          <Room roomId={roomId} name={name} roadmap={roadmap} onLeave={leaveRoom} />
        )}
      </main>
    </div>
  );
}

function NamePrompt({
  roomId,
  onConfirm,
  onCancel,
}: {
  roomId: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-md mx-auto">
      <h2 className="text-lg font-semibold text-slate-900">Join the coaching room</h2>
      <p className="text-sm text-slate-500 mt-1">
        Room <span className="font-mono">{roomId}</span>. Everyone with the link shares this chat.
      </p>
      <label className="block mt-5 text-sm font-medium text-slate-700">Your name</label>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
        }}
        placeholder="e.g. Alex"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => value.trim() && onConfirm(value.trim())}
          disabled={!value.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          Join room
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-5 py-2 text-slate-700 font-medium hover:bg-slate-50 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
