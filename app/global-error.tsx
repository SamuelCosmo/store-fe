"use client";

import { useEffect } from "react";
import { report } from "@/lib/log";

/** Último recurso: crash de render en cualquier pantalla. Sin providers
 *  (reemplaza al root layout) → texto fijo bilingüe y estilos inline. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    report("error", "react.crash", error.message, {
      stack: error.stack?.slice(0, 2000),
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Algo salió mal · Something went wrong</h2>
          <button type="button" onClick={() => retry()}>
            Reintentar · Retry
          </button>
        </div>
      </body>
    </html>
  );
}
