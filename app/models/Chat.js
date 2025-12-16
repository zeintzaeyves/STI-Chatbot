import mongoose, { Schema, model, models } from "mongoose";

const ChatSchema = new Schema({
  userMessage: { type: String, required: true },
  aiResponse: { type: String, required: true },
  intent: { type: String, required: true },
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default models.Chat || model("Chat", ChatSchema);
