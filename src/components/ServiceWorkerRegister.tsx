"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV !== "development"
    ) {
      const url = "/sw.js";
  navigator.serviceWorker.register(url).then(() => undefined).catch(() => undefined);
    }
  }, []);
  return null;
}
