"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ConfirmClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) return;

    fetch("/api/admin/pairing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then(() => {
      setTimeout(() => {
        router.replace("/admin/dashboard");
      }, 1200);
    });
  }, [token, router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center 
      bg-[#081a2f] text-white">
      <div className="bg-white/10 backdrop-blur-xl p-6 rounded-xl 
        border border-white/20 shadow-lg">
        <p className="text-lg font-medium">
          ✅ Device authorized
        </p>
        <p className="text-sm text-white/70 mt-1">
          You may now return to your computer.
        </p>
      </div>
    </div>
  );
}
