// lib/text.js
export function chunkText(text, { chunkSize = 1000, chunkOverlap = 200 } = {}) {
  if (!text) return [];

  // split by sentences-ish to avoid chopping words: naive approach
  const tokens = text.split(/\s+/);
  const chunks = [];
  let i = 0;

  while (i < tokens.length) {
    let j = i;
    let currentLen = 0;
    const parts = [];

    while (j < tokens.length && currentLen + tokens[j].length + 1 <= chunkSize) {
      parts.push(tokens[j]);
      currentLen += tokens[j].length + 1;
      j++;
    }

    chunks.push(parts.join(" "));
    // move forward but leave overlap
    i = Math.max(j - Math.floor(chunkOverlap / Math.max(1, Math.floor(chunkSize / 10))), j - Math.floor(chunkOverlap / 2));
    // safe guard to avoid infinite loop
    if (i <= j - parts.length) i = j;
  }

  return chunks.map((t) => ({ text: t, length: t.length }));
}
