"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export default function AboutPage() {
  const members = [
    {
      name: "Nher Angelo Raquel Bawar",
      fb: "https://www.linkedin.com/in/nher-angelo-bawar-9a2b8038a/?originalSubdomain=ph",
    },
    {
      name: "Jimuel Ramos Caasi",
      fb: "https://www.linkedin.com/in/jim-caasi-71918738b/",
    },
    {
      name: "Jhance Giyan Parra Regoniel",
      fb: "https://www.facebook.com/your-link-here",
    },
    {
      name: "Don Symon Cutaran Ramos",
      fb: "https://www.facebook.com/your-link-here",
    },
    {
      name: "Liezel Balo Marasigan",
      fb: "https://www.linkedin.com/in/liezel-marasigan-b7b89738a/?originalSubdomain=ph",
    },
  ];

  const techStacks = [
    "Next.js",
    "React",
    "Tailwind CSS",
    "TypeScript",
    "Framer Motion",
    "Node.js",
    "OpenAI API",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1020] via-[#0f1d35] to-[#11294a] flex flex-col items-center justify-center text-white px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl text-center"
      >
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          About Our Project
        </h1>
        <p className="text-gray-300 text-lg leading-relaxed mb-10">
          Welcome to the official{" "}
          <span className="text-blue-400 font-semibold">
            STI College Tagaytay Chatbot
          </span>{" "}
          — your reliable online assistant for quick access to school information.  
          This platform helps students, parents, and visitors find details about 
          courses, tuition fees, and enrollment procedures effortlessly.  
          Designed for speed, simplicity, and 24/7 accessibility — 
          making information easier than ever to reach.
        </p>

        {/* Divider */}
        <div className="h-[1px] w-20 bg-blue-500 mx-auto mb-10 opacity-50" />

        {/* Team Members */}
        <h2 className="text-2xl font-semibold mb-4 text-blue-300">
          Development Team
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {members.map((member, i) => (
            <a
              key={i}
              href={member.fb}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white/5 border border-white/10 rounded-lg py-3 px-4 text-gray-200 hover:bg-white/10 transition flex items-center justify-center text-center"
            >
              <span className="group-hover:text-blue-400 transition font-medium">
                {member.name}
              </span>
            </a>
          ))}
        </div>

        {/* Tech Stack */}
        <h2 className="text-2xl font-semibold mb-4 text-blue-300">
          Technologies Used
        </h2>
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {techStacks.map((tech, i) => (
            <span
              key={i}
              className="px-5 py-2 text-sm rounded-full bg-white/10 border border-white/10 text-gray-200 hover:bg-blue-500/20 transition"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Back Button */}
        <Link
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-500 transition text-white font-medium px-6 py-3 rounded-lg shadow-md"
        >
          ← Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
