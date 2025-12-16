// models/Memory.js
import mongoose from "mongoose";

const MemorySchema = new mongoose.Schema(
  {
    /* ============================
       SESSION IDENTIFIER
    ============================ */
    sessionId: {
      type: String,
      required: true,
      index: true,
      unique: true, // ✅ 1 memory doc per session
    },

    /* ============================
       STABLE / FACT MEMORY
       (not overwritten, appended only)
    ============================ */
    userName: {
      type: String,
      default: "",
    },

    longTermMemory: {
      type: String,
      default: "",
    },

    /* ============================
       SESSION CONTEXT MEMORY
    ============================ */
    lastTopic: {
      type: String,
      default: "",
    },

    conversationSummary: {
      type: String,
      default: "",
    },

    /* ============================
       AUTO CLEANUP (TTL)
    ============================ */
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 1000 * 60 * 60 * 6), // ✅ 6 hours
      index: { expires: 0 },
    },
  },
  {
    timestamps: true, // ✅ gives createdAt & updatedAt
  }
);

export default mongoose.models.Memory ||
  mongoose.model("Memory", MemorySchema);
