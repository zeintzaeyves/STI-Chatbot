import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  username: String,
  passwordHash: String,
});

export default mongoose.models.Admin ||
  mongoose.model("Admin", AdminSchema);
