"use client";

import { createContext, useContext, useMemo, useState, ReactNode, useCallback } from "react";

type UIContextValue = {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const value = useMemo(() => ({ menuOpen, openMenu, closeMenu, toggleMenu }), [menuOpen, openMenu, closeMenu, toggleMenu]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within a UIProvider");
  return ctx;
}
