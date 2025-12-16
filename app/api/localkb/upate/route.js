import { connectDB } from "@lib/mongodb";
import LocalKBChunk from "@models/LocalKBChunk";
import Inquiry from "@models/Inquiry";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function PATCH(req) {
  try {
    await dbConnect();
    const { kbId, updatedAnswer, updatedQuestion } = await req.json();

    if (!kbId || !updatedAnswer) {
      return Response.json(
        { success: false, message: "kbId and updatedAnswer are required" },
        { status: 400 }
      );
    }

    // 1. Find old KB
    const oldKB = await LocalKBChunk.findById(kbId);
    if (!oldKB) {
      return Response.json(
        { success: false, message: "KB entry not found" },
        { status: 404 }
      );
    }

    // 2. Delete old KB entry
    await LocalKBChunk.deleteOne({ _id: kbId });

    // 3. Generate new embedding
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: updatedAnswer,
    });

    // 4. Create new KB entry
    const newKB = await LocalKBChunk.create({
      kbId: oldKB.kbId, // keep same KB ID string
      question: updatedQuestion || oldKB.question,
      answer: updatedAnswer,
      embedding: emb.data[0].embedding,
    });

    // 5. Update Inquiry to use new KB reference
    await Inquiry.findOneAndUpdate(
      { knowledgeBaseId: kbId },
      {
        botResponse: updatedAnswer,
        status: "solved",
        knowledgeBaseId: newKB._id,
      }
    );

    return Response.json({ success: true, kb: newKB });

  } catch (err) {
    console.error("LocalKB UPDATE ERROR:", err);
    return Response.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}