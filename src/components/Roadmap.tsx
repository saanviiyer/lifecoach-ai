import { useEffect, useMemo, useState } from "react";
import type { Roadmap } from "../types";
import { loadProgress, saveProgress } from "../lib/storage";

interface Props {
  roadmap: Roadmap;
  onReset: () => void;
  onOpenRoom: () => void;
}

export default function RoadmapView({ roadmap, onReset, onOpenRoom }: Props) {
  const [progress, setProgress] = useState<Record<string, boolean>>(() => loadProgress());

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const allObjectives = useMemo(
    () => roadmap.phases.flatMap((p) => p.dailyObjectives ?? []),
    [roadmap]
  );
  const doneCount = allObjectives.filter((o) => progress[o.id]).length;
  const pct = allObjectives.length ? Math.round((doneCount / allObjectives.length) * 100) : 0;

  function toggle(id: string) {
    setProgress((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">
              Roadmap · {roadmap.timeframe}
            </p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">{roadmap.ambition}</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onOpenRoom}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700 transition"
            >
              Open shared coaching room
            </button>
            <button
              onClick={onReset}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
            >
              New goal
            </button>
          </div>
        </div>

        <p className="text-slate-600 mt-4 leading-relaxed">{roadmap.overview}</p>

        {allObjectives.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
              <span>Daily objectives completed</span>
              <span className="font-medium">
                {doneCount}/{allObjectives.length} ({pct}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mt-6 relative">
        <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-300 hidden sm:block" />
        <div className="space-y-6">
          {roadmap.phases.map((phase, i) => (
            <div key={i} className="relative sm:pl-12">
              <div className="hidden sm:flex absolute left-0 top-1 h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-semibold ring-4 ring-[#f6f7fb]">
                {i + 1}
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{phase.name}</h3>
                  <span className="text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full px-3 py-1">
                    {phase.durationLabel}
                  </span>
                </div>
                <p className="text-slate-600 mt-2">{phase.summary}</p>

                {phase.milestones?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                      Milestones
                    </p>
                    <ul className="mt-2 space-y-2">
                      {phase.milestones.map((m, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="text-slate-700">
                            <span className="font-medium text-slate-900">{m.title}.</span>{" "}
                            {m.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {phase.dailyObjectives && phase.dailyObjectives.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                      Daily objectives
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {phase.dailyObjectives.map((obj) => (
                        <li key={obj.id}>
                          <label className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!progress[obj.id]}
                              onChange={() => toggle(obj.id)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span
                              className={
                                progress[obj.id]
                                  ? "text-slate-400 line-through"
                                  : "text-slate-700"
                              }
                            >
                              {obj.text}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
