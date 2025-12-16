import { NextResponse } from "next/server";
import { connectDB } from "@lib/mongodb";
import Inquiry from "@models/nquiry";

// Incremental ID: INQ-0001, INQ-0002, ...
async function generateInquiryId() {
  const last = await Inquiry.findOne().sort({ createdAt: -1 }).lean();

  if (!last || !last.inquiryId) return "INQ-0001";

  const cleaned = last.inquiryId.replace("INQ-", "");
  const lastNumber = parseInt(cleaned, 10);

  const next = isNaN(lastNumber) ? 1 : lastNumber + 1;

  return `INQ-${String(next).padStart(4, "0")}`;
}

// GET: list all inquiries
export async function GET() {
  try {
    await connectDB();
    const data = await Inquiry.find().sort({ createdAt: -1 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed GET", details: err.message },
      { status: 500 }
    );
  }
}

// POST: Manually add inquiry (admin or automation)
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { userQuery, botResponse, source } = body;

    if (!userQuery?.trim()) {
      return NextResponse.json(
        { error: "Missing userQuery" },
        { status: 400 }
      );
    }

    const inquiryId = await generateInquiryId();

    const status =
      source === "knowledgeBase" ? "solved" : "unresolved";

    const saved = await Inquiry.create({
      inquiryId,
      userQuery,
      botResponse: botResponse || "",
      status,
      knowledgeBaseId: null,
    });

    return NextResponse.json({
      success: true,
      message: "Inquiry saved",
      inquiryId: saved.inquiryId,
      status: saved.status,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed POST", details: err.message },
      { status: 500 }
    );
  }
}
