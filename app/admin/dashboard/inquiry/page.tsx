"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Inquiry {
  _id: string;
  inquiryId: string;
  userQuery: string;
  botResponse?: string;
  status: string;
  createdAt: string;
}

const RECORDS_PER_PAGE = 10;

const InquiryLogs = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  /* ============================
     FETCH INQUIRIES
  ============================ */
  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const res = await fetch("/api/inquiries");
        const data = await res.json();
        setInquiries(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch inquiries:", err);
      }
    };
    fetchInquiries();
  }, []);

  /* ============================
     PAGINATION
  ============================ */
  const totalPages = Math.ceil(inquiries.length / RECORDS_PER_PAGE);
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const currentInquiries = inquiries.slice(
    startIndex,
    startIndex + RECORDS_PER_PAGE
  );

  /* ============================
     RENDER
  ============================ */
  return (
    <div className="p-6">
      {/* HEADER */}
      <h1 className="text-3xl font-semibold text-yellow-300 mb-1">
        Inquiry Logs
      </h1>
      <p className="text-white/60 mb-6">
        View user inquiries and chatbot responses
      </p>

      {/* TABLE */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/10">
            <tr>
              {["Inquiry ID", "User Query", "Date", "Status"].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs text-white/60 uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {currentInquiries.length > 0 ? (
              currentInquiries.map((inq) => (
                <tr
                  key={inq._id}
                  onClick={() => setSelectedInquiry(inq)}
                  className="cursor-pointer hover:bg-white/10 transition"
                >
                  <td className="px-6 py-4 font-mono text-blue-300">
                    {inq.inquiryId}
                  </td>

                  <td className="px-6 py-4 text-white/80 truncate max-w-xs">
                    {inq.userQuery}
                  </td>

                  <td className="px-6 py-4 text-white/60">
                    {new Date(inq.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        inq.status === "solved"
                          ? "bg-green-500/20 text-green-300"
                          : inq.status === "partial"
                          ? "bg-yellow-500/20 text-yellow-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {inq.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-8 text-center text-white/40 italic"
                >
                  No inquiries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-4 text-white/70">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-40"
          >
            ◀
          </button>

          <span className="text-sm">
            Page <span className="font-medium">{currentPage}</span> of{" "}
            {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-40"
          >
            ▶
          </button>
        </div>
      )}

      {/* ============================
         MODAL (BLUR + CLEAN MARKDOWN)
      ============================ */}
{selectedInquiry && (
  <div
    onClick={() => setSelectedInquiry(null)}
    className="
      fixed inset-0 z-50
      bg-black/70 backdrop-blur-lg
      flex items-center justify-center
    "
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="
        w-full max-w-4xl
        bg-[#0b1220]
        border border-white/10
        rounded-2xl
        shadow-2xl
        overflow-hidden
      "
    >
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-white/10 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-yellow-300">
            Inquiry Details
          </h2>
          <p className="text-xs text-white/40 font-mono">
            {selectedInquiry.inquiryId}
          </p>
        </div>

        <button
          onClick={() => setSelectedInquiry(null)}
          className="text-white/50 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* BODY */}
      <div className="px-6 py-5 space-y-5">
        {/* USER QUERY */}
        <div>
          <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">
            User Query
          </p>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm">
            {selectedInquiry.userQuery}
          </div>
        </div>

        {/* BOT RESPONSE */}
        <div>
          <p className="text-xs text-white/50 mb-2 uppercase tracking-wide">
            Bot Response
          </p>
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-4 text-sm text-white/85 leading-relaxed">
            <ReactMarkdown
              components={{
                h3: ({ ...props }) => (
                  <h3 className="text-sm font-semibold text-blue-300 mb-2" {...props} />
                ),
                strong: ({ ...props }) => (
                  <span className="font-semibold text-white" {...props} />
                ),
                ul: ({ ...props }) => (
                  <ul className="list-disc ml-5 space-y-1 text-white/80" {...props} />
                ),
                p: ({ ...props }) => (
                  <p className="mb-2 last:mb-0" {...props} />
                ),
                hr: () => (
                  <div className="my-3 border-t border-white/10" />
                ),
              }}
            >
              {selectedInquiry.botResponse || "No response recorded."}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t border-white/10 text-xs text-white/40 flex justify-between">
        <span>
          Created at:{" "}
          {new Date(selectedInquiry.createdAt).toLocaleString()}
        </span>
        <span>Status: {selectedInquiry.status}</span>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default InquiryLogs;
