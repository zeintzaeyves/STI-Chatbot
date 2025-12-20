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
  inquiryId?: string;
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

  /* ==================== REAL-TIME INQUIRIES ==================== */
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
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.some((x) => x._id === newInquiry._id);

        if (exists) {
          return safePrev.map((x) =>
            x._id === newInquiry._id ? newInquiry : x
          );
        }

        return [newInquiry, ...safePrev];
      });
    };

    return () => inquiryStream.close();
  }, []);

  /* ==================== REAL-TIME FEEDBACK ==================== */
  useEffect(() => {
    const fetchFeedbacks = async () => {
      const res = await fetch("/api/feedback");
      const data = await res.json();

      const normalized = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setFeedbacks(normalized);
    };

    fetchFeedbacks();

    const feedbackStream = new EventSource("/api/feedback/stream");

    feedbackStream.onmessage = (e) => {
      if (e.data === "connected") return;

      const payload = JSON.parse(e.data);

      setFeedbacks((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];

        if (payload.type === "insert") {
          return [payload.data, ...safePrev];
        }

        if (payload.type === "update") {
          return safePrev.map((f) =>
            f._id === payload.data._id ? payload.data : f
          );
        }

        if (payload.type === "delete") {
          return safePrev.filter((f) => f._id !== payload.id);
        }

        return safePrev;
      });
    };

    return () => feedbackStream.close();
  }, []);

  /* ==================== MANUAL REFRESH ==================== */
  const refreshData = async () => {
    setIsRefreshing(true);

    await Promise.all([
      fetch("/api/inquiries")
        .then((r) => r.json())
        .then((d) => setInquiries(Array.isArray(d) ? d : [])),

      fetch("/api/feedback")
        .then((r) => r.json())
        .then((d) =>
          setFeedbacks(
            Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []
          )
        ),
    ]);

    setTimeout(() => setIsRefreshing(false), 700);
  };

  /* ==================== SAFE DATA ==================== */
  const safeInquiries = Array.isArray(inquiries) ? inquiries : [];
  const safeFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];

  /* ==================== STATS ==================== */
  const totalInquiries = safeInquiries.length;
  const solved = safeInquiries.filter((i) => i.status === "solved").length;
  const unresolved = safeInquiries.filter(
    (i) => i.status === "unresolved"
  ).length;

  const positive = safeFeedbacks.filter(
    (f) => f.rating === "positive"
  ).length;
  const negative = safeFeedbacks.filter(
    (f) => f.rating === "negative"
  ).length;

  const totalFeedback = positive + negative;

  const positivePercentage = totalFeedback
    ? Math.round((positive / totalFeedback) * 100)
    : 0;

  const knowledgeBaseRate = totalInquiries
    ? Math.round((solved / totalInquiries) * 100)
    : 0;

  const aiReasoningRate = 100 - knowledgeBaseRate;

  /* ==================== CHART DATA ==================== */
  const monthlyCounts: Record<string, { inquiries: number; feedback: number }> =
    {};

  safeInquiries.forEach((inq) => {
    const m = new Date(inq.createdAt).toLocaleString("default", {
      month: "short",
    });
    if (!monthlyCounts[m]) monthlyCounts[m] = { inquiries: 0, feedback: 0 };
    monthlyCounts[m].inquiries++;
  });

  safeFeedbacks.forEach((fb) => {
    const m = fb.timestamp
      ? new Date(fb.timestamp).toLocaleString("default", { month: "short" })
      : "Unknown";

    if (!monthlyCounts[m]) monthlyCounts[m] = { inquiries: 0, feedback: 0 };
    monthlyCounts[m].feedback++;
  });

  const performanceData = Object.entries(monthlyCounts).map(
    ([name, val]) => ({ name, ...val })
  );

  const sentimentData = [
    { name: "Positive", value: positive },
    { name: "Negative", value: negative },
  ];

  const sourceData = [
    { name: "Handbook-Based", value: knowledgeBaseRate },
    { name: "AI Reasoning", value: aiReasoningRate },
  ];

  /* ==================== UI ==================== */
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Chatbot System Dashboard
          </h1>
          <p className="text-white/70 mt-1">
            Real-time inquiry monitoring and AI-assisted response analytics
          </p>
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
            <p className={`text-3xl font-semibold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">
            AI Model Information
          </h3>

          <div className="space-y-3 text-sm text-white/80">
            <div className="flex justify-between">
              <span className="text-white/60">Model:</span>
              <span className="font-medium">OpenAI GPT-4.1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Response Mode:</span>
              <span className="font-medium">Real-time (streamed)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Knowledge Coverage:</span>
              <span className="font-medium">{knowledgeBaseRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Unresolved:</span>
              <span className="font-medium">{unresolved}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">
            Response Source Distribution
          </h3>

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

        <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">
            Feedback Sentiment
          </h3>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
              >
                <Cell fill="#22c55e" />
                <Cell fill="#ef4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">
          Inquiries and Feedback Over Time
        </h3>

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
