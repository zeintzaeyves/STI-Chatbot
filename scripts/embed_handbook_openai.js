import mongoose from "mongoose";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import HandbookChunk from "@models/HandbookChunk.js";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function embedText(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return response.data[0].embedding;
  } catch (err) {
    console.error("❌ OpenAI Embedding Error:", err);
    return null;
  }
}

async function main() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB Connected!");

  const chunks = await HandbookChunk.find();
  console.log(`📄 Loaded ${chunks.length} handbook chunks.`);

  for (const chunk of chunks) {
    if (!chunk.text || chunk.text.trim().length === 0) {
      console.log(`⚠️ Skipping empty chunk: ${chunk._id}`);
      continue;
    }

    const vector = await embedText(chunk.text);

    if (!vector) {
      console.log(`❌ Failed to embed chunk ${chunk._id}`);
      continue;
    }

    chunk.embedding = vector;
    await chunk.save();

    console.log(`✅ Embedded chunk ${chunk.chunkIndex} (${chunk._id})`);
  }

  console.log("🎉 DONE! All chunks embedded.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
