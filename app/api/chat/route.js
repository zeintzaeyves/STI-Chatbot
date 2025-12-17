import mongoose from "mongoose";
import OpenAI from "openai";
import HandbookChunk from "@models/HandbookChunk.js";
import Memory from "@models/Memory.js";
import Inquiry from "@models/Inquiry.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// CONFIG
const CHAT_MODEL = process.env.CHAT_MODEL || "gpt-4.1";
const EMB_MODEL = process.env.EMB_MODEL || "text-embedding-3-small";
const TOP_K = Number(process.env.TOP_K || 5);
const DB_TIMEOUT = Number(process.env.DB_TIMEOUT || 5000);
const SUMMARY_MAX_CHARS = 1600;
const SUMMARY_REDUCE_TO = 600;

/* =========================
   Helpers
   ========================= */
const clean = (t = "") => String(t || "").replace(/\*\*/g, "").replace(/`/g, "").trim();

function isSummaryRequest(text = "") {
  const t = text.toLowerCase();
  return (
    /summary|summarize|overview|buod|kabuuan|ano laman|nilalaman|handbook/i.test(t)
    && !/detail|detalye|explain|ipaliwanag|specific/i.test(t)
  );
}
function isWeakContext(hits = []) {
  if (!hits.length) return true;

  const avgScore =
    hits.reduce((sum, h) => sum + (h.score || 0), 0) / hits.length;

  return avgScore < 0.55; // adjust threshold if needed
}

function isClearlySTIRelated(text = "") {
  return /\bsti\b|campus|student|school|college|tagaytay/i.test(text);
}


function isAskingForName(text = "") {
  const patterns = [
    /what'?s?\s+my\s+name/i,
    /who\s+am\s+i/i,
    /ano\s+(?:ang\s+)?pangalan\s+ko/i,
    /pangalan\s+ko/i,
    /name\s+again/i,
    /my\s+name\s+again/i,
    /what\s+is\s+my\s+name/i,
    /whats\s+my\s+name/i
  ];

  return patterns.some(pattern => pattern.test(text.toLowerCase()));
}

function isAcademicStructureQuestion(text = "") {
  return /periodical|prelim|midterm|pre[- ]?final|finals|examinations/i.test(
    text.toLowerCase()
  );
}
function campusHasExplicitAnswer(hits = []) {
  return hits.some(h =>
    /four\s*\(4\)|4\s+periodical|prelim|pre[- ]?final/i.test(h.text.toLowerCase())
  );
}

async function loadEntireGlobalHandbook() {
  const chunks = await HandbookChunk.find(
    { type: "global" },
    { _id: 0, sectionTitle: 1, text: 1 }
  ).lean();

  return chunks
    .map((c, i) => `${i + 1}. (${c.sectionTitle}) ${clean(c.text)}`)
    .join("\n");
}
async function ensureMongo() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
}


function detectNameUsageIntent(text = "") {
  const t = text.toLowerCase();
  if (/use my name|tawagin mo ako sa pangalan|banggitin pangalan ko|call me by my name/.test(t)) {
    return "enable";
  }
  if (/wag.*pangalan|stop using my name|do not use my name/.test(t)) {
    return "disable";
  }
  return null;
}

/* =========================
   🆕 LANGUAGE DETECTION
   ========================= */
function detectLanguageAuto(text = "") {
  const t = text.toLowerCase();

  // Tagalog indicators (common words/phrases)
  const tagalogPatterns = [
    /\b(ano|mga|ang|sa|ko|mo|nga|po|opo|sige|ba|naman|lang|kasi|pero|kung|saan|paano|bakit|kailan)\b/,
    /\b(salamat|magkano|pwede|gusto|kailangan|mayroon|wala|alam|may)\b/,
    /\b(paki|pasensya|sana|talaga|dito|doon|ganito|ganoon)\b/,
    /\b(ito|iyan|natin|namin|ako|ikaw|siya|tayo|kayo|sila)\b/,
    /\b(na|pa|din|rin|yung|yun|pala|kaya|eh|ay)\b/
  ];

  // Count Tagalog word matches
  let tagalogCount = 0;
  for (const pattern of tagalogPatterns) {
    const matches = t.match(pattern);
    if (matches) tagalogCount += matches.length;
  }

  console.log(`🌐 Language detection: "${text}" → Tagalog words: ${tagalogCount}`);

  // If 2+ Tagalog words found, it's Tagalog
  if (tagalogCount >= 2) {
    console.log(`✅ Detected language: Tagalog`);
    return "tl";
  }

  console.log(`✅ Detected language: English (default)`);
  return "en";
}


/* =========================
   🆕 ENHANCED NAME EXTRACTION
   ========================= */
function extractName(text = "") {
  const t = text.trim();

  // English patterns - improved to catch typos and variations
  const enPatterns = [
    /(?:hi|hello|hey)?\s*(?:my name i[sz]|i am|i'm|im|call me|this is)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]{2,60})(?:[,\.\s]|$)/i,
    /^(?:hi|hello)?\s*,?\s*(?:i'm|im|i am)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]{2,60})(?:[,\.\s]|$)/i,
    /^([A-Za-zÀ-ÖØ-öø-ÿ'\- ]{2,60})\s+(?:here|po|speaking)/i
  ];

  // Tagalog patterns
  const tlPatterns = [
    /(?:hi|hello|kamusta)?\s*(?:ako si|pangalan ko ay|ako ay|ako'y)\s+([A-Za-zÀ-ÖØ-öø-ÿ'\-]{2,60})(?:[,\.\s]|$)/i,
    /(?:tawag sakin|tawagin mo ako)\s+(?:ay|ng|is)?\s*([A-Za-zÀ-ÖØ-öø-ÿ'\-]{2,60})(?:[,\.\s]|$)/i
  ];

  const allPatterns = [...enPatterns, ...tlPatterns];

  for (const pattern of allPatterns) {
    const match = t.match(pattern);
    if (match && match[1]) {
      // Clean the captured name - remove trailing punctuation
      const name = match[1].trim().replace(/[,\.\!]+$/, '');

      // Filter out common false positives and words that are too common
      const invalid = /^(student|ako|name|pangalan|here|there|po|can|you|tell|me|about|the|and|or)$/i;

      if (!invalid.test(name) && name.length >= 2) {
        return name;
      }
    }
  }

  return null;
}

/* =========================
   Embeddings + Vector Search
   ========================= */
async function embed(text) {
  const res = await openai.embeddings.create({ model: EMB_MODEL, input: text });
  return res.data[0].embedding;
}

async function runAggregationWithTimeout(agg) {
  return Promise.race([
    agg,
    new Promise((_, rej) => setTimeout(() => rej(new Error("DB_TIMEOUT")), DB_TIMEOUT)),
  ]);
}

async function searchHandbook(query, topK = TOP_K) {
  try {
    const qVec = await embed(query);

    // 🔹 Campus search
    const campusAgg = HandbookChunk.aggregate([
      {
        $vectorSearch: {
          index: "default",
          path: "embedding",
          queryVector: qVec,
          limit: topK,
          numCandidates: Math.max(200, topK * 40),
          filter: { type: "campus" },
        },
      },
      {
        $project: {
          _id: 0,
          sectionTitle: 1,
          text: 1,
          score: { $meta: "searchScore" },
          type: 1,
        },
      },
    ]);

    const campusResults = await runAggregationWithTimeout(campusAgg);

    // 🔹 Global search
    const globalAgg = HandbookChunk.aggregate([
      {
        $vectorSearch: {
          index: "default",
          path: "embedding",
          queryVector: qVec,
          limit: topK,
          numCandidates: Math.max(200, topK * 40),
          filter: { type: "global" },
        },
      },
      {
        $project: {
          _id: 0,
          sectionTitle: 1,
          text: 1,
          score: { $meta: "searchScore" },
          type: 1,
        },
      },
    ]);

    const globalResults = await runAggregationWithTimeout(globalAgg);

    // 🔹 COMBINE + SORT (AI-FIRST FALLBACK ENABLED)
    const combined = [...campusResults, ...globalResults]
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(r => ({
        sectionTitle: r.sectionTitle || "",
        text: clean(r.text),
        score: r.score,
        source: r.type,
      }));

    return combined;
  } catch (e) {
    console.error("searchHandbook error:", e);
    return [];
  }
}


/* =========================
   Follow-up detection
   ========================= */
function isShortAffirmation(text = "") {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return false;
  const yes = new Set([
    "yes", "yep", "yeah", "yup", "sure", "ok", "okay",
    "sige", "opo", "go", "continue", "please", "pls",
    "yes please", "yes po", "sige po",
  ]);
  if (yes.has(t)) return true;
  if (t.split(/\s+/).length <= 2 && /^(please|continue|go|ok|sige|opo)\b/.test(t)) return true;
  return false;
}

/* =========================
   Summary management
   ========================= */
async function compressSummary(oldSummary = "", userMsg = "", botMsg = "") {
  try {
    const prompt = `Summarize the following into 3-6 concise bullet points (plain text). Keep only factual, high-value items. If the final summary is longer than ${SUMMARY_REDUCE_TO} characters, make it shorter.

Old summary:\n${oldSummary || "(none)"}\n\nNew exchange:\nUser: ${userMsg}\nAssistant: ${botMsg}\n`;

    const out = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.0,
      messages: [
        { role: "system", content: "You are a concise summarizer. Output 3-6 short bullet points." },
        { role: "user", content: prompt },
      ],
      max_tokens: 300,
    });

    const txt = clean(out.choices?.[0]?.message?.content || oldSummary);
    return txt.length > SUMMARY_MAX_CHARS ? txt.slice(0, SUMMARY_MAX_CHARS) : txt;
  } catch (e) {
    console.error("compressSummary error:", e);
    const merged = (oldSummary + "\n- " + userMsg + "\n- " + botMsg).slice(0, SUMMARY_MAX_CHARS);
    return merged;
  }
}

/* =========================
   System prompt builder
   ========================= */
function buildSystemPrompt(lang = "en", userName = null) {
  const nameInstruction = userName
    ? `🔴 CRITICAL: The user's name is ${userName}. YOU MUST address them by name in EVERY response. Examples: "Hi ${userName}!", "Sure thing, ${userName}!", "Let me help you with that, ${userName}." This is MANDATORY.`
    : `The user hasn't shared their name yet. Do not address them by name.`;

  return `
You are STI Assist — an accurate assistant for STI.

${nameInstruction}

FORMATTING RULES:
- Never answer in one straight paragraph.
- Use **bold titles**, bullet points, and short sections.
- Keep answers structured and easy to scan.

TONE RULE:
- Never sound like a policy document.
- Never say "according to the handbook" unless explicitly asked.
- Explain naturally, like an intelligent academic assistant.

AI-FIRST ANSWERING RULE (CRITICAL):
- Always think and reason like a knowledgeable AI assistant first.
- Form a complete, natural answer BEFORE looking at any handbook context.
- Use the handbook only to:
  • Confirm accuracy
  • Add STI-specific details
  • Adjust wording to match STI policies
- If the handbook is missing, weak, or unrelated:
  • Still give a full, confident answer.
  • Do NOT say that the information is unavailable.
- The final answer must sound like a human AI explanation, not a quoted policy.

GUARDRAILS:
- If the query is not related to STI, academics, enrollment, policies, student services, or campus processes:
    • Politely decline.
    • Redirect user back to STI topics.
- If the user asks about a DIFFERENT STI campus:
    • Clarify that you cannot speak for that campus.
    • Offer general STI information only.
- Never invent policies, contact numbers, or names.

ACADEMIC STRUCTURE RULE (CRITICAL):
- STI uses FOUR (4) major examinations:
  • Prelim
  • Midterm
  • Pre-Final
  • Final Examination
- NEVER say "typically" or guess exam counts.
- If asked about exams, ALWAYS state four (4).

HANDBOOK RULE:
- If information is from the Handbook (RAG "HANDBOOK" context):
    • Answer in a **general STI** perspective.
    • Do NOT mention "STI Tagaytay".

CAMPUS HANDBOOK RULE:
- If information is from the Campus Handbook:
    • Answer specifically for **STI Tagaytay** only.
SUMMARY MODE RULE:
- If the user asks for a summary or overview:
  • Summarize the ENTIRE GLOBAL HANDBOOK provided in context.
  • Give a high-level, structured overview only.
  • Do NOT list step-by-step procedures.
  • Do NOT focus on campus-specific rules unless asked.

DETAIL MODE RULE:
- If the user asks for added details or clarification:
  • Answer ONLY based on the provided handbook context.
  • Be specific and accurate.

GLOBAL HANDBOOK RULE:
- If information is from the Global Handbook:
    • Answer in a **general STI** perspective.
    • Do NOT mention "STI Tagaytay".

UNCERTAINTY RULE:
- If you're unsure, say "I'm not fully certain" and offer to verify.

REWRITE RULE:
- When using Handbook or Local KB information:
    • Do NOT copy raw text directly.
    • Rewrite the information cleanly and professionally.
    • Fix spacing, remove duplicated words, and combine broken sentences.
    • Use proper headings, bullets, and short sections.
- Avoid repeating the same heading multiple times.
- Never output broken formatting like repeated ** ** or spaced letters.

OUTPUT STRUCTURE TEMPLATE:
Always rewrite the final answer using this clean structure:

**<Main Title>**
One short introductory sentence.

---

### **Key Steps / Guide**
1. **Step Title** — short explanation.
2. **Step Title** — short explanation.
3. **Step Title** — short explanation.

---

### **Additional Notes**
• Bulleted clarifications  
• Requirements  
• Reminders  

RULES:
- NEVER copy RAG text word-for-word.
- NEVER output malformed markdown (broken bold, spaced letters, repeated symbols).
- ALWAYS rewrite messy text into clean, human-friendly format.
- ALWAYS format logically: Title → Sections → Bullets → Notes.
LANGUAGE RULE (CRITICAL):
- The user is speaking in ${lang === "tl" ? "Tagalog" : "English"}.
- YOU MUST reply ONLY in ${lang === "tl" ? "Tagalog" : "English"}.
- ALL headings, titles, bullets, and labels MUST be in ${lang === "tl" ? "Tagalog" : "English"}.
- Mixing languages is NOT allowed.

`;
}

