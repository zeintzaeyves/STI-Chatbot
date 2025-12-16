"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

/* TYPES -------------------------------------------------- */

type InquiryStatus = "solved" | "resolved" | "partial" | "unresolved";

interface Inquiry {
  _id: string;
  inquiryId: string;
  userQuery: string;
  status: InquiryStatus;
  createdAt: string;
}

interface Feedback {
  _id: string;
  rating: "positive" | "negative";
  comment?: string;
  timestamp?: string;
}

interface ChartEntry {
  month: string;
  inquiries: number;
}

/* COMPONENT -------------------------------------------------- */

export default function DashboardPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  /* REAL-TIME INQUIRIES ------------------------------------- */
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/inquiries");
      const result = await res.json();

      // ✅ ADJUSTMENT: Tiyakin na nakukuha ang array, nasa result.data man o direktang result
      const data = result.data || result;
      setInquiries(Array.isArray(data) ? data : []);
    };
    load();

    const stream = new EventSource("/api/inquiries/stream");

    stream.onmessage = (event: MessageEvent) => {
      if (event.data === "connected") return;

      const incoming: Inquiry = JSON.parse(event.data);
      // ... (rest of stream logic is fine)
      setInquiries((prev) => {
        const exists = prev.some((i) => i._id === incoming._id);

        if (exists) {
          return prev
            .map((i) => (i._id === incoming._id ? incoming : i))
            .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        }

        return [
          incoming,
          ...prev.sort(
            (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
          ),
        ];
      });
    };

    return () => stream.close();
  }, []);

  /* REAL-TIME FEEDBACK STREAM ---------------------------------- */
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/feedback");
      const result = await res.json();

      // ✅ ADJUSTMENT: Dahil ang API mo ay nagre-return ng direktang ARRAY (feedbackList)
      // Kung ang result ay may "data" field, gamitin ang field na 'yun. Kung wala, gamitin ang buong result.
      const data = result.data || result;
      setFeedbacks(Array.isArray(data) ? data : []);
    };
    load();

    const stream = new EventSource("/api/feedback/stream");
    // ... (rest of stream logic is fine) ...
    stream.onmessage = (event: MessageEvent) => {
      if (event.data === "connected") return;

      const payload = JSON.parse(event.data);

      if (payload.type === "insert") {
        setFeedbacks((prev) => [payload.data, ...prev]);
      }

      if (payload.type === "update") {
        setFeedbacks((prev) =>
          prev.map((f) => (f._id === payload.data._id ? payload.data : f))
        );
      }

      if (payload.type === "delete") {
        setFeedbacks((prev) => prev.filter((f) => f._id !== payload.id));
      }
    };

    return () => stream.close();
  }, []);

  /* COMPUTED STATS and CHART DATA (These are fine) */
  const stats = useMemo(() => {
    const total = inquiries.length;
    const resolved = inquiries.filter(
      (i) => i.status === "solved" || i.status === "resolved"
    ).length;
    const resolvedRate = total ? Math.round((resolved / total) * 100) : 0;
    const pos = feedbacks.filter((f) => f.rating === "positive").length;
    const neg = feedbacks.filter((f) => f.rating === "negative").length;
    const totalFB = pos + neg;
    const positiveRate = totalFB ? Math.round((pos / totalFB) * 100) : 100;
    return {
      total,
      resolvedRate,
      unresolvedRate: 100 - resolvedRate,
      positiveRate,
    };
  }, [inquiries, feedbacks]);

  const chartData: ChartEntry[] = useMemo(() => {
    const monthly: Record<string, number> = {};
    inquiries.forEach((inq) => {
      const m = new Date(inq.createdAt).toLocaleString("default", {
        month: "short",
      });
      monthly[m] = (monthly[m] || 0) + 1;
    });
    return Object.entries(monthly).map(([month, count]) => ({
      month,
      inquiries: count,
    }));
  }, [inquiries]);

  /* UI (This section is fine) -------------------------------------------------- */

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
      <p className="text-white/70">Realtime Inquiry & Feedback Stats</p>

      {/* STATS CARDS -------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {[
          { label: "Total Inquiries", value: stats.total, color: "text-blue-400" },
          { label: "Resolved Rate", value: `${stats.resolvedRate}%`, color: "text-green-400" },
          { label: "Unresolved Rate", value: `${stats.unresolvedRate}%`, color: "text-red-400" },
          { label: "Positive Feedback", value: `${stats.positiveRate}%`, color: "text-purple-400" },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white/10 p-6 border border-white/20 rounded-xl shadow-lg"
          >
            <p className="text-white/70 text-sm">{c.label}</p>
            <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}

      </div>

      {/* CHART -------------------------------------------------- */}
      <div className="bg-white/10 p-6 border border-white/20 rounded-xl shadow-lg">
        <h2 className="text-lg text-white font-semibold mb-4">Inquiries Over Time</h2>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ffffff30" />
            <XAxis dataKey="month" stroke="#ffffff80" />
            <YAxis stroke="#ffffff80" />
            <Tooltip />
            <Line type="monotone" dataKey="inquiries" stroke="#60a5fa" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RECENT INQUIRIES TABLE -------------------------------------------------- */}
      <div className="bg-white/10 rounded-xl border border-white/20 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-white/20">
          <h2 className="text-lg text-white font-semibold">Recent Inquiries</h2>
        </div>

        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              {["ID", "Query", "Date", "Status"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs text-white/70 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {inquiries.slice(0, 7).map((inq) => (
              <tr key={inq._id} className="hover:bg-white/5 transition">
                <td className="px-6 py-4 font-mono text-white/60">{inq.inquiryId}</td>
                <td className="px-6 py-4 text-white/80 truncate">{inq.userQuery}</td>
                <td className="px-6 py-4 text-white/60">
                  {new Date(inq.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {inq.status === "solved" || inq.status === "resolved" ? (
                    <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                      Solved
                    </span>
                  ) : inq.status === "partial" ? (
                    <span className="px-3 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      Partial
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      Unresolved
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FEEDBACK -------------------------------------------------- */}
      {/* FEEDBACK -------------------------------------------------- */}
      <div className="bg-white/10 p-6 border border-white/20 rounded-xl shadow-lg">
        <h2 className="text-lg text-white font-semibold mb-4">Recent Feedback</h2>

        {feedbacks.length === 0 ? (
          <p className="text-white/60 italic text-center py-8">No feedback yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {["Rating", "Comment", "Date"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs text-white/70 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {feedbacks.slice(0, 5).map((fb) => (
                  <tr
                    key={fb._id}
                    className="hover:bg-white/5 transition border-b border-white/5"
                  >
                    {/* RATING BADGE */}
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${fb.rating === "positive"
                            ? "bg-green-500/20 text-green-300 border border-green-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                          }`}
                      >
                        {fb.rating === "positive" ? "Satisfied" : "Dissatisfied"}
                      </span>
                    </td>

                    {/* COMMENT */}
                    <td className="px-6 py-4 text-white/80 max-w-[300px] truncate">
                      {fb.comment || <span className="text-white/40 italic">No comment</span>}
                    </td>

                    {/* DATE */}
                    <td className="px-6 py-4 text-white/60">
                      {fb.timestamp
                        ? new Date(fb.timestamp).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}