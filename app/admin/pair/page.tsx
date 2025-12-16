"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";

export default function PairPage() {
  const [qr, setQr] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");

  const router = useRouter();

  // 1️⃣ Generate QR
  useEffect(() => {
    const generateQR = async () => {
      try {
        const res = await fetch("/api/admin/pairing/create", {
          method: "POST",
        });

        if (!res.ok) {
          throw new Error("Failed to create pairing token");
        }

        const { token } = await res.json();
        setToken(token);

        const url = `${window.location.origin}/admin/confirm?token=${token}`;
        const qrData = await QRCode.toDataURL(url);

        setQr(qrData);
      } catch (err) {
        setError("Unable to generate QR code");
      }
    };

    generateQR();
  }, []);

  // 2️⃣ Poll for confirmation (PC SIDE)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/admin/pairing/status?token=${token}`
        );

        const data = await res.json();

        if (data.confirmed) {
          clearInterval(interval);
          router.replace("/admin/dashboard");
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2000); // every 2 seconds

    return () => clearInterval(interval);
  }, [token, router]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold text-white">
        Pair This Device
      </h1>

      <p className="text-white/70 text-sm text-center max-w-xs">
        Scan this QR code using your phone to authorize this device.
      </p>

      {qr ? (
        <img
          src={qr}
          alt="Pairing QR"
          className="w-56 h-56 bg-white p-2 rounded-lg"
        />
      ) : (
        <p className="text-white">Generating QR…</p>
      )}
    </div>
  );
}
