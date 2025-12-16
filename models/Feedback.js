import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
  feedbackId: { type: String, unique: true },
  rating: { type: String, enum: ["positive", "negative"], required: true },
  comment: { type: String, default: "" },
  question: { type: String, default: "" },
  resolved: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

// 🔹 Auto-assign feedbackId (FDBID-0001 style)
FeedbackSchema.pre("save", async function (next) {
  if (!this.feedbackId) {
    const last = await mongoose.models.Feedback.findOne({}, {}, { sort: { feedbackId: -1 } });
    const nextId = last ? parseInt(last.feedbackId.split("-")[1]) + 1 : 1;
    this.feedbackId = `FDBID-${String(nextId).padStart(4, "0")}`;
  }

  // Automatically mark resolved/unresolved
  if (this.rating === "positive") this.resolved = true;
  else this.resolved = false;

  next();
});

export default mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);
