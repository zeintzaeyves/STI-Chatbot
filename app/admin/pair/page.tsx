"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";

export default function PairPage() {
  const [qr, setQr] = useState("");
  const [token, setToken] = useState("");
  const router = useRouter();

  useEffect(() => {
    const generateQR = async () => {
      const res = await fetch("/api/admin/pairing/create", { method: "POST" });
      const { token } = await res.json();
      setToken(token);

      const url = `${window.location.origin}/admin/confirm?token=${token}`;
      setQr(await QRCode.toDataURL(url));
    };

    generateQR();
  }, []);

  // polling
  useEffect(() => {
    if (!token) return;
    const i = setInterval(async () => {
      const r = await fetch(`/api/admin/pairing/status?token=${token}`);
      if (r.ok) router.replace("/admin/dashboard");
    }, 2000);
    return () => clearInterval(i);
  }, [token, router]);

  return (
    <main
      className="h-screen w-full bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/hero4.png')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#071426]/90 via-[#0d203b]/90 to-[#112e52]/90" />

      <div className="relative z-10 w-[360px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center shadow-2xl">
        <h1 className="text-white text-xl font-semibold mb-2">
          Pair This Device
        </h1>

        <p className="text-white/70 text-sm mb-5">
          Scan this QR code using your phone to authorize access.
        </p>

        {qr ? (
          <img
            src={qr}
            className="mx-auto bg-white p-3 rounded-xl"
          />
        ) : (
          <p className="text-white">Generating QR…</p>
        )}

        <p className="text-xs text-white/50 mt-4">
          This code expires automatically
        </p>
      </div>
    </main>
  );
}
