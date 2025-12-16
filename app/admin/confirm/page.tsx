import { Suspense } from "react";
import ConfirmClient from "./confirmClient";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <p className="animate-pulse text-lg">Loading…</p>
      </div>
    }>
      <ConfirmClient />
    </Suspense>
  );
}
