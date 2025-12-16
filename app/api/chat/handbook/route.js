// app/api/chat/handbook/route.js
import { NextResponse } from "next/server";
import { connectDB } from "../../../../lib/mongodb";
import Handbook from "../../../../models/Handbook";
import HandbookChunk from "../../../../models/HandbookChunk";
import Fuse from "fuse.js";

export async function POST(req) {
  try {
    await connectDB();
    const { question } = await req.json();
    if (!question) return NextResponse.json({ success: false, error: "Question required" });

    const handbook = await Handbook.findOne().sort({ uploadedAt: -1 });
    if (!handbook) return NextResponse.json({ success: false, error: "No handbook uploaded" });

    // Fetch chunks
    const chunks = await HandbookChunk.find({ handbookId: handbook._id }).lean();
    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ success: false, error: "No chunks indexed" });
    }

    // Fuse.js search
    const fuse = new Fuse(chunks, {
      keys: ["text"],
      includeScore: true,
      threshold: 0.4,
    });

    const results = fuse.search(question).slice(0, 6); // top 6
    if (!results || results.length === 0) {
      return NextResponse.json({ success: true, answer: "I cannot find this in the handbook.", sourceChunks: [] });
    }

    // Build context (concatenate selected chunks)
    const selected = results.map(r => ({ idx: r.item.chunkIndex, text: r.item.text, score: r.score }));
    const contextText = selected.map(s => `--- CHUNK ${s.idx} ---\n${s.text}`).join("\n\n");

    // Build prompt strictly instructing the model to use only context
    const prompt = `
You are an assistant whose sole source of truth is the handbook CONTENT below.
RULES:
- Answer only using the provided handbook text.
- If the answer cannot be found in the handbook, respond exactly with: "I cannot find this in the handbook."
- Do NOT add any extra information or assumptions.
- If you quote something, indicate which CHUNK index you used.

CONTEXT:
${contextText}

QUESTION:
${question}
`;

    // Call Gemini 1.5 Flash (REST inline usage)
    const apiKey = process.env.GOOGLE_API_KEY;
    const payload = {
      // send as a simple text content prompt (no file uploads)
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt }
          ]
        }
      ]
    };

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const ai = await res.json();

    const answer = ai?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || "I cannot find this in the handbook.";
    return NextResponse.json({
      success: true,
      answer,
      sourceChunks: selected.map(s => ({ idx: s.idx, excerpt: s.text.slice(0, 200) })),
      rawAI: ai, // optional for debugging, remove in production
    });

  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}
