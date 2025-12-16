import cron from "node-cron";
import mongoose from "mongoose";
import Memory from "../models/Memory.js";

const SESSION_TTL_MINUTES = 30;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI);
}

// ✅ Runs every 10 minutes
cron.schedule("*/10 * * * *", async () => {
  try {
    await connectDB();

    const cutoff = new Date(
      Date.now() - SESSION_TTL_MINUTES * 60 * 1000
    );

    const result = await Memory.deleteMany({
      updatedAt: { $lt: cutoff },
    });

    console.log(
      `[CRON] Deleted ${result.deletedCount} expired sessions`
    );
  } catch (err) {
    console.error("[CRON] Cleanup error:", err);
  }
});
