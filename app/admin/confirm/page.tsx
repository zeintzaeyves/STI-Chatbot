import { Suspense } from "react";
import ConfirmClient from "./confirmClient";

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center text-white">
        Authorizing device…
      </div>
    }>
      <ConfirmClient />
    </Suspense>
  );
}
