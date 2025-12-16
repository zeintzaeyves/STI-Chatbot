import { connectDB as dbConnect } from "@lib/mongodb";
import KnowledgeBase from "@models/KnowledgeBase";
import { normalizeQuestion } from "../../../../utils/normalizeQuestion";

export async function DELETE(req) {
  try {
    await dbConnect();
    const { kbId } = await req.json();

    if (!kbId) {
      return Response.json(
        { success: false, message: "kbId is required." },
        { status: 400 }
      );
    }

    // Delete KB entry
    await KnowledgeBase.findByIdAndDelete(kbId);

    // Remove KB links from inquiries
    await Inquiry.updateMany(
      { knowledgeBaseId: kbId },
      {
        knowledgeBaseId: null,
        botResponse: "",
        status: "unresolved",
      }
    );

    return Response.json({ success: true });

  } catch (err) {
    console.error("KB ADMIN DELETE ERROR:", err);
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}