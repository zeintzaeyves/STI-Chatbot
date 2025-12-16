"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ConfirmPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const confirm = async () => {
      const res = await fetch("/api/admin/pairing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    };

    confirm();
  }, [token]);

  return (
    <div className="h-screen flex items-center justify-center bg-slate-900 text-white px-6">
      {status === "loading" && (
        <p className="text-lg animate-pulse">
          Authorizing device…
        </p>
      )}

      {status === "success" && (
        <div className="text-center space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-lg font-semibold">
            Device Authorized
          </p>
          <p className="text-sm text-white/70">
            You may now close this page.
            <br />
            The admin dashboard is opening on the computer.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center text-red-400">
          <p className="text-lg font-semibold">
            Authorization failed
          </p>
          <p className="text-sm">
            This QR code may be expired.
          </p>
        </div>
      )}
    </div>
  );
}
