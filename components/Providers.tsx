"use client";

import { getStore } from "@/lib/store";
import type { ReactNode } from "react";
import { Provider } from "react-redux";

export function Providers({ children }: { children: ReactNode }) {
  return <Provider store={getStore()}>{children}</Provider>;
}
