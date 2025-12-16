// app/models/PairingToken.js
import mongoose from "mongoose";

const PairingTokenSchema = new mongoose.Schema({
  token: String,
  used: { type: Boolean, default: false },
  confirmed: { type: Boolean, default: false },
  expiresAt: Date,
});

export default mongoose.models?.PairingToken ||
  mongoose.model("PairingToken", PairingTokenSchema);
