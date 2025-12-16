
import mongoose from "mongoose";

const HandbookSchema = new mongoose.Schema(
  {
    // 🔑 IMPORTANT: separates global vs campus
    type: {
      type: String,
      enum: ["global", "campus"],
      required: true,
      index: true,
      unique: true, // ✅ ensures ONE handbook per type
    },

    displayName: {
      type: String,
      required: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    // optional, keep if ginagamit mo
    content: String,

    chunkCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Handbook ||
  mongoose.model("Handbook", HandbookSchema);
