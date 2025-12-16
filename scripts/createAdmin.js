import "dotenv/config"; 
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "@models/Admin.js";

await mongoose.connect(process.env.MONGODB_URI);

const passwordHash = await bcrypt.hash("1234", 10);

await Admin.create({
  username: "admin",
  passwordHash,
});

console.log("Admin created");
process.exit();
