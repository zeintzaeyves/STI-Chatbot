"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Inquiry {
  _id: string;
  inquiryId: string;
  userQuery: string;
  botResponse?: string;
  status: string;
  createdAt: string;
}

interface Feedback {
  _id: string;
  rating: "positive" | "negative";
  comment?: string;
  timestamp?: string;
}

export default function ChatbotSystemPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* -------------------- REAL-TIME INQUIRIES -------------------- */
  useEffect(() => {
    const fetchInquiries = async () => {
      const res = await fetch("/api/inquiries");
      const data = await res.json();
      setInquiries(Array.isArray(data) ? data : []);
    };
    fetchInquiries();

    const inquiryStream = new EventSource("/api/inquiries/stream");

    inquiryStream.onmessage = (e) => {
      if (e.data === "connected") return;

      const newInquiry = JSON.parse(e.data);

      setInquiries((prev) => {
        const exists = prev.some((x) => x._id === newInquiry._id);
        if (exists) {
          return prev.map((x) => (x._id === newInquiry._id ? newInquiry : x));
        }
        return [newInquiry, ...prev];
      });
    };

    return () => inquiryStream.close();
  }, []);

  /* -------------------- REAL-TIME FEEDBACK -------------------- */
  useEffect(() => {
    const fetchFeedbacks = async () => {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      setFeedbacks(Array.isArray(data) ? data : []);
    };
    fetchFeedbacks();

    const feedbackStream = new EventSource("/api/feedback/stream");

    feedbackStream.onmessage = (e) => {
      if (e.data === "connected") return;

      const payload = JSON.parse(e.data);

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

    return () => feedbackStream.close();
  }, []);

  /* -------------------- MANUAL REFRESH -------------------- */
  const refreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetch("/api/inquiries").then((r) => r.json()).then(setInquiries),
      fetch("/api/feedback").then((r) => r.json()).then(setFeedbacks),
    ]);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  /* -------------------- COMPUTED STATS -------------------- */
  const totalInquiries = inquiries.length;

  const solved = inquiries.filter((i) => i.status === "solved").length;
  const partial = inquiries.filter((i) => i.status === "partial").length;
  const unresolved = inquiries.filter((i) => i.status === "unresolved").length;

  // Feedback stats
  const positive = feedbacks.filter((f) => f.rating === "positive").length;
  const negative = feedbacks.filter((f) => f.rating === "negative").length;
  const totalFeedback = positive + negative;

  // Replace avgRating → Positive Percentage
  const positivePercentage = totalFeedback
    ? Math.round((positive / totalFeedback) * 100)
    : 0;

  // KB accuracy = solved inquiries / total inquiries
  const knowledgeBaseRate = totalInquiries
    ? Math.round((solved / totalInquiries) * 100)
    : 0;

  const geminiRate = 100 - knowledgeBaseRate;

  /* -------------------- CHART DATA -------------------- */
  const monthlyCounts: Record<string, { inquiries: number; feedback: number }> =
    {};

  inquiries.forEach((inq) => {
    const m = new Date(inq.createdAt).toLocaleString("default", {
      month: "short",
    });
    if (!monthlyCounts[m]) monthlyCounts[m] = { inquiries: 0, feedback: 0 };
    monthlyCounts[m].inquiries++;
  });

  feedbacks.forEach((fb) => {
    const m = fb.timestamp
      ? new Date(fb.timestamp).toLocaleString("default", {
          month: "short",
        })
      : "Unknown";

    if (!monthlyCounts[m]) monthlyCounts[m] = { inquiries: 0, feedback: 0 };
    monthlyCounts[m].feedback++;
  });

  const performanceData = Object.entries(monthlyCounts).map(
    ([name, val]) => ({ name, ...val })
  );

  /* -------------------- SENTIMENT / SOURCE DATA -------------------- */
  const sentimentData = [
    { name: "Positive", value: positive },
    { name: "Negative", value: negative },
  ];

  const sourceData = [
    { name: "KnowledgeBase", value: knowledgeBaseRate },
    { name: "Gemini", value: geminiRate },
  ];

  /* -------------------- UI -------------------- */
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Chatbot System</h1>
          <p className="text-white/70 mt-1">Real-time analytics and system overview</p>
        </div>

        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing && "animate-spin"}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Inquiries", value: totalInquiries, color: "text-blue-400" },
          { title: "Resolved", value: solved, color: "text-green-400" },
          { title: "Positive Feedback", value: `${positivePercentage}%`, color: "text-purple-400" },
          { title: "Unresolved", value: unresolved, color: "text-red-400" },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg"
          >
            <p className="text-sm text-white/70 mb-1">{stat.title}</p>
            <p className={`text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Model Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Model Info */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">AI Model Information</h3>

          <div className="space-y-3 text-sm text-white/80">
            <div className="flex justify-between">
              <span className="text-white/60">Model:</span>
              <span className="font-medium">Gemini 1.5 Flash</span>
            </div>

            <div className="flex justify-between">
              <span className="text-white/60">Status:</span>
              <span className="text-green-400 font-medium">Active</span>
            </div>

            <div className="flex justify-between">
              <span className="text-white/60">Average Latency:</span>
              <span className="font-medium">1.2s</span>
            </div>

            <div className="flex justify-between">
              <span className="text-white/60">KB Accuracy:</span>
              <span className="font-medium">{knowledgeBaseRate}%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-white/60">Unresolved:</span>
              <span className="font-medium">{unresolved}</span>
            </div>
          </div>
        </div>

        {/* AI Source Breakdown */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">AI Source Breakdown</h3>

          <div className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#3b82f6" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feedback Sentiment */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Feedback Sentiment</h3>

          <div className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex gap-4 mt-4 text-xs text-white/80">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                <span>Positive {positive}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                <span>Negative {negative}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LINE CHART */}
      <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Inquiries & Feedback Over Time</h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid stroke="#ffffff30" />
            <XAxis dataKey="name" stroke="#ffffff80" />
            <YAxis stroke="#ffffff80" />

            <Tooltip />

            <Line type="monotone" dataKey="inquiries" stroke="#60a5fa" strokeWidth={2} />
            <Line type="monotone" dataKey="feedback" stroke="#facc15" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
