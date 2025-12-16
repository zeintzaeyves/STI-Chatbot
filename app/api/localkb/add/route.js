import dbConnect from "../../../lib/mongodb";
import LocalKBChunk from "../../../models/LocalKBChunk";
import Inquiry from "../../../models/Inquiry";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    await dbConnect();

    const { inquiryId, question, answer } = await req.json();

    if (!question || !answer) {
      return Response.json(
        { success: false, message: "Missing question or answer" },
        { status: 400 }
      );
    }

    // 1. Generate embeddings
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: answer,
    });

    // 2. Create new LocalKBChunk
    const kb = await LocalKBChunk.create({
      kbId: `KB-${Date.now()}`, // auto-generate id
      question,
      answer,
      embedding: emb.data[0].embedding,
    });

    // 3. Update inquiry with solved state & KB reference
    if (inquiryId) {
      await Inquiry.findOneAndUpdate(
        { inquiryId },
        {
          status: "solved",
          botResponse: answer,
          knowledgeBaseId: kb._id,
        }
      );
    }

    return Response.json({ success: true, kb });

  } catch (err) {
    console.error("LocalKB ADD ERROR:", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}