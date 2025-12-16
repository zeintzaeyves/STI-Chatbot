export async function PATCH(req) {
  try {
    await dbConnect();
    const { kbId, updatedAnswer, updatedQuestion, updatedKeywords, updatedCategory } = await req.json();

    if (!kbId) {
      return Response.json({ success: false, message: "Missing kbId" }, { status: 400 });
    }

    const updateData = {};

    if (updatedAnswer) updateData.answer = updatedAnswer;
    if (updatedQuestion) {
      updateData.question = updatedQuestion;
      updateData.normalizedQuestion = normalizeQuestion(updatedQuestion);
    }
    if (updatedKeywords) updateData.keywords = updatedKeywords;
    if (updatedCategory) updateData.category = updatedCategory;

    const kb = await KnowledgeBase.findByIdAndUpdate(kbId, updateData, { new: true });

    if (!kb) {
      return Response.json({ success: false, message: "KB entry not found" }, { status: 404 });
    }

    // sync inquiry answer if linked
    if (updatedAnswer) {
      await Inquiry.findOneAndUpdate(
        { knowledgeBaseId: kbId },
        { botResponse: updatedAnswer, status: "solved" }
      );
    }

    return Response.json({ success: true, kb });

  } catch (err) {
    console.error("KB UPDATE Error:", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}
