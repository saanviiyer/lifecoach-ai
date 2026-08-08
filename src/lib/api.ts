import type { GoalInput, Roadmap } from "../types";

export async function generateRoadmap(
  input: GoalInput
): Promise<{ roadmap: Roadmap; mockMode: boolean }> {
  const res = await fetch("/api/roadmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function getHealth(): Promise<{ ok: boolean; mockMode: boolean; model: string }> {
  const res = await fetch("/api/health");
  return res.json();
}
