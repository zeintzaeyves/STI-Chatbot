export function normalizeQuestion(text = "") {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "") // remove punctuation
    .replace(/\s+/g, " ") // normalize spaces
    .trim();
}
