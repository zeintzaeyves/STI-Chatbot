"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    fetch("/api/admin/pairing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
      });
  }, [token]);

  return (
    <main
      className="h-screen w-full bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: "url('/hero4.png')" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Glass Card */}
      <div className="relative z-10 w-[90%] max-w-sm rounded-2xl 
        bg-white/10 backdrop-blur-xl border border-white/20 
        shadow-2xl p-8 text-center text-white">

        {status === "loading" && (
          <>
            <div className="w-10 h-10 mx-auto mb-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            <h1 className="text-lg font-semibold">
              Authorizing device…
            </h1>
            <p className="text-sm text-white/70 mt-2">
              Please wait while we verify this device.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-14 h-14 mx-auto text-green-400 mb-4" />
            <h1 className="text-xl font-semibold">
              Device Authorized
            </h1>
            <p className="text-sm text-white/70 mt-2">
              You may now return to your computer.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-lg font-semibold text-red-400">
              Authorization Failed
            </h1>
            <p className="text-sm text-white/70 mt-2">
              This QR code may be expired.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
