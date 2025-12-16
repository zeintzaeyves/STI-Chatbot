import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text) {
  const res = await client.embeddings.create({
    model: "text-embedding-3-large",
    input: text
  });

  return res.data[0].embedding;
}
