import "dotenv/config";
import http from "http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { generateRoadmap, coachReply, MOCK_MODE } from "./ai.js";

const PORT = process.env.PORT || 3001;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The built client (vite build) lands in <repo>/dist.
const CLIENT_DIST = path.resolve(__dirname, "../dist");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve the built client as static files. In dev the client is served by Vite
// on 5173; in production this is how the SPA is delivered.
app.use(express.static(CLIENT_DIST));

/* ------------------------------------------------------------------ *
 * REST: health + roadmap generation
 * ------------------------------------------------------------------ */

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mockMode: MOCK_MODE, model: "claude-sonnet-5" });
});

app.post("/api/roadmap", async (req, res) => {
  const { ambition } = req.body || {};
  if (!ambition || !ambition.trim()) {
    return res.status(400).json({ error: "ambition is required" });
  }
  try {
    const roadmap = await generateRoadmap(req.body);
    res.json({ roadmap, mockMode: MOCK_MODE });
  } catch (err) {
    console.error("roadmap generation failed:", err);
    res.status(500).json({ error: "Failed to generate roadmap. " + (err?.message || "") });
  }
});

/* ------------------------------------------------------------------ *
 * In-memory rooms for the collaborative shared chat
 * ------------------------------------------------------------------ */

/**
 * rooms: Map<roomId, {
 *   goal: string|null,
 *   roadmapOverview: string|null,
 *   messages: Array<{id,author,role,text,ts}>,
 *   clients: Set<ws>
 * }>
 */
const rooms = new Map();

function getRoom(id) {
  let room = rooms.get(id);
  if (!room) {
    room = { goal: null, roadmapOverview: null, messages: [], clients: new Set() };
    rooms.set(id, room);
  }
  return room;
}

let msgSeq = 0;
const makeMessage = (author, role, text) => ({
  id: `m-${Date.now().toString(36)}-${(msgSeq++).toString(36)}`,
  author,
  role, // "user" | "coach" | "system"
  text,
  ts: Date.now(),
});

function broadcast(room, payload) {
  const data = JSON.stringify(payload);
  for (const ws of room.clients) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

function sendPresence(room) {
  broadcast(room, { type: "presence", count: room.clients.size });
}

// SPA catch-all: any non-/api, non-/ws GET falls back to index.html so client
// routing works. /api routes above and the /ws upgrade below take precedence.
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/ws")) return next();
  res.sendFile(path.join(CLIENT_DIST, "index.html"), (err) => {
    if (err) next();
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  let room = null;
  let roomId = null;
  let name = "Guest";

  const send = (payload) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
  };

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === "join") {
      roomId = String(msg.room || "lobby");
      name = (msg.name && String(msg.name).trim()) || "Guest";
      room = getRoom(roomId);
      room.clients.add(ws);

      // Optional goal/context supplied by the joiner (first one to set it wins).
      if (msg.goal && !room.goal) room.goal = String(msg.goal);
      if (msg.roadmapOverview && !room.roadmapOverview) {
        room.roadmapOverview = String(msg.roadmapOverview);
      }

      // Send the full history so a late joiner sees the whole conversation.
      send({ type: "history", roomId, goal: room.goal, messages: room.messages });

      const joinNote = makeMessage("System", "system", `${name} joined the room.`);
      room.messages.push(joinNote);
      broadcast(room, { type: "message", message: joinNote });
      sendPresence(room);
      return;
    }

    if (!room) return; // must join first

    if (msg.type === "setGoal") {
      room.goal = String(msg.goal || room.goal || "");
      if (msg.roadmapOverview) room.roadmapOverview = String(msg.roadmapOverview);
      broadcast(room, { type: "goal", goal: room.goal });
      return;
    }

    if (msg.type === "chat") {
      const text = String(msg.text || "").trim();
      if (!text) return;

      const userMsg = makeMessage(name, "user", text);
      room.messages.push(userMsg);
      broadcast(room, { type: "message", message: userMsg });

      // The AI coach participates in the shared chat.
      broadcast(room, { type: "coachTyping", value: true });
      try {
        const reply = await coachReply(room.messages, {
          goal: room.goal,
          roadmapOverview: room.roadmapOverview,
        });
        const coachMsg = makeMessage("LifeCoach AI", "coach", reply);
        room.messages.push(coachMsg);
        broadcast(room, { type: "message", message: coachMsg });
      } catch (err) {
        console.error("coach reply failed:", err);
        const errMsg = makeMessage(
          "LifeCoach AI",
          "coach",
          "Sorry, I hit a problem responding just now. Please try again."
        );
        room.messages.push(errMsg);
        broadcast(room, { type: "message", message: errMsg });
      } finally {
        broadcast(room, { type: "coachTyping", value: false });
      }
      return;
    }
  });

  ws.on("close", () => {
    if (room) {
      room.clients.delete(ws);
      const leaveNote = makeMessage("System", "system", `${name} left the room.`);
      room.messages.push(leaveNote);
      broadcast(room, { type: "message", message: leaveNote });
      sendPresence(room);
      // Reclaim empty rooms to avoid unbounded memory growth.
      if (room.clients.size === 0) rooms.delete(roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\nLifeCoach AI server listening on http://localhost:${PORT}`);
  console.log(`  REST:      POST /api/roadmap , GET /api/health`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  Mode:      ${MOCK_MODE ? "MOCK (no ANTHROPIC_API_KEY set)" : "LIVE (claude-sonnet-5)"}\n`);
});
