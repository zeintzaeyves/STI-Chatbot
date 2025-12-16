import mongoose from "mongoose";
import OpenAI from "openai";
import { knowledgeBase } from "../data/knowledgeBase.js";
import LocalKBChunk from "@models/LocalKBChunk.js";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  console.log("🔄 Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGODB_URI);

  console.log(`📚 Preparing ${knowledgeBase.length} KB entries…`);

  for (const item of knowledgeBase) {
    try {
      if (!item.id || !item.question || !item.answer) {
        console.warn(`⚠️ Skipping invalid KB entry:`, item);
        continue;
      }

      // 🟦 Include aliases in embedding text
      const aliasText = item.aliases?.length
        ? item.aliases.join(" | ")
        : "";

      // 🟦 Build the embedding input (best practice)
      const embeddingText = `
QUESTION: ${item.question}
ALIASES: ${aliasText}
ANSWER: ${item.answer}
`.trim();

      // 🟦 Generate embedding
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: embeddingText,
      });

      // 🟦 Save / upsert to DB
      await LocalKBChunk.findOneAndUpdate(
        { kbId: item.id },
        {
          kbId: item.id,
          category: item.category || "",
          question: item.question,
          aliases: item.aliases || [],
          answer: item.answer,
          embedding: emb.data[0].embedding,
        },
        { upsert: true }
      );

      console.log(`✅ Embedded: ${item.id}`);
    } catch (err) {
      console.error(`❌ Error embedding ${item.id}:`, err.message);
    }
  }

  console.log("🎉 Local KB embeddings (aliases + full context) complete!");
  process.exit();
}

main();
