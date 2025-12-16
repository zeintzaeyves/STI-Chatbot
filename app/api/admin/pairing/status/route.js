import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import PairingToken from "@models//PairingToken";
import AuthorizedDevice from "@models/AuthorizedDevice";

export async function GET(req) {
  await mongoose.connect(process.env.MONGODB_URI);

  const token = req.nextUrl.searchParams.get("token");
  const pairing = await PairingToken.findOne({ token });

  if (!pairing) {
    return NextResponse.json({ confirmed: false });
  }

  // 🔑 CONFIRMED BY PHONE → AUTHORIZE PC
  if (pairing.confirmed) {
    const deviceToken = crypto.randomUUID();

    await AuthorizedDevice.create({
      deviceToken,
      userAgent: req.headers.get("user-agent"),
      lastUsed: new Date(),
    });

    pairing.confirmed = false; // prevent reuse
    await pairing.save();

    const res = NextResponse.json({ confirmed: true });

    res.cookies.set("admin_device", deviceToken, {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return res;
  }

  return NextResponse.json({ confirmed: false });
}
