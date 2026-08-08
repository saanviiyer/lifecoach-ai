import { useState } from "react";
import type { GoalInput } from "../types";

interface Props {
  onSubmit: (input: GoalInput) => void;
  loading: boolean;
  error: string | null;
}

const TIMEFRAMES = ["1 month", "3 months", "6 months", "1 year", "2 years"];

export default function GoalIntake({ onSubmit, loading, error }: Props) {
  const [ambition, setAmbition] = useState("");
  const [timeframe, setTimeframe] = useState("6 months");
  const [situation, setSituation] = useState("");
  const [constraints, setConstraints] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ambition.trim() || loading) return;
    onSubmit({ ambition: ambition.trim(), timeframe, situation: situation.trim(), constraints: constraints.trim() });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8"
    >
      <h2 className="text-xl font-semibold text-slate-900">What's your biggest ambition?</h2>
      <p className="text-slate-500 mt-1 text-sm">
        Describe it in your own words. We'll turn it into a phased roadmap with daily objectives.
      </p>

      <label className="block mt-6 text-sm font-medium text-slate-700">Ambition</label>
      <textarea
        value={ambition}
        onChange={(e) => setAmbition(e.target.value)}
        rows={3}
        placeholder="e.g. Launch a profitable side business selling handmade ceramics"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Target timeframe</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TIMEFRAMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="block mt-4 text-sm font-medium text-slate-700">Current situation</label>
      <textarea
        value={situation}
        onChange={(e) => setSituation(e.target.value)}
        rows={2}
        placeholder="Where are you starting from? Skills, resources, experience..."
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <label className="block mt-4 text-sm font-medium text-slate-700">Constraints</label>
      <textarea
        value={constraints}
        onChange={(e) => setConstraints(e.target.value)}
        rows={2}
        placeholder="Time, budget, or other limits we should plan around..."
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !ambition.trim()}
        className="mt-6 w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Building your roadmap..." : "Generate my roadmap"}
      </button>
    </form>
  );
}
