import { NextResponse } from "next/server";
import { connectDB } from "../../lib/mongodb"; 
import Feedback from "../../models/Feedback";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const mergedComment = body.comment || body.reason || "";

    const count = await Feedback.countDocuments();
    const feedbackId = `FDBID-${String(count + 1).padStart(4, "0")}`;

    const feedback = new Feedback({
      feedbackId,
      rating: body.rating,
      comment: mergedComment,

      question: body.question || "",
      aiAnswer: body.aiAnswer || "",

      resolved: false,
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),

      sessionId: body.sessionId,
      source: body.source || "chatbot",
    });

    await feedback.save();

    return NextResponse.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    console.error("Error saving feedback:", error);
    return NextResponse.json(
      { message: "Error saving feedback" },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    await connectDB();

    const feedbackList = await Feedback
      .find({})
      .sort({ timestamp: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: feedbackList,
    });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
