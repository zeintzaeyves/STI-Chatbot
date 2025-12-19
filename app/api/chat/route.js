// app/api/chat/route.js
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
  return /\b(ano|ang|sa|ko|mo|po|opo|kasi|lang|pwede|magkano)\b/i.test(text)
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
   INTENTS
========================= */
function isFollowUp(text = "") {
  return (
    text.length <= 40 &&
    /^(what about|how about|and|then|so|that|it|those|them|this|next|payment|installment|schedule)/i.test(
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
   QUERY EXPANSION (CRITICAL)
========================= */
function expandQuery(q) {
  if (isTuition(q)) {
    return q + " estimated tuition fees per semester academic year 2025 2026";
  }
  if (wantsPrograms(q)) {
    return q + " program offerings courses available";
  }
  if (wantsSHS(q)) {
    return q + " senior high school strands offered";
  }
  return q;
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
async function searchHandbook(query) {
  try {
    const qVec = await embed(expandQuery(query));

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

    /* =========================
       1️⃣ CAMPUS — NO SCORE FILTER
    ========================= */
    const campusRaw = await HandbookChunk.aggregate(makePipeline("campus"));
    if (campusRaw.length) {
      return {
        source: "campus",
        hits: campusRaw.map(r => clean(r.text)),
      };
    }

    /* =========================
       2️⃣ GLOBAL — SCORE FILTER
    ========================= */
    const globalRaw = await HandbookChunk.aggregate(makePipeline("global"));
    const globalHits = globalRaw
      .filter(r => r.score >= 0.45)
      .map(r => clean(r.text));

    if (globalHits.length) {
      return { source: "global", hits: globalHits };
    }

    /* =========================
       3️⃣ SHS — ONLY IF ASKED
    ========================= */
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
  const prompt = `
Summarize briefly in bullet points.
Keep only important facts.

Previous:
${prev || "(none)"}

User: ${user}
Assistant: ${bot}
`;

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
- NEVER say phrases like:
  • "Based on the handbook"
  • "According to the information"
  • "As stated in the document"
- Speak confidently and naturally, as if you are the campus assistant

ANSWER FORMAT (MANDATORY — ALWAYS FOLLOW):
1. Start with a short, direct answer (1–2 sentences)
2. Follow with a clear section title
3. Use bullet points for details
4. Keep formatting consistent in ALL responses:
   - One main header
   - Bullet points only (no mixed styles)
   - No unnecessary separators or random bolding

SOURCE RULES (CRITICAL):
- Priority order: CAMPUS → GLOBAL → SHS (only if explicitly asked)
- If CAMPUS content exists:
  • Use it as the ONLY source of truth
  • Do NOT add or guess missing info
  • Rephrase in your own words (DO NOT copy text)
- NEVER merge Campus and Global information

CONTACT RULE (MANDATORY):
- When contact, confirmation, enrollment, or updates are mentioned,
  ALWAYS end with this line: **[STI Tagaytay Official Facebook Page](https://www.facebook.com/tagaytay.sti.edu)**

RESTRICTIONS:
- NEVER mention other STI campuses
- NEVER mention Junior High School
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
    return new Response(
      lang === "tl"
        ? "Pasensya, hindi ako maaaring sumagot sa tanong na ito."
        : "Sorry, I can’t help with this question.",
      { status: 200 }
    );
  }

  let memory =
    (await Memory.findOne({ sessionId })) ||
    (await Memory.create({
      sessionId,
      conversationSummary: "",
      attributes: {},
    }));

  if (!memory.attributes) memory.attributes = {};

  const name = extractName(userMessage);
  if (name) {
    memory.attributes.user_name = name;
    await Memory.updateOne(
      { sessionId },
      { $set: { "attributes.user_name": name } },
      { upsert: true }
    );
  }

  if (isMemoryRecall(userMessage)) {
    return new Response(
      memory.conversationSummary ||
      (lang === "tl"
        ? "Wala pa tayong napag-usapan."
        : "We haven’t discussed anything yet."),
      { status: 200 }
    );
  }

  let effectiveQuery = userMessage;
  const last = await Inquiry.findOne({ sessionId }).sort({ createdAt: -1 });
  if (last && isFollowUp(userMessage)) {
    effectiveQuery = `Previous topic: ${last.userQuery}\nFollow-up: ${userMessage}`;
  }

  const { source, hits } = await searchHandbook(effectiveQuery);

  if (wantsPrograms(userMessage) && source === "none") {
    return new Response(
      lang === "tl"
        ? "Ang listahan ng mga kursong inaalok ay hindi nakasaad sa campus handbook."
        : "The list of offered courses is not listed in the campus handbook.",
      { status: 200 }
    );
  }

  let context = "";
  if (hits.length) {
    context = `
SOURCE: ${source.toUpperCase()} HANDBOOK
${hits.map((t, i) => `${i + 1}. ${t}`).join("\n")}
`;
  }

  if (isTuition(userMessage) && source === "campus") {
    context =
      `STRICT TUITION MODE:
Show the tuition fees exactly as written.

` + context;
  }

const messages = [
  {
    role: "system",
    content: buildSystemPrompt(lang, memory.attributes?.user_name),
  },

  ...(context
    ? [
        {
          role: "system",
          content: `
REFERENCE INFORMATION (FOR FACTUAL GUIDANCE ONLY):

HOW TO USE THIS INFORMATION:
- Use this ONLY as factual grounding
- NEVER copy sentences word-for-word
- Explain naturally as a knowledgeable STI College Tagaytay campus assistant
- Keep ALL program names, fees, numbers, and policies EXACT
- You may add brief clarifications in your own words, but NEVER invent details
- If information is missing, clearly state that it is NOT LISTED in the campus handbook

RESPONSE STYLE (MANDATORY):
- Start with a clear, direct answer
- Use ONE main heading
- Use bullet points for details
- Keep formatting consistent (no random bolding or separators)
- Do NOT sound like a memo or policy document

CONTACT RULE:
- If the response mentions confirmation, enrollment, announcements, or updates,
  ALWAYS end with this clickable link:
  **[STI Tagaytay Official Facebook Page](https://www.facebook.com/tagaytay.sti.edu)**

STRICT RESTRICTIONS:
- NEVER mention other STI campuses
- NEVER mention Junior High School
- Do NOT invent phone numbers, emails, or links

FACTS:
${context}
`,
        },
      ]
    : []),

  { role: "user", content: userMessage },
];


  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    temperature: 0.25,
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

      const summary = await summarize(
        memory.conversationSummary,
        userMessage,
        fullReply
      );

      await Memory.updateOne(
        { sessionId },
        { conversationSummary: summary, attributes: memory.attributes },
        { upsert: true }
      );
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
