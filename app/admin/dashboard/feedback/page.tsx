"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

/* TYPES -------------------------------------------------- */

interface Feedback {
  _id: string;
  feedbackId: string;
  rating: "positive" | "negative";
  comment?: string;
  question?: string;
  aiAnswer?: string;
  resolved?: boolean;
  timestamp?: string;
}

/* COMPONENT -------------------------------------------------- */

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  /* DATA FETCHING & REALTIME STREAM FIX ---------------------- */
  useEffect(() => {
    // 1. Initial Data Fetch
    const fetchData = async () => {
      try {
        const res = await fetch("/api/feedback");
        if (!res.ok) throw new Error("Failed to fetch feedback");
        
        const result = await res.json();
        // Assuming API returns { data: [...] } or directly [...]
        const data = result.data || result; 
        setFeedbacks(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Initial feedback fetch failed:", e);
      }
    };
    fetchData();

    // 2. Realtime Stream Handling (The FIX)
    const eventSource = new EventSource("/api/feedback/stream");
    
    eventSource.onmessage = (event) => {
      if (event.data === "connected") return;

      try {
        const payload = JSON.parse(event.data);
        
        setFeedbacks((prev) => {
          // Handle INSERT (New feedback)
          if (payload.type === "insert" && payload.data) {
            // Idagdag ang bagong data sa simula ng array
            return [payload.data, ...prev]; 
          }

          // Handle UPDATE (e.g., Resolved status changed)
          if (payload.type === "update" && payload.data) {
            // I-map ang array at palitan lang ang updated record
            return prev.map((f) => 
              f._id === payload.data._id ? payload.data : f
            );
          }

          // Fallback: Huwag mag-update kung hindi standard payload format
          // (Ang dating code mo ay nagpapalit sa buong array, na nagiging sanhi ng bug)
          return prev; 
        });

      } catch (e) {
        // console.error("Failed to parse SSE data:", event.data, e);
        // Sometimes the full array is sent, try to handle that:
        try {
            const fullArray = JSON.parse(event.data);
            if (Array.isArray(fullArray)) {
                setFeedbacks(fullArray);
            }
        } catch {}
      }
    };
    
    return () => eventSource.close();
  }, []);

  /* COMPUTED STATS --------------------------------------------- */
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const positive = feedbacks.filter((f) => f.rating === "positive").length;
    const negative = feedbacks.filter((f) => f.rating === "negative").length;

    const positiveRate = total ? ((positive / total) * 100).toFixed(1) : "0.0";
    const negativeRate = total ? ((negative / total) * 100).toFixed(1) : "0.0";

    const trendData = feedbacks.slice(-10).map((f, idx) => ({
      index: idx + 1,
      value: f.rating === "positive" ? 1 : 0,
    }));

    const distributionData = [
      { name: "Positive", value: positive },
      { name: "Negative", value: negative },
    ];
    
    return {
      total, positive, negative, positiveRate, negativeRate, trendData, distributionData
    };

  }, [feedbacks]);

  /* UI -------------------------------------------------- */

  return (
    <div className="min-h-screen p-6 bg-gray-900">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white">Feedback Dashboard</h1>
          <p className="text-white/70 mt-1">Monitor and analyze user feedback</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
            <p className="text-sm text-white/70 mb-1">Total Feedback</p>
            <p className="text-3xl font-semibold text-white">{stats.total}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
            <p className="text-sm text-white/70 mb-1">Positive</p>
            <p className="text-3xl font-semibold text-green-400">{stats.positive}</p>
            <p className="text-xs text-white/60 mt-1">{stats.positiveRate}%</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
            <p className="text-sm text-white/70 mb-1">Negative</p>
            <p className="text-3xl font-semibold text-red-400">{stats.negative}</p>
            <p className="text-xs text-white/60 mt-1">{stats.negativeRate}%</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
            <p className="text-sm text-white/70 mb-1">Satisfaction Rate</p>
            <p className="text-3xl font-semibold text-blue-400">{stats.positiveRate}%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Trend Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Feedback Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff30" />
                <XAxis
                  dataKey="index"
                  stroke="#ffffff90"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#ffffff90"
                  style={{ fontSize: '12px' }}
                  ticks={[0, 1]}
                  domain={[0, 1]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    fontSize: '12px',
                    color: '#ffffff'
                  }}
                  formatter={(value: any) => [value === 1 ? "Positive" : "Negative", "Rating"]}
                />
                <Line
                  type="stepAfter"
                  dataKey="value"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ fill: "#60a5fa", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution Chart */}
          <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Feedback Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.distributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff30" />
                <XAxis
                  dataKey="name"
                  stroke="#ffffff90"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#ffffff90"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    fontSize: '12px',
                    color: '#ffffff'
                  }}
                />
                <Bar dataKey="value" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <h3 className="text-lg font-semibold text-white">Recent Feedback</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {feedbacks.slice(0, 10).map((fb) => (
                  <tr
                    key={fb._id}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => setSelectedFeedback(fb)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-300 font-bold">
                      {fb.feedbackId}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${fb.rating === "positive"
                          ? "bg-green-500/20 text-green-300 border border-green-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}>
                        {fb.rating === "positive" ? "Positive" : "Negative"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-white/80 max-w-xs truncate">
                      {fb.comment || fb.question || "—"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                      {fb.timestamp ? new Date(fb.timestamp).toLocaleDateString() : "—"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${fb.resolved
                          ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}>
                        {fb.resolved ? "Resolved" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Modal */}
        <AnimatePresence>
          {selectedFeedback && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedFeedback(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white/10 backdrop-blur-xl rounded-lg border border-white/20 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-white/20">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Feedback Details</h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm ${selectedFeedback.rating === "positive"
                        ? "bg-green-500/20 text-green-300 border border-green-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}>
                      {selectedFeedback.rating === "positive" ? "Positive" : "Negative"}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">User Message</label>
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/20 p-4 text-white">
                      {selectedFeedback.comment || selectedFeedback.question || "No message provided"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">AI Response</label>
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/20 p-4 text-white">
                      {selectedFeedback.aiAnswer || "No AI response recorded"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Date</label>
                      <p className="text-sm text-white">
                        {selectedFeedback.timestamp ? new Date(selectedFeedback.timestamp).toLocaleString() : "—"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm ${selectedFeedback.resolved
                          ? "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}>
                        {selectedFeedback.resolved ? "Resolved" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-white/20 flex justify-end">
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}