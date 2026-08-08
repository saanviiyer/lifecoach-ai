import type { Roadmap } from "../types";

const ROADMAP_KEY = "lifecoach.roadmap";
const PROGRESS_KEY = "lifecoach.progress";

export function saveRoadmap(roadmap: Roadmap): void {
  try {
    localStorage.setItem(ROADMAP_KEY, JSON.stringify(roadmap));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function loadRoadmap(): Roadmap | null {
  try {
    const raw = localStorage.getItem(ROADMAP_KEY);
    return raw ? (JSON.parse(raw) as Roadmap) : null;
  } catch {
    return null;
  }
}

export function clearRoadmap(): void {
  try {
    localStorage.removeItem(ROADMAP_KEY);
  } catch {
    /* ignore */
  }
}

// Progress is a map of objective id -> checked.
export function loadProgress(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, boolean>): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}
