import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI; // ✔ This matches your .env.local

if (!MONGODB_URI) {
  throw new Error("⚠️ Please define MONGODB_URI inside .env.local");
}

// Global mongoose connection cache (Next.js hot reload safe)
let cached = global.mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Save cache to global object
global.mongoose = cached;
