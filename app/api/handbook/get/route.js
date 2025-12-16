// app/api/handbook/get/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@lib/mongodb";
import Handbook from "@models/Handbook";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // global | campus

    if (!type) {
      return NextResponse.json({ exists: false });
    }

    const handbook = await Handbook.findOne({ type });

    if (!handbook) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      displayName: handbook.displayName,
      uploadedAt: handbook.uploadedAt,
      chunkCount: handbook.chunkCount,
    });
  } catch (err) {
    return NextResponse.json(
      { exists: false, error: err.message },
      { status: 500 }
    );
  }
}
