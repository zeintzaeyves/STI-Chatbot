import { NextResponse } from "next/server";

export async function POST(req) {
  const { email } = await req.json();

  /* ============================
     DEV BYPASS (LOCALHOST ONLY)
  ============================ */
  if (process.env.DEV_ADMIN_BYPASS === "true") {
    const res = NextResponse.json({
      success: true,
      devBypass: true,
      email: email || "dev@localhost",
    });

    // allow cookie on localhost
    res.cookies.set("ms_session", email || "dev@localhost", {
      httpOnly: true,
      secure: false, // 👈 IMPORTANT for localhost
      path: "/",
      maxAge: 60 * 10,
    });

    return res;
  }

  /* ============================
     SIMULATED MS LOGIN ENABLED?
  ============================ */
  if (process.env.SIMULATED_MS_LOGIN !== "true") {
    return NextResponse.json(
      { error: "Simulated MS login disabled" },
      { status: 403 }
    );
  }

  /* ============================
     EMAIL VALIDATION
  ============================ */
  const normalizedEmail = email?.trim().toLowerCase();
  const adminEmail = process.env.ADMIN_MS_EMAIL?.trim().toLowerCase();

  if (!normalizedEmail || normalizedEmail !== adminEmail) {
    return NextResponse.json(
      { error: "Unauthorized Microsoft account" },
      { status: 401 }
    );
  }

  /* ============================
     SUCCESS
  ============================ */
  const res = NextResponse.json({ success: true });

  res.cookies.set("ms_session", normalizedEmail, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // 👈 prod safe
    path: "/",
    maxAge: 60 * 10,
  });

  return res;
}
