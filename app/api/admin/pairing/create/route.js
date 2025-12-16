import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import PairingToken from "@models/PairingToken.js";

export async function POST() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const token = crypto.randomUUID();

    await PairingToken.create({
      token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      confirmed: false,
    });

    return NextResponse.json({ token });
  } catch (err) {
    console.error("PAIRING CREATE ERROR:", err);
    return NextResponse.json(
      { error: "Failed to create pairing token" },
      { status: 500 }
    );
  }
}
