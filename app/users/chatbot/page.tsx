"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
  sender: "user" | "bot";
  text: string;
}

type FeedbackStep = "" | "initial" | "form" | "thankyou";

const Chatbot: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Feedback states
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackStep, setFeedbackStep] = useState<FeedbackStep>("");
  const [feedbackRating, setFeedbackRating] = useState<"positive" | "negative" | "">("");
  const [selectedReason, setSelectedReason] = useState("");
  const [comment, setComment] = useState("");
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

  const [language, setLanguage] = useState<"en" | "tl">("en");

  // SESSION persisted in localStorage across reloads
  const [sessionId, setSessionId] = useState<string | null>(null);

  const chatRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const translations = {
    en: {
      header: "How can we assist you?",
      subheader: "Ask anything about STI Tagaytay, we're here to help.",
      placeholder: "Type your question...",
      suggestions: [
        "How much is the tuition fee?",
        "What courses are offered by STI?",
        "Are there scholarships available?",
        "Is there parking available?",
        "How do I enroll as a transferee?",
      ],
    },
    tl: {
      header: "Paano ka namin matutulungan?",
      subheader: "Itanong ang gusto mong malaman tungkol sa STI.",
      placeholder: "I-type ang iyong tanong...",
      suggestions: [
        "Magkano ang tuition fee?",
        "Anong mga kurso ang inaalok ng STI?",
        "May mga scholarship ba?",
        "May parking ba sa campus?",
        "Paano mag-enroll bilang transferee?",
      ],
    },
  } as const;

  const t = translations[language];

  // Initialize sessionId
  useEffect(() => {
    try {
      const sid = crypto.randomUUID(); // new session every reload
      setSessionId(sid);
    } catch (e) {
      setSessionId(`sess-${Date.now()}`); // fallback
    }
  }, []);

  useEffect(() => {
    if (showChat) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Idle timer for feedback
  useEffect(() => {
    if (!showChat || feedbackDismissed) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (messages.some((m) => m.sender === "bot")) {
        setShowFeedback(true);
        setFeedbackStep("initial");
      }
    }, 10000);
  }, [messages, showChat, feedbackDismissed]);

  // Lock body scroll when chat is open
  useEffect(() => {
    document.body.style.overflow = showChat ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showChat]);

  // ------------------ STREAMING HELPERS ------------------
  async function streamResponse(reader: ReadableStreamDefaultReader<Uint8Array>) {
    let botText = "";

    // Add empty bot bubble
    setMessages((prev) => [...prev, { sender: "bot", text: "" }]);

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        botText += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { sender: "bot", text: botText };
          return updated;
        });
      }
    } catch (err) {
      console.error("stream read error", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Stream error occurred." },
      ]);
    } finally {
      setIsLoading(false);
      try { await reader.cancel(); } catch { };
      streamReaderRef.current = null;
      if (abortControllerRef.current) abortControllerRef.current = null;
    }
  }

  const sendToAI = async (question: string) => {
    if (!sessionId) return;

    // Cancel previous stream if active
    try {
      if (streamReaderRef.current) {
        await streamReaderRef.current.cancel();
        streamReaderRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    } catch (e) { }

    setMessages((prev) => [...prev, { sender: "user", text: question }]);
    setIsLoading(true);

    try {
      const ac = new AbortController();
      abortControllerRef.current = ac;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, language, sessionId }),
        signal: ac.signal,
      });

      if (!res.body) throw new Error("No response body from stream API");

      const reader = res.body.getReader();
      streamReaderRef.current = reader;
      await streamResponse(reader);
    } catch (err) {
      console.error("STREAM ERROR:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Something went wrong. Please try again." },
      ]);
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (q: string) => {
    setShowChat(true);
    sendToAI(q);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    setShowChat(true);
    sendToAI(inputValue.trim());
    setInputValue("");
  };

  const handleFeedbackClose = () => {
    setShowFeedback(false);
    setFeedbackDismissed(true);
    setFeedbackStep("");
    setFeedbackRating("");
    setSelectedReason("");
    setComment("");
  };

  const handleFeedbackSubmit = async () => {
    if (!sessionId || !feedbackRating || !selectedReason) return;

    const lastUserMsg = [...messages].reverse().find(m => m.sender === "user");
    const lastBotMsg = [...messages].reverse().find(m => m.sender === "bot");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId: `FB-${Date.now()}`,
          sessionId,
          rating: feedbackRating,
          comment: comment || selectedReason,
          question: lastUserMsg?.text || "",
          aiAnswer: lastBotMsg?.text || "",
          resolved: false,
          timestamp: new Date().toISOString(),
          source: "chatbot",
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      setFeedbackStep("thankyou");
      setTimeout(handleFeedbackClose, 2000);
    } catch (err) {
      console.error("Feedback submit failed:", err);
    }
  };


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (streamReaderRef.current) streamReaderRef.current.cancel();
        if (abortControllerRef.current) abortControllerRef.current.abort();
      } catch { }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto px-6 pb-24">
      <div className="text-center mt-10 mb-8">
        <h1 className="text-4xl font-semibold text-white">{t.header}</h1>
        <p className="text-slate-300 mt-2">{t.subheader}</p>
      </div>

      {!showChat && (
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {t.suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(q)}
              className="px-4 py-2 rounded-full border border-white/10 text-slate-200 hover:bg-white/5 transition"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div ref={chatRef} className="h-full overflow-y-auto space-y-5 pb-40 px-2">
          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm leading-relaxed backdrop-blur border shadow-sm ${m.sender === "user"
                    ? "bg-blue-600/90 border-blue-400/30 text-white rounded-br-md"
                    : "bg-white/5 border-white/10 text-slate-200 rounded-bl-md"
                    }`}
                >
                  {m.sender === "user" ? (
                    m.text
                  ) : (
                    <ReactMarkdown
                      components={{
                        strong: ({ node, ...props }) => (
                          <span className="font-bold text-blue-200" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc ml-5 mt-2 mb-2 space-y-1 text-slate-300" {...props} />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol className="list-decimal ml-5 mt-2 mb-2 space-y-1 text-slate-300" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="pl-1" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-base font-bold mt-4 mb-2 text-white block border-b border-white/10 pb-1" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-2 last:mb-0" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a className="text-blue-400 hover:underline hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-4 border-blue-500/50 pl-4 py-1 my-2 bg-white/5 rounded-r" {...props} />
                        ),
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex justify-start">
              <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300 flex items-center gap-2">
                <span className="text-xs font-medium opacity-70">STI Assist is typing</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-5xl flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-3 shadow-lg">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={t.placeholder}
          className="flex-1 px-4 py-3 bg-transparent text-white placeholder-slate-400 outline-none"
        />
        <button
          onClick={() => handleSubmit()}
          className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-blue-500/20 shadow-md"
        >
          Send
        </button>
      </div>

      {/* Feedback Popup - Bottom Center */}
      <AnimatePresence>
        {showFeedback && !feedbackDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl mx-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={handleFeedbackClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-white transition p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Initial Step */}
            {feedbackStep === "initial" && (
              <div className="p-5">
                <p className="text-sm text-slate-300 mb-4 pr-6">
                  How was your chat experience?
                </p>

                <div className="flex gap-3">
                  {/* POSITIVE */}
                  <button
                    onClick={() => {
                      setFeedbackRating("positive");
                      setFeedbackStep("form");
                    }}
                    className="flex-1 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm text-slate-200"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-1 rounded-full bg-green-400" />
                      <span className="text-xs uppercase tracking-wide">Satisfied</span>
                    </div>
                  </button>

                  {/* NEGATIVE */}
                  <button
                    onClick={() => {
                      setFeedbackRating("negative");
                      setFeedbackStep("form");
                    }}
                    className="flex-1 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm text-slate-200"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-6 h-1 rounded-full bg-red-400" />
                      <span className="text-xs uppercase tracking-wide">Needs Improvement</span>
                    </div>
                  </button>
                </div>
              </div>
            )}


            {/* Form Step */}
            {feedbackStep === "form" && (
              <div className="p-5">
                <p className="text-sm text-slate-300 mb-3 pr-6">
                  {feedbackRating === "positive" ? "What did you like?" : "What went wrong?"}
                </p>

                <div className="space-y-2 mb-3">
                  {feedbackRating === "positive" ? (
                    <>
                      {["Helpful", "Fast", "Easy to use", "Other"].map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setSelectedReason(reason)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition text-sm ${selectedReason === reason
                            ? "bg-blue-600/20 border-blue-500 text-white"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                            }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {["Wrong info", "Too slow", "Confusing", "Other"].map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setSelectedReason(reason)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition text-sm ${selectedReason === reason
                            ? "bg-blue-600/20 border-blue-500 text-white"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                            }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </>
                  )}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comments (optional)"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-400 outline-none focus:border-blue-500 transition resize-none"
                  rows={2}
                />

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setFeedbackStep("initial")}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={!selectedReason}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}

            {/* Thank You Step */}
            {feedbackStep === "thankyou" && (
              <div className="p-6 text-center">
                <div className="mx-auto mb-3 w-8 h-8 rounded-full border border-green-400 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>

                <p className="text-sm font-medium text-white mb-1">
                  Feedback received
                </p>
                <p className="text-xs text-slate-400">
                  Thank you for helping us improve the system
                </p>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chatbot;