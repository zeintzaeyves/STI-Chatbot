// app/api/indexer/route.js
import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Handbook from "../../../models/Handbook";
import HandbookChunk from "../../../models/HandbookChunk";
import { chunkText } from "../../../lib/text";
import { getEmbedding } from "../../../lib/embeddings";

export async function POST(req) {
  try {
    await connectDB();

    const handbook = await Handbook.findOne().sort({ uploadedAt: -1 });
    if (!handbook) {
      return NextResponse.json({ ok: false, error: "No handbook found." });
    }

    // Delete old chunks for this handbook
    await HandbookChunk.deleteMany({ handbookId: handbook._id });

    // Chunk the text
    const chunks = chunkText(handbook.content, { chunkSize: 1200, chunkOverlap: 200 });

    // Compute embeddings if provider available
    const useEmbeddings = !!process.env.OPENAI_API_KEY;
    const saved = [];
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      let embedding = undefined;
      if (useEmbeddings) {
        try {
          embedding = await getEmbedding(c.text);
        } catch (err) {
          console.error("Embedding error for chunk", i, err);
          embedding = undefined;
        }
      }

      const doc = await HandbookChunk.create({
        handbookId: handbook._id,
        chunkIndex: i,
        text: c.text,
        length: c.length,
        embedding,
      });
      saved.push(doc);
    }

    return NextResponse.json({
      ok: true,
      pages: Math.ceil(handbook.content.length / 2000),
      chunks: saved.length,
      embeddings: useEmbeddings,
    });
  } catch (err) {
    console.error("Indexer error:", err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
