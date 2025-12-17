import mongoose from "mongoose";

const HandbookChunkSchema = new mongoose.Schema({
  handbookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Handbook",
    required: true,
  },

  type: {
    type: String,
    enum: ["campus", "global", "shs"],
    required: true,
    index: true,
  },
  scope: {
    type: String,
    enum: ["universal", "campus-dependent", "general"],
    required: true,
    index: true,
  },


  chunkIndex: {
    type: Number,
    required: true,
  },

  text: {
    type: String,
    required: true,
  },

  length: {
    type: Number,
    required: true,
  },

  sectionTitle: {
    type: String,
    required: true,
  },

  embedding: {
    type: [Number],
    index: "vector",
    dimensions: 1536,
  },

  prevSection: String,
  nextSection: String,
});

// ⚡ PERFORMANCE INDEXES
HandbookChunkSchema.index({ type: 1, scope: 1 });
HandbookChunkSchema.index({ handbookId: 1 });

export default mongoose.models.HandbookChunk ||
  mongoose.model("HandbookChunk", HandbookChunkSchema);
