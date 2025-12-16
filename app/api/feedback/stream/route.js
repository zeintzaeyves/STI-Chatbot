import { connectDB } from "@/lib/mongodb";
import Feedback from "@models/Feedback";

export async function GET() {
  await connectDB();

  let changeStream = null;

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue("data: connected\n\n");

      // Start watching MongoDB changes
      changeStream = Feedback.watch();

      changeStream.on("change", async (change) => {
        try {
          /* ------------------- INSERT -------------------- */
          if (change.operationType === "insert") {
            const doc = change.fullDocument;

            if (doc) {
              controller.enqueue(
                `data: ${JSON.stringify({
                  type: "insert",
                  data: { ...doc, _id: doc._id.toString() },
                })}\n\n`
              );
            }
          }

          /* ------------------- UPDATE -------------------- */
          if (change.operationType === "update") {
            const updated = await Feedback.findById(change.documentKey._id).lean();

            if (updated) {
              controller.enqueue(
                `data: ${JSON.stringify({
                  type: "update",
                  data: { ...updated, _id: updated._id.toString() },
                })}\n\n`
              );
            }
          }

          /* ------------------- DELETE -------------------- */
          if (change.operationType === "delete") {
            controller.enqueue(
              `data: ${JSON.stringify({
                type: "delete",
                id: change.documentKey._id.toString(),
              })}\n\n`
            );
          }
        } catch (err) {
          console.error("Feedback SSE error:", err);
        }
      });

      changeStream.on("error", (err) => {
        console.error("Feedback stream error:", err);
        controller.close();
      });
    },

    cancel() {
      if (changeStream) {
        changeStream.close();
        console.log("Feedback stream stopped.");
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
