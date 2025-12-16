"use client";

import React, { useEffect, useState } from "react";

export default function KnowledgeBaseDashboard() {
  const [kbList, setKbList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // form fields
  const [form, setForm] = useState({
    id: "",
    category: "general",
    keywords: "",
    question: "",
    answer: "",
  });

  // Fetch KB
  const loadKB = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/knowledgebase/list");
      const data = await res.json();
      setKbList(data.kb || []);
    } catch (err) {
      console.error("Error loading KB:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKB();
  }, []);

  // open modal
  const openAddModal = () => {
    setEditing(null);
    setForm({
      id: "",
      category: "general",
      keywords: "",
      question: "",
      answer: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (entry: any) => {
    setEditing(entry._id);

    setForm({
      id: entry.id || "",
      category: entry.category || "general",
      keywords: entry.keywords?.join(", ") || "",
      question: entry.question,
      answer: entry.answer,
    });

    setModalOpen(true);
  };

  // Add or Update KB entry
  const saveEntry = async () => {
    const payload = {
      id: form.id || undefined,
      category: form.category,
      keywords: form.keywords
        ? form.keywords.split(",").map((s) => s.trim())
        : [],
      question: form.question,
      answer: form.answer,
      kbId: editing || undefined,
    };

    const url = editing
      ? "/api/knowledgebase/admin/update"
      : "/api/knowledgebase/admin/add";

    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      setModalOpen(false);
      loadKB();
    } else {
      alert("Failed: " + data.message);
    }
  };

  // Delete entry
  const deleteEntry = async (kbId: string) => {
    if (!confirm("Are you sure you want to delete this KB entry?")) return;

    const res = await fetch("/api/knowledgebase/admin/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kbId }),
    });

    const data = await res.json();
    if (data.success) {
      loadKB();
    } else {
      alert("Delete failed.");
    }
  };

  // filter logic
  const filtered = kbList.filter((kb: any) =>
    (kb.question + kb.answer + kb.category + kb.keywords.join(" "))
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6 text-white">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-yellow-300">Knowledge Base</h1>
          <p className="text-white/60">Manage your FAQ & auto-answer system</p>
        </div>

        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow text-white"
        >
          + Add KB Entry
        </button>
      </div>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search questions, keywords, answers..."
        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg mb-6 text-white placeholder-white/40"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* TABLE */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/10 border-b border-white/10">
            <tr>
              {["ID", "Category", "Question", "Keywords", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-white/40 italic"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((kb: any) => (
                <tr key={kb._id} className="hover:bg-white/10 transition">
                  <td className="px-6 py-4 font-mono text-blue-300 font-bold">
                    {kb.id || "(auto)"}
                  </td>
                  <td className="px-6 py-4">{kb.category}</td>
                  <td className="px-6 py-4">{kb.question}</td>
                  <td className="px-6 py-4 text-sm text-white/70">
                    {kb.keywords.join(", ")}
                  </td>

                  <td className="px-6 py-4 flex gap-3">
                    <button
                      onClick={() => openEditModal(kb)}
                      className="px-3 py-1 bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEntry(kb._id)}
                      className="px-3 py-1 bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-white/40 italic"
                >
                  No KB entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-[#0c1524] border border-white/10 w-full max-w-2xl rounded-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-yellow-300 mb-4">
              {editing ? "Edit KB Entry" : "Add KB Entry"}
            </h2>

            {/* FORM */}
            <div className="space-y-4">
              <input
                placeholder="Custom ID (optional)"
                className="w-full bg-white/10 border border-white/20 p-3 rounded text-white"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
              />

              <input
                placeholder="Category"
                className="w-full bg-white/10 border border-white/20 p-3 rounded"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />

              <input
                placeholder="Keywords (comma separated)"
                className="w-full bg-white/10 border border-white/20 p-3 rounded"
                value={form.keywords}
                onChange={(e) =>
                  setForm({ ...form, keywords: e.target.value })
                }
              />

              <textarea
                placeholder="Question"
                className="w-full bg-white/10 border border-white/20 p-3 rounded"
                rows={3}
                value={form.question}
                onChange={(e) =>
                  setForm({ ...form, question: e.target.value })
                }
              />

              <textarea
                placeholder="Answer"
                className="w-full bg-white/10 border border-white/20 p-3 rounded"
                rows={5}
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
              />
            </div>

            {/* BUTTONS */}
            <div className="flex justify-end mt-6 gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveEntry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                {editing ? "Save Changes" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
