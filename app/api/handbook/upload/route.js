import { NextResponse } from "next/server";
import { connectDB } from "@lib/mongodb";
import Handbook from "@models/Handbook";
import HandbookChunk from "@models/HandbookChunk";
import HandbookGlobalContext from "@models/HandbookGlobalContext";
import { chunkText } from "@lib/text";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import OpenAI from "openai";
import { detectSectionTitle } from "./sectiondetector/router";
import progressEmitter from "@lib/progressEmitter";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ============================
   HELPERS
============================ */
function normalizeLine(line) {
  return line.replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim();
}

function splitTwoColumns(line) {
  if (/\|/.test(line)) {
    const parts = line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(" | ")];
    }
  }

  const doubleSpaceMatch = line.match(/ {2,}/);
  if (doubleSpaceMatch) {
    const parts = line
      .split(/ {2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(" ")];
    }
  }

  return null;
}

function detectOffenseRow(line) {
  const L = line.trim();
  const offensePattern =
    /^(first|second|third|1st|2nd|3rd|fourth|fifth)\b[:.\-\s]/i;

  if (offensePattern.test(L)) {
    const m = L.split(/[:\-\–\—]{1,}| {2,}/);
    return { label: m[0].trim(), value: m.slice(1).join(" ").trim() };
  }

  const numericLeading = L.match(/^\s*\d+[\.\)]\s*(.+)$/);
  if (numericLeading) {
    const rest = numericLeading[1].trim();
    const m = rest.split(/[:\-\–\—]{1,}| {2,}/);
    if (m.length >= 2) {
      return { label: m[0].trim(), value: m.slice(1).join(" ").trim() };
    }
  }

  return null;
}

function convertRowsToB2(title, rows) {
  const lines = [`${title}:`];
  for (const r of rows) {
    if (r.label && r.value) {
      lines.push(`- ${r.label}: ${r.value}`);
    }
  }
  return lines.join("\n");
}

async function extractPdfText(buffer) {
  const uint8 = new Uint8Array(buffer);
  const pdf = await pdfjs.getDocument({ data: uint8 }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str || "").join(" ");
    text += "\n\n===PAGE_BREAK===\n\n";
  }
  return text;
}

function preprocessTextForTables(rawText) {
  const lines = rawText.split(/\r?\n/);
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = normalizeLine(lines[i] || "");
    if (!line) {
      out.push("");
      i++;
      continue;
    }

    if (/\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /\|/.test(lines[i])) {
        const parts = lines[i]
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((c) => normalizeLine(c));
        if (parts.length >= 2) {
          rows.push({ label: parts[0], value: parts.slice(1).join(" ") });
        }
        i++;
      }
      out.push(convertRowsToB2("Table", rows));
      continue;
    }

    const block = [];
    let j = i;
    while (j < lines.length) {
      const l = lines[j];
      const split = splitTwoColumns(l);
      const off = detectOffenseRow(l);
      if (split) block.push({ label: split[0], value: split[1] });
      else if (off) block.push(off);
      else break;
      j++;
    }

    if (block.length) {
      out.push(convertRowsToB2("Table", block));
      i = j;
      continue;
    }

    out.push(line);
    i++;
  }

  return out.join("\n");
}
function inferScope(sectionTitle = "", text = "", type = "") {
  const t = `${sectionTitle} ${text}`.toLowerCase();

  // UNIVERSAL STI RULES
  if (
    /vape|smoking|discipline|conduct|grading|attendance|exam|academic structure/i.test(t)
  ) {
    return "universal";
  }

  // CAMPUS / LEVEL DEPENDENT
  if (
    /program|offer|strand|junior high|senior high|facility|office|department/i.test(t)
  ) {
    return "campus-dependent";
  }

  // DEFAULT
  return "general";
}


/* ============================
   POST UPLOAD
============================ */
export async function POST(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // global | campus | shs

    if (!["global", "campus", "shs"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid handbook type" },
        { status: 400 }
      );
    }


    const existing = await Handbook.findOne({ type });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Handbook already exists. Delete it first." },
        { status: 400 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No PDF uploaded" },
        { status: 400 }
      );
    }

    progressEmitter.emit("progress", { percent: 5, stage: "Reading PDF" });

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractPdfText(buffer);

    progressEmitter.emit("progress", { percent: 20, stage: "Processing text" });

    const processed = preprocessTextForTables(rawText);

    const chunks = chunkText(processed, {
      chunkSize: 1200,
      chunkOverlap: 200,
    });

    progressEmitter.emit("progress", { percent: 40, stage: "Chunking text" });

    const handbook = await Handbook.create({
      type,
      displayName: file.name,
      content: processed,
      chunkCount: chunks.length,
    });

    const summaryPrompt = `
Summarize the handbook strictly based on the document.
DOCUMENT:
${processed.slice(0, 12000)}
`;

    const summaryResp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [{ role: "user", content: summaryPrompt }],
    });

    await HandbookGlobalContext.create({
      handbookId: handbook._id,
      type,
      summary: summaryResp.choices[0].message.content,
    });

    let section = "General";
    const chunkDocs = [];

    for (let i = 0; i < chunks.length; i++) {
      const text = (chunks[i].text || "").trim();
      if (!text || text.length < 10) continue;


      const detected = detectSectionTitle(text);
      if (detected) section = detected;

      const emb = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      const scope = inferScope(section, text, type);

      chunkDocs.push({
        handbookId: handbook._id,
        type,      // global | campus | shs
        scope,     // 🔥 DITO GINAGAMIT YUNG HELPER
        chunkIndex: i,
        text,
        length: text.length,
        sectionTitle: section,
        embedding: emb.data[0].embedding,
      });



      const pct = 40 + Math.round(((i + 1) / chunks.length) * 50);
      progressEmitter.emit("progress", {
        percent: pct,
        stage: `Embedding ${i + 1}/${chunks.length}`,
      });
    }

    await HandbookChunk.insertMany(chunkDocs);

    progressEmitter.emit("progress", {
      percent: 100,
      stage: "Upload completed",
    });

    return NextResponse.json({
      success: true,
      savedChunks: chunkDocs.length,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    progressEmitter.emit("progress", {
      percent: 100,
      stage: "Upload failed",
    });
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
