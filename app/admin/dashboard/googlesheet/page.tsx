"use client";

import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

// ✅ Dynamically import Recharts components
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(() => import("recharts").then((mod) => mod.LineChart), {
  ssr: false,
});
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });

const data = [
  { month: "Jan", inquiries: 50 },
  { month: "Feb", inquiries: 200 },
  { month: "Mar", inquiries: 20 },
  { month: "Apr", inquiries: 0 },
  { month: "May", inquiries: 300 },
  { month: "Jun", inquiries: 350 },
  { month: "Jul", inquiries: 400 },
  { month: "Aug", inquiries: 220 },
];

export default function GoogleSheetStatus() {
  const cards = [
    { title: "Total Inquiries", value: "200", color: "text-yellow-400" },
    { title: "Resolved Rate", value: "92%", color: "text-blue-400" },
    { title: "Unresolved Rate", value: "8%", color: "text-red-500" },
    { title: "Feedback Rating", value: "4.7 / 5", color: "text-green-400" },
  ];

  const logs = [
    { ts: "07-10-25", query: "How do I reset my passwords?", status: "Resolved" },
    { ts: "07-10-25", query: "Can’t access dashboard", status: "Unresolved" },
    { ts: "07-10-25", query: "Update account info", status: "Resolved" },
    { ts: "07-10-25", query: "Missing data in sheet", status: "Unresolved" },
    { ts: "07-10-25", query: "Feedback not saving", status: "Unresolved" },
  ];

  return (
    <motion.main
      className="p-8 min-h-screen text-slate-100 relative overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-1 text-yellow-300">
          Google Sheet Status
        </h1>
        <p className="text-slate-300 mb-6">
          Track and review all user inquiries in one place.
        </p>
        <hr className="mb-6 border-white/10" />
      </motion.div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
          >
            <Card className="bg-white/10 border border-white/10 backdrop-blur-md shadow-lg hover:bg-white/15 transition-all duration-300">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-400">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Line Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Card className="bg-white/10 border border-white/10 backdrop-blur-md shadow-lg mb-6">
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-4 text-yellow-300">
              Inquiries Over Time
            </h2>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#0d203b", border: "none" }} />
                  <Line
                    type="monotone"
                    dataKey="inquiries"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ fill: "#facc15", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Inquiry Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <Card className="bg-white/10 border border-white/10 backdrop-blur-md shadow-lg">
          <CardContent className="p-4">
            <h2 className="font-semibold text-lg mb-4 text-yellow-300">
              Recent Inquiry Logs
            </h2>
            <table className="w-full border-collapse text-slate-200">
              <thead>
                <tr className="border-b border-white/10 text-yellow-200">
                  <th className="text-left p-2">Time Stamp</th>
                  <th className="text-left p-2">User Query</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + idx * 0.1, duration: 0.4 }}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="p-2">{row.ts}</td>
                    <td className="p-2">{row.query}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-white text-sm ${
                          row.status === "Resolved"
                            ? "bg-blue-500/80"
                            : "bg-yellow-500/70"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.main>
  );
}
