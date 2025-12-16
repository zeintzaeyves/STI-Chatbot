import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Handbook from "@models/Handbook";
import HandbookChunk from "@models/HandbookChunk";
import HandbookGlobalContext from "@models/HandbookGlobalContext";

export async function DELETE(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "campus" | "global"

    if (!type) {
      return NextResponse.json(
        { success: false, error: "Missing handbook type" },
        { status: 400 }
      );
    }

    // 1️⃣ Find handbook(s) of this type
    const handbooks = await Handbook.find({ type }).select("_id");

    const handbookIds = handbooks.map((h) => h._id);

    // 2️⃣ Delete handbook documents (ALL, not just one)
    const handbookResult = await Handbook.deleteMany({ type });

    // 3️⃣ Delete all chunks of this type
    const chunkResult = await HandbookChunk.deleteMany({ type });

    // 4️⃣ Delete global context summaries linked to these handbooks
    const contextResult = await HandbookGlobalContext.deleteMany({
      handbookId: { $in: handbookIds },
    });

    return NextResponse.json({
      success: true,
      deleted: {
        handbooks: handbookResult.deletedCount,
        chunks: chunkResult.deletedCount,
        contexts: contextResult.deletedCount,
      },
    });
  } catch (err) {
    console.error("DELETE HANDBOOK ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
