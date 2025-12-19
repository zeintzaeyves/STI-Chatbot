// app/api/indexer/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@lib/mongodb";
import Handbook from "@models/Handbook";
import HandbookChunk from "@models/HandbookChunk";
import { getEmbedding } from "@lib/embedText";

/* =========================
   SIMPLE TEXT CHUNKER
   ========================= */
function chunkText(text, chunkSize = 1200, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();

    if (chunk.length > 100) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

/* =========================
   INDEXER ROUTE
   ========================= */
export async function POST() {
  try {
    await connectDB();

    // Get latest uploaded handbook
    const handbook = await Handbook.findOne().sort({ uploadedAt: -1 });
    if (!handbook || !handbook.content) {
      return NextResponse.json({
        ok: false,
        error: "No handbook content found.",
      });
    }

    // 🔥 DELETE OLD CHUNKS FOR THIS HANDBOOK
    await HandbookChunk.deleteMany({ handbookId: handbook._id });

    // 🔥 PURE TEXT CHUNKING
    const chunks = chunkText(handbook.content);

    const useEmbeddings = !!process.env.OPENAI_API_KEY;
    let savedCount = 0;

    for (const text of chunks) {
      let embedding = undefined;

      if (useEmbeddings) {
        embedding = await getEmbedding(text);
      }

      await HandbookChunk.create({
        handbookId: handbook._id,
        source: "campus", // or "global" depending on upload
        text,
        embedding,
      });

      savedCount++;
    }

    return NextResponse.json({
      ok: true,
      handbook: handbook.displayName,
      chunksCreated: savedCount,
      embeddingsUsed: useEmbeddings,
    });
  } catch (err) {
    console.error("Indexer error:", err);
    return NextResponse.json({
      ok: false,
      error: err.message,
    });
  }
}
