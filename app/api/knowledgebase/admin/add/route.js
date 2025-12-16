import { connectDB as dbConnect } from "@lib/mongodb";
import KnowledgeBase from "@models/KnowledgeBase";
import { normalizeQuestion } from "../../../../utils/normalizeQuestion";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const { id, category, keywords, question, answer } = body;

    if (!question || !answer) {
      return Response.json(
        { success: false, message: "Question and answer are required." },
        { status: 400 }
      );
    }

    const entry = await KnowledgeBase.create({
      id: id || "kb_" + Date.now(),
      category: category || "general",
      keywords: keywords || [],
      question,
      normalizedQuestion: normalizeQuestion(question),
      answer
    });

    return Response.json({ success: true, kb: entry });

  } catch (err) {
    console.error("KB ADMIN ADD ERROR:", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
