import progressEmitter from "../../../lib/progressEmitter";

export async function GET() {
  let controllerRef = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;

      const send = (data) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          console.log("SSE error: controller already closed");
        }
      };

      const handler = (data) => send(data);

      progressEmitter.on("progress", handler);

      // initial send
      send({ percent: 0, stage: "Waiting for upload…" });

      // cleanup when closed by browser
      controllerRef._cleanup = () => {
        progressEmitter.off("progress", handler);
      };
    },

    cancel() {
      if (controllerRef?._cleanup) controllerRef._cleanup();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
