"use client";

import {
  configureStore,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { AuthResponse } from "./session";

const KEY = "store.session";

function readStored(): AuthResponse | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

const sessionSlice = createSlice({
  name: "session",
  initialState: { value: null as AuthResponse | null },
  reducers: {
    setSession: (state, action: PayloadAction<AuthResponse>) => {
      localStorage.setItem(KEY, JSON.stringify(action.payload));
      state.value = action.payload;
    },
    clearSession: (state) => {
      localStorage.removeItem(KEY);
      state.value = null;
    },
    hydrateSession: (state, action: PayloadAction<AuthResponse>) => {
      state.value = action.payload;
    },
  },
});

export const { setSession, clearSession, hydrateSession } =
  sessionSlice.actions;

export function makeStore() {
  return configureStore({
    reducer: { session: sessionSlice.reducer },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

let store: AppStore | undefined;

/** Single store per client session, hydrated from localStorage on first access. */
export function getStore(): AppStore {
  if (!store) {
    store = makeStore();
    const stored = readStored();
    if (stored) store.dispatch(hydrateSession(stored));
  }
  return store;
}
