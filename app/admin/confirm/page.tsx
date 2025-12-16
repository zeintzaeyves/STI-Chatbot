import { Suspense } from "react";
import ConfirmClient from "./confirmClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          Loading…
        </div>
      }
    >
      <ConfirmClient />
    </Suspense>
  );
}
