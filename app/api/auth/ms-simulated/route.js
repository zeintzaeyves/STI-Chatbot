import { NextResponse } from "next/server";

export async function POST(req) {
  const { email } = await req.json();

  // safety check (for thesis mode only)
  if (process.env.SIMULATED_MS_LOGIN !== "true") {
    return NextResponse.json(
      { error: "Simulated MS login disabled" },
      { status: 403 }
    );
  }

  // allow only the admin MS email
const normalizedEmail = email.trim().toLowerCase();
const adminEmail = process.env.ADMIN_MS_EMAIL?.trim().toLowerCase();

if (normalizedEmail !== adminEmail) {
  return NextResponse.json(
    { error: "Unauthorized Microsoft account" },
    { status: 401 }
  );
}


  const res = NextResponse.json({ success: true });

  // simulate Microsoft session
  res.cookies.set("ms_session", email, {
    httpOnly: true,
    secure: true,
    path: "/",
    maxAge: 60 * 10, // 10 minutes (enough to pair QR)
  });

  return res;
}
