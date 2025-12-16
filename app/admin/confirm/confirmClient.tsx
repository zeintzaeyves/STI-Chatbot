"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ConfirmClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    fetch("/api/admin/pairing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(() => {
      router.replace("/admin/dashboard");
    });
  }, [searchParams, router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[url('/hero4.png')] bg-cover bg-center">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center shadow-2xl">
        <h1 className="text-white text-xl font-semibold">
          Device Authorized
        </h1>
        <p className="text-white/70 text-sm mt-2">
          You may now return to your computer.
        </p>
      </div>
    </div>
  );
}
