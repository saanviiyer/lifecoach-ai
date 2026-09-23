# LifeCoach AI

You tell LifeCoach AI a goal. It makes a phased roadmap with milestones and a week-by-week timeline. The roadmap also lists daily objectives that you can check off. You can also open a shared chat room about the goal, where an AI coach takes part.

## Features

- Goal intake. You enter a free-text goal, a target timeframe, your current situation and your constraints.
- Roadmap generator. The roadmap has 3 to 5 phases. Each phase has milestones and a timeline. The first phase also has daily objectives. The UI shows a timeline and a checklist. The browser saves objective progress in `localStorage`.
- Shared chat rooms. Rooms live in server memory. Everyone who opens the room link joins the same chat. The server sends each message to all participants over WebSocket. The AI coach replies in the room.
- The backend makes all Anthropic calls with the official `@anthropic-ai/sdk` and the model `claude-sonnet-5`. The key stays on the server and never reaches the browser.

The app needs no setup. With no Anthropic API key, it runs in mock mode. Mock mode returns a templated roadmap built from your inputs and canned coach replies that use the context. The header shows a "Mock mode" badge. With a key, it shows "Live · claude-sonnet-5".

## Run it

```bash
git clone https://github.com/saanviiyer/lifecoach-ai
cd lifecoach-ai
npm install
npm run dev
```

- Client (Vite): http://localhost:5173
- Backend (Express and WebSocket): http://localhost:3001

The Vite dev server sends `/api` and `/ws` to the backend. Open the client URL only.

To use the real Anthropic API, copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, and restart.

To try a shared room, generate a roadmap and click "Open shared coaching room". You can also open the app with a `?room=<id>` link. Click "Copy invite link" and open the link in a second window. Enter a name in each window and send messages. The messages appear in both windows, and the coach replies.

Production build:

```bash
npm run build      # tsc --noEmit, then builds the client to dist/
npm run preview    # preview the built client
npm start          # NODE_ENV=production, serves API, WebSocket and client on PORT
```

There is no test script.

### Deploy

In production, one Express process serves the built client from `dist/`, the `/api` routes and the `/ws` WebSocket on one port. `/api` and `/ws` come first. Every other path falls back to `index.html`. The host must allow WebSocket upgrades on that port.

Docker. The multi-stage `Dockerfile` builds the client and then runs a slim Node image on `$PORT` (default 3001).

```bash
docker build -t lifecoach-ai .
docker run -p 3001:3001 lifecoach-ai                                  # mock mode
docker run -p 3001:3001 -e ANTHROPIC_API_KEY=<your-key> lifecoach-ai  # live
```

Render. `render.yaml` defines a Node web service. The build command is `npm install && npm run build` and the start command is `npm start`. Set `ANTHROPIC_API_KEY` in the dashboard (`sync: false`). Render sets `PORT`.

## Environment variables

| Name | Purpose | Required |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Live roadmap and coach replies. Without it, the app runs in mock mode. | Optional |
| `PORT` | Backend port. Default is 3001. | Optional |

## How it works

- Roadmap. The client sends `POST /api/roadmap`. The server calls `generateRoadmap()`, which uses Anthropic or the mock. The server returns a JSON roadmap.
- Chat. The client opens `ws://.../ws` and sends `{type:"join", room, name}`, then `{type:"chat", text}`. The server keeps each room in a `Map<roomId, {messages, clients, goal}>`. It sends every message to all clients in the room and calls `coachReply()` for the coach.
- Mock mode. `server/ai.js` checks `ANTHROPIC_API_KEY`. If the key is not set, the server does not create the Anthropic client.

## Limits

- Rooms are in memory. They reset when the server restarts, and the server removes empty rooms. This is on purpose for a small demo. Add Redis or a database for persistence.
- Dependency audit. `npm audit` first reported 2 advisories in build-time dependencies under `vite`. The esbuild advisory (esbuild 0.24.2 and older, moderate, dev-server SSRF) is fixed with a `package.json` override to `esbuild ^0.25.0`. The vite advisory (vite 6.4.2 and older, high, dev-server path traversal on Windows) is accepted. Its only fix is `vite@8`, a breaking major upgrade, and the project does not take it. The advisory affects only the Vite dev server. Production serves the pre-built `dist/` through Express, so a deployed instance cannot reach that code. `npm audit` still reports 1 high advisory in the dev toolchain.

## Layout

```
index.html              Vite entry
vite.config.ts          dev server and proxy (/api, /ws to backend)
src/                    Vite, React, TypeScript, Tailwind
  App.tsx               views (intake, roadmap, room) and ?room= links
  types.ts              shared types
  lib/api.ts            REST client (roadmap, health)
  lib/storage.ts        localStorage for roadmap and progress
  components/
    GoalIntake.tsx      goal form
    Roadmap.tsx         timeline and daily-objective checklist
    Room.tsx            WebSocket chat
server/                 Node, Express, ws (ESM)
  index.js              REST endpoints and WebSocket room server
  ai.js                 Anthropic calls and mock fallbacks
Dockerfile, render.yaml, .env.example
```
