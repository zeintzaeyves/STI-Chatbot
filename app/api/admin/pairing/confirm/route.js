import { NextResponse } from "next/server";
import mongoose from "mongoose";
import PairingToken from "@models/PairingToken";

export async function POST(req) {
  await mongoose.connect(process.env.MONGODB_URI);

  const { token } = await req.json();

  const pairing = await PairingToken.findOne({ token });

  if (!pairing || pairing.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 403 }
    );
  }

  pairing.confirmed = true;
  await pairing.save();

  return NextResponse.json({ success: true });
}