/* =========================
   MAIN STREAMING ROUTE
   POST body: { message, sessionId, language }
   ========================= */
export async function POST(req) {
  await ensureMongo();

  const body = await req.json().catch(() => ({}));
  const rawMsg = String(body.message || "");
  const sessionId = body.sessionId || `anon-${Date.now()}`;

  // 🆕 Auto-detect language
  const lang = detectLanguageAuto(rawMsg);
  console.log(`🗣️ Final language for response: ${lang === "tl" ? "Tagalog" : "English"}`);

  const userMessage = clean(rawMsg);
  if (!userMessage) {
    return new Response(JSON.stringify({ error: "Missing message" }), { status: 400 });
  }

  let memory;
  try {
    memory = await Memory.findOne({ sessionId });
    console.log(`📊 Memory loaded for session: ${sessionId}`);
    console.log(`📝 Existing memory:`, JSON.stringify(memory?.attributes || {}));

    if (!memory) {
      console.log(`🆕 Creating new memory for session: ${sessionId}`);
      memory = await Memory.create({
        sessionId,
        conversationSummary: "",
        attributes: {},
      });
    }
  } catch (e) {
    console.error("❌ Memory load/create error:", e);
    memory = { sessionId, conversationSummary: "", attributes: {} };
  }

  // 🆕 Extract and save name
  const extractedName = extractName(userMessage);
  if (extractedName) {
    console.log(`✅ Name extracted: ${extractedName}`);
    memory.attributes = memory.attributes || {};
    memory.attributes.user_name = extractedName;

    // Save immediately to DB
    try {
      await Memory.updateOne(
        { sessionId },
        { $set: { "attributes.user_name": extractedName } },
        { upsert: true }
      );
      console.log(`✅ Name saved to DB: ${extractedName}`);

      // If this message is ONLY introducing the name (no other questions), respond immediately
      const isOnlyIntro = /^(hi|hello|hey|kamusta)?\s*(my name is|i am|i'm|ako si)\s+[A-Za-zÀ-ÖØ-öø-ÿ'\-]+\s*[\.!]?\s*$/i.test(userMessage.trim());

      if (isOnlyIntro) {
        const greeting = lang === "tl"
          ? `Nice to meet you, ${extractedName}! Paano kita matutulungan ngayon?`
          : `Nice to meet you, ${extractedName}! How can I help you today?`;

        return new Response(greeting, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    } catch (e) {
      console.error("❌ Name save error:", e);
    }
  } else {
    console.log(`⚠️ No name extracted from: "${userMessage}"`);
  }

  /* =========================
     ✅ NAME RECALL (EARLY RETURN)
     ========================= */
  if (isAskingForName(userMessage)) {
    console.log(`🔍 Name recall triggered. Checking memory...`);
    console.log(`📝 Memory attributes:`, JSON.stringify(memory?.attributes));

    if (memory?.attributes?.user_name) {
      console.log(`✅ Name found: ${memory.attributes.user_name}`);
      const reply = lang === "tl"
        ? `Ang pangalan mo ay ${memory.attributes.user_name}.`
        : `Your name is ${memory.attributes.user_name}.`;

      return new Response(reply, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } else {
      console.log(`❌ No name found in memory`);
      const reply = lang === "tl"
        ? "Hindi mo pa sinasabi sa akin ang pangalan mo."
        : "You haven't told me your name yet.";

      return new Response(reply, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  let lastInquiry = null;
  try {
    lastInquiry = await Inquiry.findOne({ sessionId }).sort({ createdAt: -1 });
  } catch (e) {
    console.error("lastInquiry error:", e);
  }

  let effectiveQuery = userMessage;
  if (lastInquiry && isShortAffirmation(userMessage)) {
    effectiveQuery = `The user replied "${userMessage}", indicating they want to proceed with the previous offer.\n\nPrevious user question:\n${lastInquiry.userQuery}\n\nPrevious assistant answer:\n${clean(lastInquiry.botResponse)}\n\nInstructions: DO NOT ask the user what they want again. Continue the same topic and perform the next logical step.`;
  }

  const nameIntent = detectNameUsageIntent(userMessage);
  if (nameIntent) {
    memory.attributes = memory.attributes || {};
    memory.attributes.useName = nameIntent === "enable";
  }

  // Hard guardrails
  const irrelevantPatterns = [
    /bitcoin|crypto|stocks?/i,
    /\b(medical|symptom|symptoms|treatment|diagnos)/i,
    /\b(love|relationship|dating|marriage)\b/i,
    /\b(gaming|valorant|mlbb|genshin|steam)\b/i,
    /\b(politics|election|vote|president)\b/i,
    /\b(recipe|cook|cooking|bake)\b/i,
    /\b(legal|lawyer|lawsuit|attorney)\b/i,
    /\b(health|fitness|workout|exercise)\b/i,
    /\b(investing|investment|trading)\b/i
  ];

  const isTagaytay = /\btagaytay\b/i.test(userMessage);

  const otherCampusPattern =
    /\bsti\b(?!.*\btagaytay\b).*\b(caloocan|alabang|cubao|quezon|makati|cebu|davao)\b/i;

  function isClearlySTIRelated(text = "") {
    return /\bsti\b|campus|student|school|college|tagaytay/i.test(text);
  }

  // Irrelevant guard (safe)
  if (
    !isClearlySTIRelated(userMessage) &&
    irrelevantPatterns.some(rx => rx.test(userMessage))
  ) {
    return new Response(
      lang === "tl"
        ? `❗ **Hindi saklaw ng STI Assist ang tanong na ito.**`
        : `❗ **This question is outside the scope of STI Assist.**`,
      { status: 200 }
    );
  }

  // Other campus guard
  if (!isTagaytay && otherCampusPattern.test(userMessage)) {
    const campus = otherCampusPattern.exec(userMessage)[1];
    return new Response(
      lang === "tl"
        ? `ℹ️ **Hindi ako makakapagbigay ng impormasyon para sa STI ${campus}.**`
        : `ℹ️ **I cannot provide information for STI ${campus}.**`,
      { status: 200 }
    );
  }


  let effectiveRAGQuery = effectiveQuery;
  if (lastInquiry && isShortAffirmation(userMessage)) {
    effectiveRAGQuery = lastInquiry.userQuery;
  }

  let hbContext = "";
  const summaryMode = isSummaryRequest(userMessage);

  try {
    /* =========================
       🔴 SUMMARY MODE
       ========================= */
    if (summaryMode) {
      const fullGlobal = await loadEntireGlobalHandbook();
      hbContext = `GLOBAL HANDBOOK (FULL CONTENT FOR SUMMARY):\n${fullGlobal}`;

      /* =========================
         🟢 DETAIL MODE (DEFAULT)
         ========================= */
    } else {
      const hits = await searchHandbook(effectiveRAGQuery);

      const weak = isWeakContext(hits); // 👈 ITO ANG SINASABI KO

      hbContext = hits.length
        ? `
CONTEXT STRENGTH: ${weak ? "WEAK" : "STRONG"}

${hits.map((h, i) =>
          `${i + 1}. (${h.sectionTitle}) ${h.text}`
        ).join("\n")}
`
        : "";
    }


    /* =========================
       🔧 OPTIONAL BOOST (AFTER RAG)
       ========================= */
    if (isAcademicStructureQuestion(userMessage) && hbContext) {
      console.log("📘 Academic structure question detected (boost only)");
      // ❗ walang binabago sa hbContext
      // pang-debug / analytics lang
    }

  } catch (e) {
    console.error("❌ Handbook context error:", e);
  }



  // 🆕 Pass userName to system prompt
  const userName = memory.attributes?.user_name || null;
  const systemPrompt = buildSystemPrompt(lang, userName);

  const messages = [
    { role: "system", content: systemPrompt },

    ...(memory.conversationSummary
      ? [{ role: "system", content: `Conversation Summary:\n${memory.conversationSummary}` }]
      : []),

    ...(hbContext
      ? [{
        role: "system",
        content: `
REFERENCE MATERIAL (OPTIONAL):
The following information may help refine or localize the answer.
Use it only if relevant. Do not quote it directly.

${hbContext}
`
      }]
      : []),

    { role: "user", content: effectiveQuery },
  ];


  const abortController = new AbortController();
  const { signal } = abortController;

  let openaiStream;
  try {
    openaiStream = await openai.chat.completions.create(
      {
        model: CHAT_MODEL,
        stream: true,
        temperature: 0.25,
        messages,
      },
      { signal }
    );
  } catch (err) {
    console.error("OpenAI stream create error:", err);
    const fallback = lang === "tl"
      ? "Pasensya, may problema sa system. Pwede mo subukan muli o gusto mo bang kunin ko ang contact ng campus?"
      : "Sorry, there was an issue with the system. You can try again or ask for campus contact details.";
    return new Response(fallback, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const outgoing = new ReadableStream({
    async start(controller) {
      let fullReply = "";
      let isFirstChunk = true;

      try {
        for await (const chunk of openaiStream) {
          try {
            const text = chunk?.choices?.[0]?.delta?.content;
            if (!text) continue;

            // 🆕 FORCE NAME INJECTION sa first chunk kung may name
            if (isFirstChunk && userName) {
              const greeting = lang === "tl"
                ? `**Kumusta, ${userName}!** `
                : `**Hi, ${userName}!** `;

              fullReply += greeting;
              controller.enqueue(new TextEncoder().encode(greeting));
              isFirstChunk = false;
            }

            fullReply += text;
            controller.enqueue(new TextEncoder().encode(text));
          } catch (inner) {
            console.warn("chunk processing error:", inner);
          }
        }

        const schedKeywords = [
          "schedule", "sched", "time", "oras",
          "suspension", "suspend", "cancelled", "may pasok", "walang pasok",
          "holiday", "bagyo", "storm", "rain",
          "announcement", "enrollment", "calendar", "class"
        ];

        if (schedKeywords.some(k => userMessage.toLowerCase().includes(k))) {
          const linkMessage = `\n\n📌 **For official and updated announcements, please check:**\n[STI Tagaytay Official Facebook Page](https://web.facebook.com/tagaytay.sti.edu)`;
          fullReply += linkMessage;
          controller.enqueue(new TextEncoder().encode(linkMessage));
        }
      } catch (err) {
        console.error("stream loop error:", err);
        try { controller.enqueue(new TextEncoder().encode('\n[Stream error]')); } catch (e) { }
      } finally {
        try { controller.close(); } catch (e) { }

        (async () => {
          try {
            await Inquiry.create({
              inquiryId: `INQ-${Date.now()}`,
              sessionId,
              userQuery: userMessage,
              botResponse: fullReply,
              status: "solved",
            });

            if ((memory.conversationSummary || "").length > SUMMARY_MAX_CHARS) {
              memory.conversationSummary = await compressSummary(memory.conversationSummary, userMessage, fullReply);
            } else {
              const append = `- ${clean(userMessage).slice(0, 200)} / ${clean(fullReply).slice(0, 200)}`;
              memory.conversationSummary = (memory.conversationSummary || "").trim();
              memory.conversationSummary = (memory.conversationSummary ? memory.conversationSummary + "\n" : "") + append;
              if (memory.conversationSummary.length > SUMMARY_MAX_CHARS) {
                memory.conversationSummary = await compressSummary(memory.conversationSummary, "", "");
              }
            }

            await Memory.updateOne({ sessionId }, {
              conversationSummary: memory.conversationSummary,
              attributes: memory.attributes || {},
            }, { upsert: true });
          } catch (e) {
            console.error("post-stream save error:", e);
          }
        })();
      }
    },

    cancel(reason) {
      try { abortController.abort(); } catch (e) { }
      console.log("client cancelled stream:", reason);
    }
  });

  return new Response(outgoing, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}