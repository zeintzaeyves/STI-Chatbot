import mongoose, { Schema } from "mongoose";

const InquirySchema = new Schema(
  {
    inquiryId: { 
      type: String, 
      required: true,
      unique: true,
      index: true
    },
    userQuery: { 
      type: String, 
      required: true 
    },
    botResponse: { 
      type: String, 
      default: "" 
    },
    status: { 
      type: String, 
      enum: ["solved", "partial", "unresolved"],
      default: "unresolved" 
    },

    // ✅ FIXED — MUST be ObjectId or update will fail
    knowledgeBaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeBase",
      default: null 
    }
  },
  { timestamps: true }
);

// Prevent exact duplicates
InquirySchema.index({ userQuery: 1, createdAt: 1 });

export default mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);
