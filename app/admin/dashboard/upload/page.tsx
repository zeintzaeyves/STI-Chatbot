"use client";

import React, { useEffect, useRef, useState } from "react";

type HandbookType = "global" | "campus" | "shs";

interface HandbookInfo {
  displayName: string;
  uploadedAt: string;
}

export default function HandbookUploadPage() {
  /* ============================
     STATE
  ============================ */
  const [files, setFiles] = useState<Record<HandbookType, File | null>>({
    global: null,
    campus: null,
    shs: null,
  });

  const [handbooks, setHandbooks] = useState<
    Record<HandbookType, HandbookInfo | null>
  >({
    global: null,
    campus: null,
    shs: null,
  });

  const [loadingType, setLoadingType] = useState<HandbookType | null>(null);
  const [status, setStatus] = useState("");

  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  const eventSourceRef = useRef<EventSource | null>(null);

  /* ============================
     LOAD EXISTING HANDBOOKS
  ============================ */
  const loadHandbooks = async () => {
    const [g, c, s] = await Promise.all([
      fetch("/api/handbook/get?type=global").then((r) => r.json()),
      fetch("/api/handbook/get?type=campus").then((r) => r.json()),
      fetch("/api/handbook/get?type=shs").then((r) => r.json()),
    ]);

    setHandbooks({
      global: g.exists ? g : null,
      campus: c.exists ? c : null,
      shs: s.exists ? s : null,
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
      setStatus("Handbook uploaded successfully.");
      setFiles((p) => ({ ...p, [type]: null }));
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
      setHandbooks((p) => ({ ...p, [type]: null }));
      setStatus("Handbook deleted.");
    } else {
      setStatus("Delete failed.");
    }
  };

  /* ============================
     CARD COMPONENT
  ============================ */
  const Card = ({
    title,
    description,
    type,
  }: {
    title: string;
    description: string;
    type: HandbookType;
  }) => {
    const handbook = handbooks[type];
    const isLoading = loadingType === type;

    return (
      <div className="
        relative rounded-2xl p-6
        bg-white/10 backdrop-blur-xl
        border border-white/20
        shadow-lg shadow-black/40
      ">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-slate-300 text-sm mt-1">{description}</p>

        {/* EXISTING PDF */}
        {handbook && (
          <div className="
            mt-6 bg-black/30 backdrop-blur-md p-4 rounded-xl
            border border-green-400/40
          ">
            <p className="text-green-400 font-medium">✔ Uploaded PDF</p>

            <p
              className="text-slate-200 mt-1 text-sm truncate"
              title={handbook.displayName}
            >
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
              Delete PDF
            </button>
          </div>
        )}

        {/* UPLOAD */}
        {!handbook && (
          <div className="mt-6">
            <input
              key={files[type]?.name || "empty"}
              id={`${type}-upload`}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) =>
                setFiles((p) => ({
                  ...p,
                  [type]: e.target.files?.[0] ?? null,
                }))
              }
            />

            <label
              htmlFor={`${type}-upload`}
              className="
                block cursor-pointer rounded-xl p-6 text-center
                border border-dashed border-white/30
                bg-black/20 backdrop-blur-md
                hover:border-blue-400 transition
              "
            >
              <div className="text-4xl mb-2">📄</div>
              <p
                className="text-slate-200 text-sm truncate"
                title={files[type]?.name}
              >
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

            {isLoading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 truncate max-w-[70%]">
                    {stage}
                  </span>
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
      <h1 className="text-3xl font-bold mb-8">AI Handbook Manager</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Global Handbook"
          description="Applies to all STI campuses"
          type="global"
        />

        <Card
          title="Campus Handbook"
          description="Policies specific to STI Tagaytay"
          type="campus"
        />

        <Card
          title="Handbook SHS"
          description="SHS-specific policies and guidelines"
          type="shs"
        />
      </div>

      {status && (
        <div className="
          mt-6 bg-black/30 backdrop-blur-md
          p-4 rounded-xl border border-white/20
        ">
          <p className="text-slate-200">{status}</p>
        </div>
      )}
    </div>
  );
}
