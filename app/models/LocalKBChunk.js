import mongoose from "mongoose";

const LocalKBChunkSchema = new mongoose.Schema({
  kbId: String,
  question: String,
  answer: String,
  embedding: {
    type: [Number],
    required: true,
  },
});

export default mongoose.models.LocalKBChunk ||
  mongoose.model("LocalKBChunk", LocalKBChunkSchema);
