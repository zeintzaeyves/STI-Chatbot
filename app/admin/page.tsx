"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // fake page load
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();

    setError(false);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/auth/ms-simulated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setError(true);
        setAuthLoading(false);
        return;
      }

      setSuccess(true);
      setAuthLoading(false);

      // redirect to QR pairing
      setTimeout(() => {
        router.push("/admin/pair");
      }, 800);

    } catch (err) {
      setError(true);
      setAuthLoading(false);
    }
  };

  return (
    <main className="relative h-screen w-full bg-[url('/bgtagaytay.png')] bg-cover bg-center flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#071426] via-[#0d203b] to-[#112e52] opacity-90"></div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex flex-col items-center justify-center 
              bg-gradient-to-br from-[#071426] via-[#0d203b] to-[#112e52] text-white z-50"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="mb-6 bg-white rounded-full p-6 shadow-lg shadow-blue-900/40"
            >
              <Image src="/logo.png" alt="STI Logo" width={120} height={120} />
            </motion.div>

            <motion.p className="text-sm tracking-wide text-gray-200">
              Initializing system...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`relative z-10 w-[360px] bg-white/5 backdrop-blur-lg border border-white/10 
            rounded-2xl shadow-2xl p-8 flex flex-col items-center ${
              error ? "border-red-500/40" : ""
            }`}
        >
          <div className="mb-5 flex items-center gap-2">
            <Image src="/logo.png" alt="STI Logo" width={60} height={60} />
            <h1 className="text-white font-semibold text-lg tracking-wide">
              STI Tagaytay
            </h1>
          </div>

          <h2 className="text-white text-2xl font-semibold mb-6">
            Admin Login
          </h2>

          <form onSubmit={handleLogin} className="w-full">
            <input
              type="email"
              placeholder="Microsoft Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mb-3 rounded-lg border border-white/20 bg-white/10 
                text-white placeholder-white/60 focus:outline-none focus:ring-2 
                focus:ring-yellow-400"
            />

            {error && (
              <p className="text-red-400 text-sm mb-3">
                Unauthorized Microsoft account
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading || success}
              className={`w-full py-2 rounded-lg flex items-center justify-center ${
                success
                  ? "bg-green-500 text-white"
                  : "bg-yellow-400 text-black hover:bg-yellow-300"
              }`}
            >
              {authLoading ? (
                <motion.div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : success ? (
                <Check className="w-5 h-5" />
              ) : (
                "Sign in with Microsoft"
              )}
            </button>
          </form>

          <p className="text-white/50 text-xs mt-6">
            © {new Date().getFullYear()} STI College Tagaytay
          </p>
        </motion.div>
      )}
    </main>
  );
}
