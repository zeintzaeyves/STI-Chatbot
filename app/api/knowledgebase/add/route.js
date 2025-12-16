export async function POST(req) {
  try {
    await dbConnect();
    const { inquiryId, question, answer } = await req.json();

    if (!question || !answer || !inquiryId) {
      return Response.json({ success: false, message: "Missing fields" }, { status: 400 });
    }

    const normalized = normalizeQuestion(question);

    const kb = await KnowledgeBase.create({
      id: "kb_" + Date.now(), // auto ID
      category: "general",
      keywords: [],
      question,
      normalizedQuestion: normalized,
      answer,
      inquiryId,
    });

    await Inquiry.findOneAndUpdate(
      { inquiryId },
      { knowledgeBaseId: kb._id, status: "solved", botResponse: answer }
    );

    return Response.json({ success: true, kb });

  } catch (err) {
    console.error("KB ADD Error:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
