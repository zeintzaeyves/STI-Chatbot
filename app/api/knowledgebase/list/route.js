import { connectDB as dbConnect } from "../../../lib/mongodb";
import KnowledgeBase from "../../../models/KnowledgeBase";

export async function GET() {
  try {
    await dbConnect();

    const kb = await KnowledgeBase.find().sort({ createdAt: -1 });

    return new Response(JSON.stringify({ success: true, kb }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("KB LIST ERROR:", err);
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
