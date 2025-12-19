import mongoose from "mongoose";
import OpenAI from "openai";
import HandbookChunk from "@models/HandbookChunk.js";
import Memory from "@models/Memory.js";
import Inquiry from "@models/Inquiry.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* =========================
   CONFIG
========================= */
const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4.1";
const EMB_MODEL = process.env.EMB_MODEL || "text-embedding-3-small";
const TOP_K = 5;
const DB_TIMEOUT = 5000;
const SUMMARY_MAX = 1200;

/* =========================
   DB
========================= */
async function ensureMongo() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
}

/* =========================
   UTILS
========================= */
const clean = (t = "") =>
  String(t || "").replace(/\*\*/g, "").replace(/`/g, "").trim();

function detectLanguage(text = "") {
  return /\b(ano|ang|sa|ko|mo|po|opo|kasi|lang|pwede|magkano|paano)\b/i.test(text)
    ? "tl"
    : "en";
}

/* =========================
   SAFETY (MINIMAL)
========================= */
function isForbiddenTopic(text = "") {
  return [
    /\b(symptom|diagnose|treatment|medicine|dose)\b/i,
    /\b(lawyer|lawsuit|legal advice|court)\b/i,
    /\b(bitcoin|crypto|forex|stocks?|investment)\b/i,
    /\b(hack|cheat|bypass|crack)\b/i,
    /\b(drugs?|cocaine|weed|porn)\b/i,
    /\b(election|vote|politics|government)\b/i,
  ].some(rx => rx.test(text));
}

/* =========================
   NAME
========================= */
function extractName(text = "") {
  const m = text.match(
    /(my name is|i am|i'm|ako si)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]{2,60})/i
  );
  return m?.[2] || null;
}

/* =========================
   INTENTS & TOPIC DETECTION
========================= */
function getTopic(text = "") {
  const t = text.toLowerCase();
  if (/\b(tuition|fee|magkano|bayad|payment|installment|scholarship|presyo)\b/i.test(t)) return "tuition";
  if (/\b(enroll|enrolling|enrollment|procedure|steps|apply|applying|requirement|requirements|paano mag)\b/i.test(t)) return "enrollment";
  if (/\b(course|courses|program|degree|offered|available|inooffer|kurso|strand|strands)\b/i.test(t)) return "programs";
  return "general";
}

function isFollowUp(text = "") {
  return (
    text.length <= 50 &&
    /^(what about|how about|and|then|so|that|it|those|them|this|next|payment|installment|schedule|and if|magkano|paano kung|eh kung)\b/i.test(
      text.trim()
    )
  );
}

function isMemoryRecall(text = "") {
  return /remember|recap|summary|naalala|pinag-usapan/i.test(text.toLowerCase());
}

function wantsSHS(text = "") {
  return /\b(shs|senior high|grade 11|grade 12|strand)\b/i.test(text);
}

function wantsPrograms(text = "") {
  return /\b(course|courses|program|degree|offered|available|inooffer|kurso)\b/i.test(text);
}

function isTuition(text = "") {
  return /\b(tuition|fee|magkano|bayad|payment)\b/i.test(text);
}

/* =========================
   QUERY EXPANSION (CONTEXT AWARE)
========================= */
function expandQuery(q, forcedTopic = "general") {
  let expanded = q;
  const activeTopic = forcedTopic !== "general" ? forcedTopic : getTopic(q);

  if (activeTopic === "tuition") {
    expanded += " tuition fees estimated payment breakdown school fees academic year 2025 2026 installment";
  } else if (activeTopic === "enrollment") {
    expanded += " enrollment procedure requirements steps application process how to enroll";
  } else if (activeTopic === "programs") {
    expanded += " program offerings courses available academic strands";
  }

  if (wantsSHS(q)) {
    expanded += " senior high school shs strands offered";
  }
  
  return expanded;
}

/* =========================
   EMBEDDING
========================= */
async function embed(text) {
  const res = await openai.embeddings.create({
    model: EMB_MODEL,
    input: text,
  });
  return res.data[0].embedding;
}

/* =========================
   VECTOR SEARCH (FIXED)
========================= */
async function searchHandbook(query, forcedTopic = "general") {
  try {
    const expanded = expandQuery(query, forcedTopic);
    const qVec = await embed(expanded);

    const makePipeline = (type) => ([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: qVec,
          limit: TOP_K,
          numCandidates: 200,
          filter: { type },
        },
      },
      {
        $project: {
          _id: 0,
          text: 1,
          score: { $meta: "searchScore" },
        },
      },
    ]);

    // 1. CAMPUS
    const campusRaw = await HandbookChunk.aggregate(makePipeline("campus"));
    if (campusRaw.length) {
      return {
        source: "campus",
        hits: campusRaw.map(r => clean(r.text)),
      };
    }

    // 2. GLOBAL
    const globalRaw = await HandbookChunk.aggregate(makePipeline("global"));
    const globalHits = globalRaw
      .filter(r => r.score >= 0.45)
      .map(r => clean(r.text));

    if (globalHits.length) {
      return { source: "global", hits: globalHits };
    }

    // 3. SHS
    if (wantsSHS(query)) {
      const shsRaw = await HandbookChunk.aggregate(makePipeline("shs"));
      const shsHits = shsRaw
        .filter(r => r.score >= 0.45)
        .map(r => clean(r.text));

      if (shsHits.length) {
        return { source: "shs", hits: shsHits };
      }
    }

    return { source: "none", hits: [] };
  } catch (err) {
    console.error("searchHandbook error:", err);
    return { source: "none", hits: [] };
  }
}

/* =========================
   SUMMARY
========================= */
async function summarize(prev, user, bot) {
  const prompt = `Summarize briefly in bullet points. Keep only important facts.\n\nPrevious: ${prev || "(none)"}\nUser: ${user}\nAssistant: ${bot}`;
  const res = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0,
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });
  return clean(res.choices[0].message.content).slice(0, SUMMARY_MAX);
}

/* =========================
   SYSTEM PROMPT
========================= */
function buildSystemPrompt(lang, name) {
  return `
You are STI Assist, the official virtual academic assistant of STI College Tagaytay.
${name ? `Address the user naturally by their name (${name}) when appropriate.` : ""}

VOICE & TONE (STRICT):
- Speak directly as STI College Tagaytay
- NEVER say phrases like: "Based on the handbook" or "According to the document"
- Speak confidently and naturally

ANSWER FORMAT (MANDATORY):
1. Start with a short, direct answer (1–2 sentences)
2. Follow with ONE clear section title
3. Use bullet points for details
4. Keep formatting consistent

CONTACT RULE (MANDATORY):
- When contact, confirmation, enrollment, or updates are mentioned,
  ALWAYS end with this line: **[STI Tagaytay Official Facebook Page](https://www.facebook.com/tagaytay.sti.edu)**

RESTRICTIONS:
- NEVER mention other STI campuses or Junior High School
- Language: ${lang === "tl" ? "Tagalog" : "English"}
`;
}

/* =========================
   MAIN ROUTE
========================= */
export async function POST(req) {
  await ensureMongo();

  const { message = "", sessionId = `anon-${Date.now()}` } =
    await req.json().catch(() => ({}));

  const userMessage = clean(message);
  if (!userMessage) return new Response("Missing message", { status: 400 });

  const lang = detectLanguage(userMessage);

  if (isForbiddenTopic(userMessage)) {
    return new Response(lang === "tl" ? "Pasensya, hindi ako maaaring sumagot." : "Sorry, I can’t help.", { status: 200 });
  }

  let memory = (await Memory.findOne({ sessionId })) || (await Memory.create({ sessionId, conversationSummary: "", attributes: {} }));
  if (!memory.attributes) memory.attributes = {};

  const name = extractName(userMessage);
  if (name) {
    memory.attributes.user_name = name;
    await Memory.updateOne({ sessionId }, { $set: { "attributes.user_name": name } });
  }

  if (isMemoryRecall(userMessage)) {
    return new Response(memory.conversationSummary || (lang === "tl" ? "Wala pa tayong napag-usapan." : "No previous discussion."), { status: 200 });
  }

  // --- CONTEXT PERSISTENCE LOGIC ---
  let effectiveQuery = userMessage;
  let forcedTopic = "general";
  
  const last = await Inquiry.findOne({ sessionId }).sort({ createdAt: -1 });
  if (last && isFollowUp(userMessage)) {
    // Determine the topic from the previous exchange
    forcedTopic = getTopic(last.userQuery + " " + last.botResponse);
    effectiveQuery = `Topic Context: ${forcedTopic}. Previous Query: ${last.userQuery}. Current Follow-up: ${userMessage}`;
  }

  const { source, hits } = await searchHandbook(effectiveQuery, forcedTopic);

  if (wantsPrograms(userMessage) && source === "none") {
    return new Response(lang === "tl" ? "Hindi nakasaad ang mga kurso sa handbook." : "Offered courses are not listed.", { status: 200 });
  }

  let context = hits.length ? `SOURCE: ${source.toUpperCase()} HANDBOOK\n${hits.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "";

  // Preserve your special tuition mode check
  if (isTuition(userMessage) && source === "campus") {
    context = `STRICT TUITION MODE:\nShow fees exactly as written.\n\n` + context;
  }

  const messages = [
    { role: "system", content: buildSystemPrompt(lang, memory.attributes?.user_name) },
    ...(context ? [{ role: "system", content: `REFERENCE INFORMATION:\n${context}` }] : []),
    { role: "user", content: userMessage },
  ];

  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    temperature: 0.15, // Lowered for higher factual accuracy
    messages,
  });

  const encoder = new TextEncoder();
  let fullReply = "";

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk?.choices?.[0]?.delta?.content;
        if (!text) continue;
        fullReply += text;
        controller.enqueue(encoder.encode(text));
      }
      controller.close();

      await Inquiry.create({
        inquiryId: `INQ-${Date.now()}`,
        sessionId,
        userQuery: userMessage,
        botResponse: fullReply,
        status: "solved",
      });

      const summary = await summarize(memory.conversationSummary, userMessage, fullReply);
      await Memory.updateOne({ sessionId }, { conversationSummary: summary, attributes: memory.attributes });
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}