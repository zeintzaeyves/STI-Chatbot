import mongoose from "mongoose";

const AuthorizedDeviceSchema = new mongoose.Schema({
  adminEmail: String,
  deviceToken: { type: String, unique: true },
  userAgent: String,
  lastUsed: Date,
});
// ✅ SAFE CHECK
const AuthorizedDevice =
  mongoose.models?.AuthorizedDevice ||
  mongoose.model("AuthorizedDevice", AuthorizedDeviceSchema);

export default AuthorizedDevice;
