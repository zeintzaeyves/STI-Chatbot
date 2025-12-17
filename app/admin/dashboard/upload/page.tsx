"use client";

import React, { useState, useEffect, useRef } from "react";

type HandbookType = "global" | "campus";

interface HandbookInfo {
  displayName: string;
  uploadedAt: string;
}

export default function HandbookUploadPage() {
  const [files, setFiles] = useState<Record<HandbookType, File | null>>({
    global: null,
    campus: null,
  });

  const [handbooks, setHandbooks] = useState<
    Record<HandbookType, HandbookInfo | null>
  >({
    global: null,
    campus: null,
  });

  const [loadingType, setLoadingType] = useState<HandbookType | null>(null);
  const [status, setStatus] = useState("");

  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  const eventSourceRef = useRef<EventSource | null>(null);

  /* ============================
     LOAD HANDBOOKS
  ============================ */
  const loadHandbooks = async () => {
    const [globalRes, campusRes] = await Promise.all([
      fetch("/api/handbook/get?type=global"),
      fetch("/api/handbook/get?type=campus"),
    ]);

    const globalData = await globalRes.json();
    const campusData = await campusRes.json();

    setHandbooks({
      global: globalData.exists ? globalData : null,
      campus: campusData.exists ? campusData : null,
    });
  };

  useEffect(() => {
    loadHandbooks();
  }, []);

  /* ============================
     SSE PROGRESS
  ============================ */
  const listenToProgress = () => {
    eventSourceRef.current?.close();
    const es = new EventSource("/api/handbook/progress");
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data.percent === "number") setProgress(data.percent);
        if (data.stage) setStage(data.stage);
      } catch {}
    };

    es.onerror = () => es.close();
  };

  /* ============================
     UPLOAD
  ============================ */
  const uploadPDF = async (type: HandbookType) => {
    const file = files[type];
    if (!file) return alert("Please select a PDF file.");

    setLoadingType(type);
    setStatus("");
    setProgress(0);
    setStage("Starting upload…");

    listenToProgress();

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/handbook/upload?type=${type}`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    eventSourceRef.current?.close();
    eventSourceRef.current = null;

    if (!data.success) {
      setStatus(`Upload failed: ${data.error || "Unknown error"}`);
    } else {
      setStatus(
        `${type === "global" ? "Global" : "Campus"} handbook uploaded successfully`
      );
      setFiles((prev) => ({ ...prev, [type]: null }));
      await loadHandbooks();
    }

    setLoadingType(null);
    setProgress(0);
    setStage("");
  };

  /* ============================
     DELETE
  ============================ */
  const deleteHandbook = async (type: HandbookType) => {
    if (!confirm("Delete this handbook?")) return;

    setStatus("Deleting handbook…");

    const res = await fetch(`/api/handbook/delete?type=${type}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (data.success) {
      setHandbooks((prev) => ({ ...prev, [type]: null }));
      setStatus("Handbook deleted.");
    } else {
      setStatus("Delete failed.");
    }
  };

  /* ============================
     CARD UI (GLASS)
  ============================ */
  const renderCard = (
    title: string,
    type: HandbookType,
    description: string
  ) => {
    const handbook = handbooks[type];
    const isLoading = loadingType === type;

    return (
      <div className="
        relative rounded-2xl p-6
        bg-white/10 backdrop-blur-xl
        border border-white/20
        shadow-lg shadow-black/40
        transition hover:border-blue-400/40
      ">
        {/* glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 hover:opacity-100 transition pointer-events-none" />

        <h2 className="text-xl font-semibold text-white">
          {title}
        </h2>
        <p className="text-slate-300 text-sm mt-1">
          {description}
        </p>

        {/* EXISTING PDF */}
        {handbook && (
          <div className="mt-6 bg-black/30 backdrop-blur-md p-4 rounded-xl border border-green-400/40">
            <p className="text-green-400 font-medium">✔ Uploaded PDF</p>
            <p className="text-slate-200 mt-1">
              {handbook.displayName}
            </p>
            <p className="text-slate-400 text-xs mt-1">
              {new Date(handbook.uploadedAt).toLocaleString()}
            </p>

            <button
              onClick={() => deleteHandbook(type)}
              className="
                mt-4 w-full py-2 rounded-lg
                bg-red-500/80 hover:bg-red-600
                transition text-sm
              "
            >
              Delete Handbook
            </button>
          </div>
        )}

        {/* UPLOAD */}
        {!handbook && (
          <div className="mt-6">
            <input
              type="file"
              accept="application/pdf"
              id={`${type}-${title}-upload`}
              className="hidden"
              onChange={(e) =>
                setFiles((prev) => ({
                  ...prev,
                  [type]: e.target.files?.[0] ?? null,
                }))
              }
            />

            <label
              htmlFor={`${type}-${title}-upload`}
              className="
                block cursor-pointer rounded-xl p-6 text-center
                border border-dashed border-white/30
                bg-black/20 backdrop-blur-md
                hover:border-blue-400 transition
              "
            >
              <div className="text-4xl mb-2">📄</div>
              <p className="text-slate-200 text-sm">
                {files[type]?.name || "Select PDF file"}
              </p>
            </label>

            <button
              disabled={isLoading}
              onClick={() => uploadPDF(type)}
              className="
                mt-4 w-full py-3 rounded-xl
                bg-blue-500/80 hover:bg-blue-600
                disabled:bg-slate-500
                transition
              "
            >
              {isLoading ? "Processing…" : "Upload & Train AI"}
            </button>

            {/* PROGRESS */}
            {isLoading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{stage}</span>
                  <span className="text-slate-400">{progress}%</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /* ============================
     RENDER
  ============================ */
  return (
    <div className="p-8 max-w-7xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-8">
        AI Handbook Manager
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderCard(
          "Global Handbook",
          "global",
          "Applies to all STI campuses"
        )}

        {renderCard(
          "Campus Handbook",
          "campus",
          "Policies specific to STI Tagaytay"
        )}

        {renderCard(
          "AI Knowledge Supplement",
          "global",
          "Additional references to enhance AI reasoning"
        )}
      </div>

      {status && (
        <div className="mt-6 bg-black/30 backdrop-blur-md p-4 rounded-xl border border-white/20">
          <p className="text-slate-200">{status}</p>
        </div>
      )}
    </div>
  );
}
