import { connectDB } from "@/lib/mongodb";
import Inquiry from "@models/Inquiry.js";

export async function GET() {
  await connectDB();

  let changeStream;

  const stream = new ReadableStream({
    start(controller) {
      changeStream = Inquiry.watch();

      changeStream.on("change", (change) => {
        // INSERT — New Inquiry
        if (change.operationType === "insert" && change.fullDocument) {
          const newInquiry = change.fullDocument;

          controller.enqueue(
            `data: ${JSON.stringify(newInquiry)}\n\n`
          );
        }

        // UPDATE — Inquiry Status or fields changed
        if (change.operationType === "update") {
          // Fetch updated details (full document)
          Inquiry.findById(change.documentKey._id)
            .then((updatedInquiry) => {
              if (!updatedInquiry) return;

              controller.enqueue(
                `data: ${JSON.stringify(updatedInquiry)}\n\n`
              );
            })
            .catch(() => {});
        }
      });

      function safeClose() {
        try {
          if (changeStream && !changeStream.closed) changeStream.close();
          controller.close();
        } catch {}
      }

      controller.onCancel = safeClose;
    },

    cancel() {
      if (changeStream && !changeStream.closed) changeStream.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
