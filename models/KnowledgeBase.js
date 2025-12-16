import mongoose from "mongoose";

const KnowledgeBaseSchema = new mongoose.Schema(
  {
    id: { type: String }, 
    category: { type: String, default: "general" },
    keywords: { type: [String], default: [] },

    question: { type: String, required: true },

    // ❌ REMOVE index:true (this was causing duplicate index)
    normalizedQuestion: { type: String },

    answer: { type: String, required: true },

    inquiryId: { type: String }, 
  },
  { timestamps: true }
);

KnowledgeBaseSchema.index({ normalizedQuestion: 1 }, { unique: true });

export default mongoose.models.KnowledgeBase ||
  mongoose.model("KnowledgeBase", KnowledgeBaseSchema);
