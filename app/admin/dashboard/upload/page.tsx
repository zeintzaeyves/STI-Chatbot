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
     CARD UI
  ============================ */
  const renderCard = (
    title: string,
    type: HandbookType,
    description: string
  ) => {
    const handbook = handbooks[type];
    const isLoading = loadingType === type;

    return (
      <div className="bg-slate-700 rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-yellow-300">{title}</h2>
        <p className="text-slate-400 text-sm mt-1">{description}</p>

        {/* WHEN FILE EXISTS */}
        {handbook && (
          <div className="mt-5 bg-slate-800 p-4 rounded-lg border border-green-500">
            <p className="text-green-400 font-medium">Uploaded PDF</p>
            <p className="text-slate-300 mt-1">{handbook.displayName}</p>
            <p className="text-slate-500 text-xs mt-1">
              {new Date(handbook.uploadedAt).toLocaleString()}
            </p>

            <button
              onClick={() => deleteHandbook(type)}
              className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
            >
              Delete Handbook
            </button>
          </div>
        )}

        {/* UPLOAD UI – ONLY WHEN EMPTY */}
        {!handbook && (
          <div className="mt-6">
            <input
              type="file"
              accept="application/pdf"
              id={`${type}-upload`}
              className="hidden"
              onChange={(e) =>
                setFiles((prev) => ({
                  ...prev,
                  [type]: e.target.files?.[0] ?? null,
                }))
              }
            />

            <label
              htmlFor={`${type}-upload`}
              className="block cursor-pointer border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 transition"
            >
              <div className="text-4xl mb-2">📄</div>
              <p className="text-slate-300">
                {files[type]?.name || "Choose PDF"}
              </p>
            </label>

            <button
              disabled={isLoading}
              onClick={() => uploadPDF(type)}
              className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg"
            >
              {isLoading ? "Processing…" : "Upload & Process"}
            </button>

            {/* PROGRESS */}
            {isLoading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{stage}</span>
                  <span className="text-slate-400">{progress}%</span>
                </div>
                <div className="w-full bg-slate-600 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 transition-all"
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
    <div className="p-8 max-w-5xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-8">Handbook Manager</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {renderCard(
          "Global Handbook",
          "global",
          "Applies to all STI campuses"
        )}
        {renderCard(
          "Campus-Specific Handbook",
          "campus",
          "Policies specific to STI Tagaytay"
        )}
      </div>

      {status && (
        <div className="mt-6 bg-slate-700 p-4 rounded-lg border border-slate-600">
          <p className="text-slate-300">{status}</p>
        </div>
      )}
    </div>
  );
}
