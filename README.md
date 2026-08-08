# LifeCoach AI

Tell LifeCoach AI your biggest ambition and it produces a complete, phased **roadmap** — milestones, a
week-by-week timeline, and concrete **daily objectives** you can check off (progress persists in your
browser). Then open a **collaborative coaching room**: anyone with the link joins the same real-time
chat about the goal, and the AI participates as a coach.

It runs end-to-end with **zero setup**. If no Anthropic API key is present, it drops into **mock mode**
and returns a realistic, structured roadmap and canned coach replies so the whole app is clickable.

---

## Features

1. **Goal intake** — free-text ambition, target timeframe, current situation, and constraints.
2. **Roadmap generator** — 3–5 phases, each with milestones and a timeline; the first phase includes
   daily objectives. Rendered as a timeline + checklist UI; objective progress is saved to
   `localStorage`.
3. **Collaborative shared chat** — in-memory "rooms". Share the room link/id and everyone joins the
   same chat; messages are broadcast to all participants in real time over WebSocket. The AI coach
   replies in the room.
4. **Server-side Anthropic calls** — roadmap generation and coaching both call the Anthropic API from
   the backend using the official `@anthropic-ai/sdk` with model `claude-sonnet-5`.

---

## Quick start (mock mode — no key needed)

```bash
npm install
npm run dev
```

- Client (Vite): **http://localhost:5173**
- Backend (Express + WebSocket): **http://localhost:3001**

The Vite dev server proxies `/api` and `/ws` to the backend, so you only need to open the client URL.
The header shows a **"Mock mode"** badge when no key is set.

### Try the collaborative room

1. Generate a roadmap, then click **"Open shared coaching room"** (or just open the app and use a
   `?room=<id>` link).
2. Click **"Copy invite link"** and open it in a second browser window / tab.
3. Enter a name in each window and chat — messages appear in both instantly, and the AI coach replies
   to the room.

## Running with a real Anthropic key

```bash
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
npm install
npm run dev
```

With a key present, the header shows **"Live · claude-sonnet-5"** and both roadmap generation and chat
coaching use the Anthropic API.

## Build (production client)

```bash
npm run build      # typechecks with tsc --noEmit, then builds the client to dist/
npm run preview    # preview the built client
npm start          # run the backend (serves /api + WebSocket) on PORT (default 3001)
```

---

## Architecture

```
lifecoach-ai/
├── index.html              # Vite entry
├── vite.config.ts          # dev server + proxy (/api, /ws → backend)
├── src/                    # Frontend: Vite + React + TypeScript + Tailwind
│   ├── App.tsx             # views: intake → roadmap → room; ?room= deep links
│   ├── types.ts            # shared TypeScript types
│   ├── lib/
│   │   ├── api.ts          # REST client (roadmap, health)
│   │   └── storage.ts      # localStorage: roadmap + objective progress
│   └── components/
│       ├── GoalIntake.tsx  # the goal form
│       ├── Roadmap.tsx     # timeline + daily-objective checklist
│       └── Room.tsx        # WebSocket collaborative chat
└── server/                 # Backend: Node + Express + ws (ESM)
    ├── index.js            # REST endpoints + WebSocket room server
    └── ai.js               # Anthropic SDK calls + mock-mode fallbacks
```

**Data flow**

- **Roadmap:** client `POST /api/roadmap` → server `generateRoadmap()` → Anthropic (or mock) → JSON
  roadmap → rendered timeline; objective checkboxes persist to `localStorage`.
- **Chat:** client opens `ws://…/ws`, sends `{type:"join", room, name}` then `{type:"chat", text}`.
  The server keeps each room in memory (`Map<roomId, {messages, clients, goal}>`), broadcasts every
  message to all clients in the room, and calls `coachReply()` (Anthropic or mock) to add the coach's
  response.

**Mock mode:** `server/ai.js` checks `process.env.ANTHROPIC_API_KEY`. If unset, `MOCK_MODE` is true and
the Anthropic client is never constructed — `generateRoadmap()` returns a structured templated roadmap
built from the user's inputs, and `coachReply()` returns context-aware canned replies.

**Ports:** backend `3001` (override with `PORT`), client dev server `5173`.

---

## Deploy

This ships as a **single service**: the Express server serves the built client (`dist/`) as static
files and also hosts `/api` and the `/ws` WebSocket on one port. `/api` and `/ws` take precedence; every
other path falls back to `index.html` so client routing works.

### Single-service flow (any Node host)

```bash
npm install        # install deps
npm run build      # typecheck + build the client to dist/
npm start          # NODE_ENV=production, serves API + WebSocket + client on PORT (default 3001)
```

With no `ANTHROPIC_API_KEY`, it runs in **mock mode** (fully demoable). Set the key to go live. Make sure
the host allows WebSocket upgrades on the same port.

### Docker

A multi-stage `Dockerfile` builds the client in stage 1 and runs a slim Node runtime in stage 2, serving
API + WebSocket + static client on `$PORT` (default 3001, `EXPOSE`d). With no env keys it runs in mock
mode; pass `ANTHROPIC_API_KEY` to go live.

```bash
docker build -t lifecoach-ai .
docker run -p 3001:3001 lifecoach-ai                      # mock mode
docker run -p 3001:3001 -e ANTHROPIC_API_KEY=sk-ant-... lifecoach-ai   # live
```

### Render (Blueprint)

`render.yaml` defines a Node web service — build `npm install && npm run build`, start `npm start`, with
`ANTHROPIC_API_KEY` as a dashboard-set secret (`sync:false`). Point Render at the repo and deploy the
Blueprint; Render injects `PORT` automatically and WebSocket upgrades work on the same origin.

---

## Notes

- Rooms are **in-memory** — they reset when the server restarts and are reclaimed when empty. This is
  intentional for a lightweight demo; swap in Redis/a database for persistence.
- Model id is `claude-sonnet-5`, read server-side only. The key never reaches the browser.

### Dependency audit

`npm audit` originally reported 2 advisories in **build-time-only** transitive deps (both under `vite`):

- **esbuild ≤0.24.2 (moderate)** — dev-server request SSRF. **Resolved**: pinned via a `package.json`
  `overrides` field to `esbuild ^0.25.0`. Build and mock-mode start both pass with the override.
- **vite ≤6.4.2 (high)** — dev-server path traversal / `server.fs.deny` bypass (Windows). **Left as-is
  and accepted.** The only fix is `vite@8` (a breaking major upgrade, applied only by `npm audit fix
  --force`), which we deliberately do not take. This advisory affects the **Vite dev server only** — it
  is never run in production. Production serves the pre-built static `dist/` through Express, so the
  vulnerable dev-server code path is never reachable in a deployed instance.

Net: `npm audit` reports 1 residual high advisory, confined to the dev toolchain and not present in the
production runtime.
