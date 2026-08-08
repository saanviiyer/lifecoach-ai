import Anthropic from "@anthropic-ai/sdk";

// The exact model id requested for LifeCoach AI.
const MODEL = "claude-sonnet-5";

const apiKey = process.env.ANTHROPIC_API_KEY;
export const MOCK_MODE = !apiKey;

// Only construct the client when a key is present. In mock mode we never touch it.
const client = MOCK_MODE ? null : new Anthropic({ apiKey });

/* ------------------------------------------------------------------ *
 * JSON helpers
 * ------------------------------------------------------------------ */

// Claude sometimes wraps JSON in ```json fences or adds prose. Pull the object out.
function extractJson(text) {
  if (!text) throw new Error("empty response");
  let t = text.trim();
  // strip markdown code fences
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("no JSON object found");
  return JSON.parse(t.slice(first, last + 1));
}

let idCounter = 0;
const nid = (p) => `${p}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

/* ------------------------------------------------------------------ *
 * Mock roadmap (used when ANTHROPIC_API_KEY is unset)
 * Genuinely structured and useful, tailored to the user's inputs.
 * ------------------------------------------------------------------ */

function mockRoadmap({ ambition, timeframe, situation, constraints }) {
  const goal = (ambition || "your ambition").trim();
  const tf = (timeframe || "6 months").trim();

  const dailyObjectives = [
    "Spend 30 focused minutes moving one concrete task forward",
    "Write down the single most important outcome for today",
    "Review yesterday's progress and note one lesson learned",
    "Reach out to or research one person/resource relevant to the goal",
    "Track your effort in a simple log (what you did, how long, blockers)",
    "Read or study for 20 minutes to build a skill the goal requires",
    "End the day by planning the first task for tomorrow",
  ].map((text) => ({ id: nid("obj"), text }));

  return {
    ambition: goal,
    timeframe: tf,
    overview:
      `A ${tf} plan to achieve "${goal}". It moves from clarity and foundations, ` +
      `through focused building, into momentum and refinement. ` +
      (situation ? `Starting point considered: ${situation}. ` : "") +
      (constraints ? `Working within: ${constraints}. ` : "") +
      `Each phase has milestones you can measure, and Phase 1 breaks down into daily objectives you can check off.`,
    phases: [
      {
        name: "Phase 1 - Foundations & Clarity",
        durationLabel: "Weeks 1-4",
        summary:
          "Get crystal clear on the target, remove ambiguity, and build the daily habits and baseline skills the goal depends on.",
        milestones: [
          { title: "Define success precisely", description: `Write a one-sentence definition of what achieving "${goal}" actually looks like, with a measurable finish line.` },
          { title: "Audit your starting point", description: "List current skills, resources, and gaps relevant to the goal." },
          { title: "Establish a daily rhythm", description: "Commit to a repeatable daily block of focused work and start tracking it." },
          { title: "Line up your first resources", description: "Identify the top 3 tools, courses, or people that will accelerate you." },
        ],
        dailyObjectives,
      },
      {
        name: "Phase 2 - Focused Building",
        durationLabel: `Weeks 5-12`,
        summary:
          "Do the core work that directly produces the outcome. Ship tangible progress every week and correct course from real feedback.",
        milestones: [
          { title: "Complete the core deliverable v1", description: "Produce the first real version of whatever the goal centers on." },
          { title: "Get outside feedback", description: "Share your progress with someone who can give honest, useful critique." },
          { title: "Hit the halfway metric", description: "Reach roughly 50% of your measurable finish line." },
          { title: "Systematize what works", description: "Turn your most effective activities into a repeatable weekly routine." },
        ],
      },
      {
        name: "Phase 3 - Momentum & Refinement",
        durationLabel: "Weeks 13-20",
        summary:
          "Push through the hard middle, raise the quality bar, and eliminate the bottlenecks slowing you down.",
        milestones: [
          { title: "Break the biggest bottleneck", description: "Diagnose the single thing most limiting progress and fix it." },
          { title: "Raise the quality bar", description: "Refine your deliverable to a standard you're genuinely proud of." },
          { title: "Build accountability", description: "Set up a check-in (partner, group, or public commitment) to stay consistent." },
        ],
      },
      {
        name: "Phase 4 - Finish & Sustain",
        durationLabel: "Weeks 21-26",
        summary:
          "Cross the finish line, capture the lessons, and set up whatever keeps the result alive after the goal is met.",
        milestones: [
          { title: "Reach the finish line", description: `Achieve the measurable definition of "${goal}" you wrote in Phase 1.` },
          { title: "Document the playbook", description: "Write down what worked so you can repeat or teach it." },
          { title: "Plan what's next", description: "Decide how you'll sustain the result or set the next, bigger goal." },
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Roadmap generation
 * ------------------------------------------------------------------ */

export async function generateRoadmap(input) {
  if (MOCK_MODE) return mockRoadmap(input);

  const { ambition, timeframe, situation, constraints } = input;

  const system =
    "You are LifeCoach AI, an expert goal strategist. Given a person's ambition, you produce a " +
    "structured, realistic roadmap. Respond with ONLY a JSON object (no prose, no code fences) matching this shape:\n" +
    `{
  "ambition": string,
  "timeframe": string,
  "overview": string,
  "phases": [
    {
      "name": string,
      "durationLabel": string,
      "summary": string,
      "milestones": [ { "title": string, "description": string } ],
      "dailyObjectives": [ { "id": string, "text": string } ]
    }
  ]
}\n` +
    "Rules: 3-5 phases. Every phase has 3-5 milestones. The FIRST phase MUST include 5-7 concrete " +
    "dailyObjectives (each with a unique id string). Later phases may omit dailyObjectives. Make the plan " +
    "specific to the ambition, timeframe, current situation, and constraints given.";

  const user =
    `Ambition: ${ambition}\n` +
    `Target timeframe: ${timeframe || "not specified"}\n` +
    `Current situation: ${situation || "not specified"}\n` +
    `Constraints: ${constraints || "none specified"}`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const roadmap = extractJson(text);

  // Ensure every daily objective has an id (models occasionally omit them).
  for (const phase of roadmap.phases || []) {
    for (const obj of phase.dailyObjectives || []) {
      if (!obj.id) obj.id = nid("obj");
    }
  }
  return roadmap;
}

/* ------------------------------------------------------------------ *
 * Chat coaching
 * ------------------------------------------------------------------ */

function mockCoachReply(userText, ctx) {
  const goal = ctx?.goal ? `"${ctx.goal}"` : "your goal";
  const t = (userText || "").toLowerCase();

  if (t.includes("stuck") || t.includes("blocked") || t.includes("hard")) {
    return (
      `It's completely normal to hit resistance on ${goal}. Let's shrink it: what is the ` +
      `single smallest action you could take in the next 15 minutes? Name it, do just that, ` +
      `and report back here. Momentum beats motivation.`
    );
  }
  if (t.includes("motivat") || t.includes("give up") || t.includes("quit")) {
    return (
      `Remember why ${goal} matters to you. Progress isn't linear - the dip is part of it. ` +
      `Look at what you've already checked off this week, and pick one objective to move today. ` +
      `Small wins rebuild momentum.`
    );
  }
  if (t.includes("plan") || t.includes("next") || t.includes("what should")) {
    return (
      `Great question. For ${goal}, focus on the current phase's milestones first. Pick the ` +
      `daily objective that unblocks the most downstream work, schedule a specific time for it ` +
      `today, and tell the group when it's done so we can hold you accountable.`
    );
  }
  return (
    `Thanks for sharing that. Toward ${goal}: what's one concrete step you can commit to before ` +
    `tomorrow? Be specific about what, when, and for how long - then check it off and let the room know.`
  );
}

// history: [{ author, role, text }]  (role: "user" | "coach")
export async function coachReply(history, ctx) {
  const last = [...history].reverse().find((m) => m.role === "user");
  if (MOCK_MODE) return mockCoachReply(last?.text || "", ctx);

  const system =
    "You are LifeCoach AI, a warm, direct coach participating in a SHARED group chat where a team " +
    "works toward a common goal. Keep replies concise (2-4 sentences), encouraging, and action-oriented. " +
    "Always push toward one concrete next step. " +
    (ctx?.goal ? `The group's goal: ${ctx.goal}. ` : "") +
    (ctx?.roadmapOverview ? `Roadmap overview: ${ctx.roadmapOverview}` : "");

  // Map the shared-room history into alternating turns for the model. Everyone who
  // isn't the coach is treated as a "user"; we prefix names so the coach has context.
  const messages = history
    .filter((m) => m.text && m.text.trim())
    .map((m) =>
      m.role === "coach"
        ? { role: "assistant", content: m.text }
        : { role: "user", content: `${m.author || "Someone"}: ${m.text}` }
    );

  if (messages.length === 0 || messages[0].role !== "user") {
    messages.unshift({ role: "user", content: "Let's get started on our goal." });
  }

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages,
  });

  return resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
