import { connectDB as dbConnect } from "@lib/mongodb";
import KnowledgeBase from "@models/KnowledgeBase";
import { normalizeQuestion } from "../../../../utils/normalizeQuestion";

export async function PATCH(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const { kbId, id, category, keywords, question, answer } = body;

    if (!kbId) {
      return Response.json(
        { success: false, message: "kbId is required." },
        { status: 400 }
      );
    }

    const updateData = {};

    if (id) updateData.id = id;
    if (category) updateData.category = category;
    if (keywords) updateData.keywords = keywords;

    if (question) {
      updateData.question = question;
      updateData.normalizedQuestion = normalizeQuestion(question);
    }

    if (answer) updateData.answer = answer;

    const updated = await KnowledgeBase.findByIdAndUpdate(kbId, updateData, {
      new: true,
    });

    // Sync answer to all inquiries linked to this KB
    if (answer) {
      await Inquiry.updateMany(
        { knowledgeBaseId: kbId },
        { botResponse: answer, status: "solved" }
      );
    }

    return Response.json({ success: true, kb: updated });

  } catch (err) {
    console.error("KB ADMIN UPDATE ERROR:", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}