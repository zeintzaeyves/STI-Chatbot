import mongoose from "mongoose";

const HandbookGlobalContextSchema = new mongoose.Schema({
  handbookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Handbook",
    required: true,
  },

  summary: {
    type: String,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.HandbookGlobalContext ||
  mongoose.model("HandbookGlobalContext", HandbookGlobalContextSchema);
