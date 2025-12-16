"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = (path: string) => {
    setLoading(true);
    setTimeout(() => router.push(path), 1000);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-[#0b163a] via-[#132b61] to-[#0b163a] text-white">
      {/* 🔵 Loading Screen */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#071426] via-[#0d203b] to-[#112e52] z-50"
          >
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 0 0px rgba(255,215,0,0)",
                  "0 0 40px rgba(255,215,0,0.4)",
                  "0 0 0px rgba(255,215,0,0)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="bg-white rounded-full p-6 mb-8 shadow-lg"
            >
              <Image src="/logo.png" alt="STI Logo" width={120} height={120} />
            </motion.div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "8rem" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="h-1.5 bg-gradient-to-r from-yellow-300 via-white to-blue-400 rounded-full shadow-md"
            />

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-sm font-medium text-gray-200 mt-4 tracking-wide"
            >
              Initializing system...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌆 Main Content */}
      {!loading && (
        <motion.main
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative flex flex-col items-center justify-center text-center h-full px-8"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Image src="/logo.png" alt="STI Logo" width={100} height={100} />
          </motion.div>

          {/* Title */}
          <h1 className="mt-8 text-4xl md:text-5xl font-bold leading-tight">
            Welcome to{" "}
            <span className="text-yellow-400">STI Tagaytay’s</span>
            <br />
            <span className="text-blue-300">AI Chatbot System</span>
          </h1>

          {/* Subtitle */}
          <p className="text-gray-300 max-w-md mt-4 text-lg leading-relaxed">
            Your instant guide to campus information, services, and support.
            Ask us anything — 24/7.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick("/users/chatbot")}
              className="px-6 py-3 bg-white text-[#1e3a8a] font-semibold rounded-md shadow-md hover:bg-yellow-300 transition"
            >
              Start Chat
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick("/admin")}
              className="px-6 py-3 border border-white/40 text-white font-semibold rounded-md shadow-md hover:bg-[#162c6a]/60 transition"
            >
              Admin Login
            </motion.button>
          </div>
        </motion.main>
      )}
    </div>
  );
}
