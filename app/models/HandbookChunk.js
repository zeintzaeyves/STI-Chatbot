import mongoose from "mongoose";

const HandbookChunkSchema = new mongoose.Schema({
  handbookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Handbook",
    required: true,
    index: true,
  },

  // 🔑 Only what we need
  source: {
    type: String,
    enum: ["campus", "global"],
    required: true,
    index: true,
  },

  text: {
    type: String,
    required: true,
  },

  embedding: {
    type: [Number],
    index: "vector",
    dimensions: 1536,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ⚡ Vector + filter index
HandbookChunkSchema.index({ source: 1 });

export default mongoose.models.HandbookChunk ||
  mongoose.model("HandbookChunk", HandbookChunkSchema);
